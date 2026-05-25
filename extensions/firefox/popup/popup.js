(function () {

var _collections = [];

function $(id) { return document.getElementById(id); }

function show(viewId) {
  $('configError').classList.add('hidden');
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

if (!LinkHiveExt.config || !LinkHiveExt.config.token) {
  show('configError');
  status('configMsg', 'Create extensions/shared/config.js with your GitHub token.', 'error');
} else {
  show('addView');
  initAddView();
}

// ─── Add Link View ─────────────────────────────────────

function initAddView() {
  var token = LinkHiveExt.token;
  var owner = LinkHiveExt.repo.split('/')[0];
  var repo = LinkHiveExt.repo.split('/')[1];
  var branch = LinkHiveExt.branch;

  // Collect tab info
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

  // Fetch collections from GitHub
  LinkHiveExt.fetchCollections(token, owner, repo, branch).then(function (cols) {
    _collections = cols;
    var sel = $('linkCollection');
    sel.innerHTML = '<option value="">No collection</option>';
    (cols || []).forEach(function (c) {
      sel.innerHTML += '<option value="' + c.id + '">' + c.name + '</option>';
    });
  }).catch(function () {
    status('linkStatus', 'Failed to load collections', 'error');
  });

  // ─── Save click ─────────────────────────────────────

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

    LinkHiveExt.fetchLinks(token, owner, repo, branch).then(function (links) {
      if (LinkHiveExt.isDuplicate(url, links)) {
        status('linkStatus', 'Link already exists — saving anyway', '');
      }
      return LinkHiveExt.addLink(token, owner, repo, branch, link, _collections);
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
