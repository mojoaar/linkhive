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

chrome.storage.sync.get(['githubToken', 'githubRepo', 'githubBranch'], function (items) {
  if (items.githubToken && items.githubRepo) {
    _token = items.githubToken;
    _repo = items.githubRepo;
    _owner = _repo.split('/')[0];
    _branch = items.githubBranch || 'main';
    $('debugRepoText').textContent = _repo + ' (' + _branch + ')';
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
    $('debugRepoText').textContent = _repo + ' (' + _branch + ')';
    status('setupStatus', 'Connected!', 'success');
    show('addView');
    initAddView();
  }).catch(function () {
    status('setupStatus', 'Cannot access repo. Check token + repo name.', 'error');
  });
});

// ─── Add Link View ─────────────────────────────────────

function initAddView() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var tab = tabs && tabs[0];
    if (tab) {
      $('linkUrl').value = tab.url || '';
      $('linkTitle').value = tab.title || '';
    }
  });

  var userUrl = 'https://api.github.com/user';
  var repoUrl = 'https://api.github.com/repos/' + _owner + '/' + _repo;
  $('debugInfo').textContent = 'Testing Bearer token...';

  function xhrGet(url, label, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + _token);
    xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
    xhr.onload = function () {
      var d = JSON.parse(xhr.responseText || '{}');
      $('debugInfo').textContent = label + ' ' + xhr.status + ': ' + (d.login || d.full_name || d.name || d.message || '?');
      if (cb) cb(xhr.status, d);
    };
    xhr.onerror = function () { $('debugInfo').textContent = label + ' error'; };
    xhr.send();
  }

  xhrGet(userUrl, '/user', function (userStatus, userData) {
    if (userStatus === 200) {
      $('debugInfo').textContent = 'Token OK (' + (userData.login || '?') + '). Checking repo...';
      xhrGet(repoUrl, 'repo');
    } else {
      $('debugInfo').textContent = '/user returned ' + userStatus + ' — trying token prefix...';
      // Also try with 'token' prefix
      var xhr2 = new XMLHttpRequest();
      xhr2.open('GET', userUrl, true);
      xhr2.setRequestHeader('Authorization', 'token ' + _token);
      xhr2.setRequestHeader('Accept', 'application/vnd.github.v3+json');
      xhr2.onload = function () {
        var d2 = JSON.parse(xhr2.responseText || '{}');
        $('debugInfo').textContent = 'token prefix /user ' + xhr2.status + ': ' + (d2.login || d2.message || '?');
      };
      xhr2.onerror = function () { $('debugInfo').textContent = 'token prefix error'; };
      xhr2.send();
    }
  });

  LinkHiveExt.fetchCollections(_token, _owner, _repo, _branch).then(function (cols) {
    $('debugInfo').textContent = ($('debugInfo').textContent || '') + ' | parsed: ' + (cols ? cols.length : 0);
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
    $('debugInfo').textContent = 'Error: ' + (e.message || 'unknown');
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

    LinkHiveExt.fetchLinks(_token, _owner, _repo, _branch).then(function (links) {
      if (LinkHiveExt.isDuplicate(url, links)) {
        status('linkStatus', 'Link already exists — saving anyway', '');
      }
      return LinkHiveExt.addLink(_token, _owner, _repo, _branch, link, _collections);
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

})();
