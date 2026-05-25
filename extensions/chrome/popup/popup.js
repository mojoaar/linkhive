(function () {

var _collections = [];

function $(id) { return document.getElementById(id); }

function show(viewId) {
  $('settingsView').classList.add('hidden');
  $('addView').classList.add('hidden');
  $(viewId).classList.remove('hidden');
}

function status(elId, msg, type) {
  var s = $(elId);
  s.textContent = msg;
  s.className = 'status ' + (type || '');
}

// ─── Settings ──────────────────────────────────────────

LinkHiveExt.settings.get().then(function (cfg) {
  if (cfg.githubToken && cfg.githubRepo) {
    initAddView(cfg);
  } else {
    show('settingsView');
  }
});

$('settingsSave').addEventListener('click', function () {
  var token = $('settingsToken').value.trim();
  var repo = $('settingsRepo').value.trim();
  var branch = $('settingsBranch').value.trim() || 'main';
  if (!token || !repo) { status('settingsStatus', 'Token and repo required', 'error'); return; }
  var parts = repo.split('/');
  if (parts.length !== 2) { status('settingsStatus', 'Use owner/repo format', 'error'); return; }
  status('settingsStatus', 'Validating...', '');
  LinkHiveExt._getFile(token, parts[0], parts[1], branch, 'data/index.json').then(function () {
    return LinkHiveExt.settings.save(token, repo, branch);
  }).then(function () {
    return LinkHiveExt.settings.get();
  }).then(function (cfg) {
    show('addView');
    initAddView(cfg);
  }).catch(function () {
    status('settingsStatus', 'Cannot access repo. Check token + repo name.', 'error');
  });
});

// ─── Add Link View ─────────────────────────────────────

function initAddView(cfg) {
  var parts = cfg.githubRepo.split('/');
  var owner = parts[0], repo = parts[1], branch = cfg.githubBranch || 'main';

  // Collect tab info
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var tab = tabs[0];
    if (tab) {
      $('linkUrl').value = tab.url || '';
      $('linkTitle').value = tab.title || '';
    }
  });

  // Fetch collections from GitHub
  LinkHiveExt.fetchCollections(cfg.githubToken, owner, repo, branch).then(function (cols) {
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

    // Check duplicate
    LinkHiveExt.fetchLinks(cfg.githubToken, owner, repo, branch).then(function (links) {
      if (LinkHiveExt.isDuplicate(url, links)) {
        status('linkStatus', 'Link already exists — saving anyway', '');
      }
      return LinkHiveExt.addLink(cfg.githubToken, owner, repo, branch, link, _collections);
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

// ─── Settings button in add view ───────────────────────

$('btnSettings').addEventListener('click', function () {
  LinkHiveExt.settings.get().then(function (cfg) {
    $('settingsToken').value = cfg.githubToken || '';
    $('settingsRepo').value = cfg.githubRepo || '';
    $('settingsBranch').value = cfg.githubBranch || 'main';
    show('settingsView');
  });
});

})();
