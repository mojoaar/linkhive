var LinkHiveExt = LinkHiveExt || {};

LinkHiveExt.makeLink = function (url, title, description, collectionId, collectionSlug, tags) {
  return {
    id: 'lh_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9),
    url: url,
    title: title || '',
    description: description || '',
    collectionId: collectionId || '',
    collectionSlug: collectionSlug || '',
    tags: tags || [],
    favicon: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isRead: false,
    order: 0
  };
};

LinkHiveExt.isDuplicate = function (url, links) {
  var u = url.replace(/\/$/, '').toLowerCase();
  return links.some(function (l) { return l.url && l.url.replace(/\/$/, '').toLowerCase() === u; });
};

LinkHiveExt.collectionIdMap = function (collections) {
  var map = {};
  (collections || []).forEach(function (c) { map[c.id] = c; });
  return map;
};

LinkHiveExt.settings = {
  get: function () {
    return new Promise(function (resolve) {
      try {
        var data = JSON.parse(localStorage.getItem('linkhive_ext_settings') || '{}');
        resolve(data);
      } catch (e) { resolve({}); }
    });
  },
  save: function (token, repo, branch) {
    return new Promise(function (resolve) {
      try {
        localStorage.setItem('linkhive_ext_settings', JSON.stringify({
          githubToken: token, githubRepo: repo, githubBranch: branch || 'main'
        }));
      } catch (e) {}
      resolve();
    });
  },
  clear: function () {
    return new Promise(function (resolve) {
      try { localStorage.removeItem('linkhive_ext_settings'); } catch (e) {}
      resolve();
    });
  }
};
var LinkHiveExt = LinkHiveExt || {};

LinkHiveExt.GITHUB_API = 'https://api.github.com';

LinkHiveExt.fetchCollections = function (token, owner, repo, branch) {
  return LinkHiveExt._getFile(token, owner, repo, branch, 'data/collections.json').then(function (data) {
    return data ? data.content : [];
  });
};

LinkHiveExt.fetchLinks = function (token, owner, repo, branch) {
  return LinkHiveExt._getFile(token, owner, repo, branch, 'data/index.json').then(function (index) {
    if (!index || !index.content || !index.content.chunks) return [];
    var promises = [];
    for (var i = 0; i < index.content.chunks; i++) {
      promises.push(LinkHiveExt._getFile(token, owner, repo, branch, 'data/links-' + i + '.json'));
    }
    return Promise.all(promises).then(function (chunks) {
      var links = [];
      chunks.forEach(function (c) { if (c) links = links.concat(c.content); });
      return links;
    });
  }).catch(function () { return []; });
};

LinkHiveExt.addLink = function (token, owner, repo, branch, link, collections) {
  return LinkHiveExt._getFile(token, owner, repo, branch, 'data/index.json').catch(function () {
    return null;
  }).then(function (index) {
    var chunks = index && index.content ? index.content.chunks : 0;
    var total = index && index.content ? index.content.total : 0;
    var indexSha = index ? index.sha : undefined;
    var chunkIdx = Math.floor(total / 250);
    if (chunkIdx >= chunks) {
      return LinkHiveExt._putFile(token, owner, repo, branch, 'data/links-' + chunkIdx + '.json', [link], undefined).then(function () {
        var newIndex = { chunks: chunks + 1, total: total + 1, exportedAt: new Date().toISOString() };
        return LinkHiveExt._putFile(token, owner, repo, branch, 'data/index.json', newIndex, indexSha);
      });
    } else {
      return LinkHiveExt._getFile(token, owner, repo, branch, 'data/links-' + chunkIdx + '.json').then(function (existing) {
        var links = existing && existing.content ? existing.content : [];
        links.push(link);
        return LinkHiveExt._putFile(token, owner, repo, branch, 'data/links-' + chunkIdx + '.json', links, existing ? existing.sha : undefined).then(function () {
          var newIndex = { chunks: chunks, total: total + 1, exportedAt: new Date().toISOString() };
          return LinkHiveExt._putFile(token, owner, repo, branch, 'data/index.json', newIndex, indexSha);
        });
      });
    }
  });
};

LinkHiveExt._apiUrl = function (owner, repo, path) {
  return LinkHiveExt.GITHUB_API + '/repos/' + owner + '/' + repo + '/contents/' + path;
};

LinkHiveExt._getFile = function (token, owner, repo, branch, path) {
  return fetch(LinkHiveExt._apiUrl(owner, repo, path) + '?ref=' + branch, {
    headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json' }
  }).then(function (res) {
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('GitHub API error: ' + res.status);
    return res.json();
  }).then(function (data) {
    if (!data) return null;
    return { path: data.path, sha: data.sha, content: JSON.parse(atob(data.content.replace(/\s/g, ''))) };
  });
};

LinkHiveExt._putFile = function (token, owner, repo, branch, path, content, sha) {
  var jsonStr = JSON.stringify(content);
  var bytes = [];
  for (var i = 0; i < jsonStr.length; i++) {
    var c = jsonStr.charCodeAt(i);
    if (c < 128) { bytes.push(c); }
    else if (c < 2048) { bytes.push(192 | (c >> 6)); bytes.push(128 | (c & 63)); }
    else { bytes.push(224 | (c >> 12)); bytes.push(128 | ((c >> 6) & 63)); bytes.push(128 | (c & 63)); }
  }
  var binary = '';
  var chunk = 8192;
  for (var j = 0; j < bytes.length; j += chunk) {
    binary += String.fromCharCode.apply(null, bytes.slice(j, j + chunk));
  }
  var body = { message: 'Update ' + path, content: btoa(binary), branch: branch };
  if (sha) body.sha = sha;
  return fetch(LinkHiveExt._apiUrl(owner, repo, path), {
    method: 'PUT', headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(function (res) {
    if (!res.ok) throw new Error('GitHub API error: ' + res.status);
    return res.json();
  });
};
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
