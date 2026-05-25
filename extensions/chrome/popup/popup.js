(function () {

var _collections = [];
var _token = '';
var _repo = '';
var _owner = '';
var _branch = 'main';

function $(id) { return document.getElementById(id); }

function show(viewId) {
  $('setupView').classList.add('hidden');
  $('addView').classList.add('hidden');
  $(viewId).classList.remove('hidden');
}

function status(elId, msg, type) {
  var s = $(elId);
  if (!s) return;
  s.textContent = msg;
  s.className = 'status ' + (type || '');
}

// ─── Init ──────────────────────────────────────────────

var darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
chrome.runtime.sendMessage({
  setIcon: darkMode
    ? { 16: 'icons/icon-16-dark.png', 48: 'icons/icon-48-dark.png', 128: 'icons/icon-128-dark.png' }
    : { 16: 'icons/icon-16.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' }
});

chrome.storage.sync.get(['githubToken', 'githubRepo', 'githubBranch'], function (items) {
  if (items.githubToken && items.githubRepo) {
    _token = items.githubToken;
    _repo = items.githubRepo;
    _owner = _repo.split('/')[0];
    _branch = items.githubBranch || 'main';
    show('addView');
    initAddView();
  } else {
    show('setupView');
  }
});

// ─── Setup ─────────────────────────────────────────────

$('setupSave').addEventListener('click', function () {
  var token = $('setupToken').value.trim();
  var repo = $('setupRepo').value.trim();
  var branch = $('setupBranch').value.trim() || 'main';
  if (!token || !repo) { status('setupStatus', 'Token and repo required', 'error'); return; }
  var parts = repo.split('/');
  if (parts.length !== 2) { status('setupStatus', 'Use owner/repo format', 'error'); return; }
  status('setupStatus', 'Validating...', '');
  LinkHiveExt._getFile(token, parts[0], parts[1], branch, 'data/index.json').then(function (data) {
    if (!data) throw new Error('Repo empty or not found');
    return new Promise(function (resolve) {
      chrome.storage.sync.set({ githubToken: token, githubRepo: repo, githubBranch: branch }, resolve);
    });
  }).then(function () {
    _token = token;
    _repo = repo;
    _owner = parts[0];
    _branch = branch;
    status('setupStatus', 'Connected!', 'success');
    show('addView');
    initAddView();
  }).catch(function () {
    status('setupStatus', 'Cannot access repo. Check token + repo name.', 'error');
  });
});

// ─── Add Link View ─────────────────────────────────────

function initAddView() {
  var _repoName = _repo.split('/')[1];

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var tab = tabs && tabs[0];
    if (tab) {
      $('linkUrl').value = tab.url || '';
      $('linkTitle').value = tab.title || '';
    }
  });

  LinkHiveExt.fetchCollections(_token, _owner, _repoName, _branch).then(function (cols) {
    _collections = cols;
    var sel = $('linkCollection');
    sel.innerHTML = '<option value="">No collection</option>';
    (cols || []).forEach(function (c) {
      sel.innerHTML += '<option value="' + c.id + '">' + c.name + '</option>';
    });
    if (!cols || cols.length === 0) {
      $('collHint').classList.remove('hidden');
    }
  }).catch(function (e) {
    status('linkStatus', 'Failed to load collections', 'error');
  });

  $('linkSave').onclick = function () {
    var btn = $('linkSave');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    status('linkStatus', '', '');

    var url = $('linkUrl').value.trim();
    if (!url) { status('linkStatus', 'URL is required', 'error'); btn.disabled = false; btn.textContent = 'Save Link'; return; }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    var title = $('linkTitle').value.trim();
    var desc = $('linkDesc').value.trim();
    var collectionId = $('linkCollection').value;
    var tags = $('linkTags').value.split(',').map(function (t) { return t.trim(); }).filter(Boolean);

    var collection = _collections.find(function (c) { return c.id === collectionId; });
    var link = LinkHiveExt.makeLink(url, title, desc, collectionId, collection ? collection.slug : '', tags);

    LinkHiveExt.fetchLinks(_token, _owner, _repoName, _branch).then(function (links) {
      if (LinkHiveExt.isDuplicate(url, links)) {
        status('linkStatus', 'Link already exists — saving anyway', '');
      }
      return LinkHiveExt.addLink(_token, _owner, _repoName, _branch, link, _collections);
    }).then(function () {
      status('linkStatus', 'Saved!', 'success');
      btn.textContent = 'Saved ✓';
      setTimeout(function () { window.close(); }, 800);
    }).catch(function (err) {
      status('linkStatus', 'Failed: ' + (err.message || 'unknown'), 'error');
      btn.disabled = false;
      btn.textContent = 'Save Link';
    });
  };
}

$('btnSettings').addEventListener('click', function () {
  $('setupToken').value = _token;
  $('setupRepo').value = _repo;
  $('setupBranch').value = _branch;
  $('setupStatus').textContent = '';
  show('setupView');
});

})();
