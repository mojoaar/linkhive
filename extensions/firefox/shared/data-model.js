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

function getStorage() {
  try { if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) return browser.storage.local; } catch(e) {}
  try { if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) return chrome.storage.local; } catch(e) {}
  return null;
}

var _store = null;

LinkHiveExt.settings = {
  get: function () {
    return new Promise(function (resolve) {
      if (!_store) _store = getStorage();
      if (!_store) { resolve({}); return; }
      try {
        _store.get(['githubToken', 'githubRepo', 'githubBranch'], function (items) { resolve(items || {}); });
      } catch (e) { resolve({}); }
    });
  },
  save: function (token, repo, branch) {
    return new Promise(function (resolve) {
      if (!_store) _store = getStorage();
      if (!_store) { resolve(); return; }
      try {
        _store.set({ githubToken: token, githubRepo: repo, githubBranch: branch || 'main' }, resolve);
      } catch (e) { resolve(); }
    });
  },
  clear: function () {
    return new Promise(function (resolve) {
      if (!_store) _store = getStorage();
      if (!_store) { resolve(); return; }
      try {
        _store.remove(['githubToken', 'githubRepo', 'githubBranch'], resolve);
      } catch (e) { resolve(); }
    });
  }
};
