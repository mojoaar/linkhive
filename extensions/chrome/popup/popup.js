(function () {

var _collections = [];

function $(id) { return document.getElementById(id); }

function show(viewId) {
  console.log('show:', viewId);
  $('settingsView').classList.add('hidden');
  $('addView').classList.add('hidden');
  $(viewId).classList.remove('hidden');
}

function status(elId, msg, type) {
  console.log('status:', elId, msg, type);
  var s = $(elId);
  if (!s) { console.error('Element not found:', elId); return; }
  s.textContent = msg;
  s.className = 'status ' + (type || '');
}

console.log('popup.js loaded');

// ─── Settings ──────────────────────────────────────────

console.log('Checking storage...');
LinkHiveExt.settings.get().then(function (cfg) {
  console.log('Storage result:', cfg);
  if (cfg.githubToken && cfg.githubRepo) {
    initAddView(cfg);
  } else {
    show('settingsView');
  }
}).catch(function (e) {
  console.error('Storage error:', e);
  show('settingsView');
});

console.log('Attaching settings save listener...');
var saveBtn = $('settingsSave');
console.log('Save button:', saveBtn);
if (saveBtn) {
  saveBtn.addEventListener('click', function () {
    console.log('Save clicked');
    var token = $('settingsToken').value.trim();
    var repo = $('settingsRepo').value.trim();
    var branch = $('settingsBranch').value.trim() || 'main';
    console.log('Token:', token ? '***' + token.slice(-4) : 'empty', 'Repo:', repo);
    if (!token || !repo) { status('settingsStatus', 'Token and repo required', 'error'); return; }
    var parts = repo.split('/');
    if (parts.length !== 2) { status('settingsStatus', 'Use owner/repo format', 'error'); return; }
    status('settingsStatus', 'Validating...', '');
    LinkHiveExt._getFile(token, parts[0], parts[1], branch, 'data/index.json').then(function () {
      console.log('GitHub validation OK, saving settings');
      return LinkHiveExt.settings.save(token, repo, branch);
    }).then(function () {
      console.log('Settings saved');
      return LinkHiveExt.settings.get();
    }).then(function (cfg) {
      console.log('Settings re-loaded, showing add view');
      show('addView');
      initAddView(cfg);
    }).catch(function (e) {
      console.error('Validation failed:', e);
      status('settingsStatus', 'Cannot access repo. Check token + repo name.', 'error');
    });
  });
} else {
  console.error('Save button not found!');
}

// ─── Add Link View ─────────────────────────────────────

function initAddView(cfg) {
  var parts = cfg.githubRepo.split('/');
  var owner = parts[0], repo = parts[1], branch = cfg.githubBranch || 'main';

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
  } catch(e) {
    console.warn('Could not get active tab:', e);
  }

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
