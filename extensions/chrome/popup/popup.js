(function () {

var _collections = [];
var _token = '';
var _owner = LinkHiveExt.REPO.split('/')[0];
var _repo = LinkHiveExt.REPO.split('/')[1];
var _branch = LinkHiveExt.BRANCH;

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

$('setupRepo').textContent = LinkHiveExt.REPO;

LinkHiveExt.fetchConfig(_owner, _repo, _branch).then(function (config) {
  if (config && config.token) {
    _token = config.token;
    show('addView');
    initAddView();
  } else {
    show('setupView');
  }
}).catch(function () {
  show('setupView');
});

// ─── Setup ─────────────────────────────────────────────

$('setupSave').addEventListener('click', function () {
  var token = $('setupToken').value.trim();
  if (!token) { status('setupStatus', 'Token is required', 'error'); return; }
  status('setupStatus', 'Validating...', '');
  LinkHiveExt._getFile(token, _owner, _repo, _branch, 'data/index.json').then(function () {
    return LinkHiveExt.saveConfig(token, _owner, _repo, _branch, { token: token, repo: LinkHiveExt.REPO, branch: _branch });
  }).then(function () {
    _token = token;
    status('setupStatus', 'Connected!', 'success');
    show('addView');
    initAddView();
  }).catch(function (e) {
    status('setupStatus', 'Cannot access repo. Check token.', 'error');
  });
});

// ─── Add Link View ─────────────────────────────────────

function initAddView() {
  try {
    var tabsApi = chrome && chrome.tabs ? chrome.tabs : (browser && browser.tabs ? browser.tabs : null);
    if (tabsApi) {
      tabsApi.query({ active: true, currentWindow: true }, function (tabs) {
        var tab = tabs && tabs[0];
        if (tab) {
          $('linkUrl').value = tab.url || '';
          $('linkTitle').value = tab.title || '';
        }
      });
    }
  } catch(e) {}

  LinkHiveExt.fetchCollections(_token, _owner, _repo, _branch).then(function (cols) {
    _collections = cols;
    var sel = $('linkCollection');
    sel.innerHTML = '<option value="">No collection</option>';
    (cols || []).forEach(function (c) {
      sel.innerHTML += '<option value="' + c.id + '">' + c.name + '</option>';
    });
  }).catch(function () {
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
