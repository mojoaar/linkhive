var LinkHiveExt = LinkHiveExt || {};

var extStorage = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync)
  ? chrome.storage.sync
  : (typeof browser !== 'undefined' && browser.storage && browser.storage.sync)
    ? browser.storage.sync
    : null;

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
      extStorage.get(['githubToken', 'githubRepo', 'githubBranch'], function (items) {
        resolve(items);
      });
    });
  },
  save: function (token, repo, branch) {
    return new Promise(function (resolve) {
      extStorage.set({ githubToken: token, githubRepo: repo, githubBranch: branch || 'main' }, resolve);
    });
  },
  clear: function () {
    return new Promise(function (resolve) {
      extStorage.remove(['githubToken', 'githubRepo', 'githubBranch'], resolve);
    });
  }
};
