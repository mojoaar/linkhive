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

function getStore() {
  try { if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) return browser.storage.local; } catch(e) {}
  try { if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) return chrome.storage.local; } catch(e) {}
  return null;
}

function storeCall(method, arg) {
  return new Promise(function (resolve) {
    var store = getStore();
    if (!store) { resolve(method === 'get' ? {} : undefined); return; }
    try {
      var result = store[method](arg);
      if (result && typeof result.then === 'function') {
        result.then(function (v) { resolve(v || {}); }, function () { resolve(method === 'get' ? {} : undefined); });
      } else if (method === 'get') {
        store.get(arg, function (items) { resolve(items || {}); });
      } else {
        store[method](arg, function () { resolve(); });
      }
    } catch (e) { resolve(method === 'get' ? {} : undefined); }
  });
}

LinkHiveExt.settings = {
  get: function () { return storeCall('get', ['githubToken', 'githubRepo', 'githubBranch']); },
  save: function (token, repo, branch) {
    return storeCall('set', { githubToken: token, githubRepo: repo, githubBranch: branch || 'main' });
  },
  clear: function () { return storeCall('remove', ['githubToken', 'githubRepo', 'githubBranch']); }
};
