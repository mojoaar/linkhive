window.LinkHive = window.LinkHive || {};

LinkHive.LocalBackend = function () {
  this.db = null;
  this._memoryDb = null;
  this._useMemory = false;
  this._ready = null;
};

LinkHive.LocalBackend.prototype._openDb = function () {
  var self = this;
  if (self.db) return Promise.resolve(self.db);
  if (self._useMemory) return Promise.resolve(self._getMemoryDb());

  if (self._ready) return self._ready;

  self._ready = new Promise(function (resolve) {
    try {
      var req = indexedDB.open(LinkHive.DB.NAME, LinkHive.DB.VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
      if (!db.objectStoreNames.contains('collections')) {
        var cs = db.createObjectStore('collections', { keyPath: 'id' });
        cs.createIndex('slug', 'slug', { unique: false });
      }
        if (!db.objectStoreNames.contains('links')) {
          var ls = db.createObjectStore('links', { keyPath: 'id' });
          ls.createIndex('collectionId', 'collectionId', { unique: false });
          ls.createIndex('url', 'url', { unique: false });
          ls.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id' });
        }
      };
      req.onsuccess = function (e) { self.db = e.target.result; self._ready = null; resolve(self.db); };
      req.onerror = function () {
        console.warn('IndexedDB unavailable, using in-memory storage');
        self._useMemory = true;
        self._ready = null;
        resolve(self._getMemoryDb());
      };
    } catch (e) {
      console.warn('IndexedDB not supported, using in-memory storage');
      self._useMemory = true;
      self._ready = null;
      resolve(self._getMemoryDb());
    }
  });

  return self._ready;
};

LinkHive.LocalBackend.prototype._getMemoryDb = function () {
  if (!this._memoryDb) {
    this._memoryDb = { collections: [], links: [] };
  }
  return this._memoryDb;
};

LinkHive.LocalBackend.prototype._tx = function (storeName, mode) {
  var self = this;
  return self._openDb().then(function (db) {
    if (self._useMemory) {
      return { _memoryStore: storeName, _memoryDb: db, _backend: self };
    }
    var tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  });
};

LinkHive.LocalBackend.prototype._isMem = function (store) {
  return store && store._memoryStore;
};

LinkHive.LocalBackend.prototype.getCollections = function () {
  var self = this;
  return self._tx('collections', 'readonly').then(function (store) {
    if (self._isMem(store)) {
      var items = store._memoryDb.collections.slice();
      items.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      return items;
    }
    return new Promise(function (resolve) {
      var req = store.getAll();
      req.onsuccess = function () {
        var items = req.result || [];
        items.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
        resolve(items);
      };
      req.onerror = function () { resolve([]); };
    });
  });
};

LinkHive.LocalBackend.prototype.saveCollection = function (collection) {
  var self = this;
  return self._tx('collections', 'readwrite').then(function (store) {
    if (self._isMem(store)) {
      var idx = store._memoryDb.collections.findIndex(function (c) { return c.id === collection.id; });
      if (idx >= 0) store._memoryDb.collections[idx] = collection;
      else store._memoryDb.collections.push(collection);
      return;
    }
    return new Promise(function (resolve, reject) {
      var req = store.put(collection);
      req.onsuccess = function () { resolve(); };
      req.onerror = function () { reject(new Error('Failed to save collection')); };
    });
  });
};

LinkHive.LocalBackend.prototype.deleteCollection = function (id) {
  var self = this;
  return self._tx('collections', 'readwrite').then(function (store) {
    if (self._isMem(store)) {
      store._memoryDb.collections = store._memoryDb.collections.filter(function (c) { return c.id !== id; });
      return;
    }
    return new Promise(function (resolve) { store.delete(id); resolve(); });
  });
};

LinkHive.LocalBackend.prototype.getLinks = function (collectionId) {
  var self = this;
  return self._tx('links', 'readonly').then(function (store) {
    if (self._isMem(store)) {
      var links = collectionId
        ? store._memoryDb.links.filter(function (l) { return l.collectionId === collectionId; })
        : store._memoryDb.links.slice();
      links.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
      return links;
    }
    return new Promise(function (resolve) {
      var index = collectionId ? store.index('collectionId') : null;
      var req = index ? index.getAll(collectionId) : store.getAll();
      req.onsuccess = function () {
        var items = req.result || [];
        items.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
        resolve(items);
      };
      req.onerror = function () { resolve([]); };
    });
  });
};

LinkHive.LocalBackend.prototype.saveLink = function (link) {
  var self = this;
  return self._tx('links', 'readwrite').then(function (store) {
    if (self._isMem(store)) {
      var idx = store._memoryDb.links.findIndex(function (l) { return l.id === link.id; });
      if (idx >= 0) store._memoryDb.links[idx] = link;
      else store._memoryDb.links.push(link);
      return;
    }
    return new Promise(function (resolve, reject) {
      var req = store.put(link);
      req.onsuccess = function () { resolve(); };
      req.onerror = function () { reject(new Error('Failed to save link')); };
    });
  });
};

LinkHive.LocalBackend.prototype.deleteLink = function (id) {
  var self = this;
  return self._tx('links', 'readwrite').then(function (store) {
    if (self._isMem(store)) {
      store._memoryDb.links = store._memoryDb.links.filter(function (l) { return l.id !== id; });
      return;
    }
    return new Promise(function (resolve) { store.delete(id); resolve(); });
  });
};

LinkHive.LocalBackend.prototype.deleteLinksByCollection = function (collectionId) {
  var self = this;
  return self._tx('links', 'readwrite').then(function (store) {
    if (self._isMem(store)) {
      store._memoryDb.links = store._memoryDb.links.filter(function (l) { return l.collectionId !== collectionId; });
      return;
    }
    return new Promise(function (resolve) {
      var req = store.index('collectionId').openCursor(IDBKeyRange.only(collectionId));
      req.onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) { cursor.delete(); cursor.continue(); }
        else { resolve(); }
      };
      req.onerror = function () { resolve(); };
    });
  });
};

LinkHive.LocalBackend.prototype.deleteAll = function () {
  var self = this;
  return self._tx('collections', 'readwrite').then(function (cStore) {
    return self._tx('links', 'readwrite').then(function (lStore) {
      if (self._isMem(cStore)) {
        cStore._memoryDb.collections = [];
        lStore._memoryDb.links = [];
        return;
      }
      return Promise.all([
        new Promise(function (resolve) { cStore.clear().onsuccess = resolve; }),
        new Promise(function (resolve) { lStore.clear().onsuccess = resolve; })
      ]);
    });
  });
};

LinkHive.LocalBackend.prototype.exportData = function () {
  var self = this;
  return Promise.all([self.getCollections(), self.getLinks()]).then(function (results) {
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      collections: results[0],
      links: results[1]
    }, null, 2);
  });
};

LinkHive.LocalBackend.prototype.importData = function (jsonStr) {
  var self = this;
  var data;
  try { data = JSON.parse(jsonStr); } catch (e) { return Promise.reject(new Error('Invalid JSON')); }
  if (!data.collections || !data.links) return Promise.reject(new Error('Invalid data format'));
  return self._tx('collections', 'readwrite').then(function (cStore) {
    return self._tx('links', 'readwrite').then(function (lStore) {
      if (self._isMem(cStore)) {
        cStore._memoryDb.collections = data.collections;
        lStore._memoryDb.links = data.links;
        return;
      }
      return Promise.all([
        new Promise(function (resolve) { cStore.clear().onsuccess = resolve; }),
        new Promise(function (resolve) { lStore.clear().onsuccess = resolve; })
      ]).then(function () {
        return Promise.all(
          data.collections.map(function (c) {
            return new Promise(function (resolve) { cStore.put(c).onsuccess = resolve; });
          }).concat(data.links.map(function (l) {
            return new Promise(function (resolve) { lStore.put(l).onsuccess = resolve; });
          }))
        );
      });
    });
  });
};

LinkHive.LocalBackend.prototype.saveLinks = function (links) {
  var self = this;
  return self._tx('links', 'readwrite').then(function (store) {
    if (self._isMem(store)) {
      links.forEach(function (link) {
        var idx = store._memoryDb.links.findIndex(function (l) { return l.id === link.id; });
        if (idx >= 0) store._memoryDb.links[idx] = link;
        else store._memoryDb.links.push(link);
      });
      return;
    }
    return Promise.all(links.map(function (link) {
      return new Promise(function (resolve, reject) {
        var req = store.put(link);
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { reject(new Error('Failed to save link')); };
      });
    }));
  });
};

LinkHive.GitHubBackend = function (client, userId) {
  this.client = client;
  this.userId = userId;
  this._basePath = 'profiles/' + userId;
  this._shas = {};
};

LinkHive.GitHubBackend.prototype.getCollections = function () {
  var self = this;
  return self.client.getFile(self._basePath + '/collections.json').then(function (data) {
    if (!data || !data.content) return [];
    self._shas['collections'] = data.sha;
    return data.content;
  }).catch(function () { return []; });
};

LinkHive.GitHubBackend.prototype.saveCollection = function (collection) {
  return Promise.reject(new Error('Use saveCollections() for batch operations with GitHub'));
};

LinkHive.GitHubBackend.prototype.deleteCollection = function (id) {
  return Promise.reject(new Error('Use saveCollections() for batch operations with GitHub'));
};

LinkHive.GitHubBackend.prototype.getLinks = function (collectionSlug) {
  var self = this;
  return self.client.getFile(self._basePath + '/' + collectionSlug + '/links.json').then(function (data) {
    if (!data || !data.content) return [];
    self._shas['links_' + collectionSlug] = data.sha;
    return data.content;
  }).catch(function () { return []; });
};

LinkHive.GitHubBackend.prototype.saveLink = function (link) {
  return Promise.reject(new Error('Use saveLinks() for batch operations with GitHub'));
};

LinkHive.GitHubBackend.prototype.saveLinks = function (collectionSlug, links) {
  var self = this;
  var sha = self._shas['links_' + collectionSlug] || undefined;
  return self.client.putFile(self._basePath + '/' + collectionSlug + '/links.json', links, sha).then(function (resp) {
    self._shas['links_' + collectionSlug] = resp.content.sha;
  });
};

LinkHive.GitHubBackend.prototype.deleteLink = function (id) {
  return Promise.reject(new Error('Use saveLinks() for batch operations with GitHub'));
};

LinkHive.GitHubBackend.prototype.deleteLinksByCollection = function (collectionId) {
  return Promise.resolve();
};

LinkHive.GitHubBackend.prototype.deleteAll = function () {
  return Promise.resolve();
};

LinkHive.GitHubBackend.prototype.exportData = function () {
  return Promise.resolve('{}');
};

LinkHive.GitHubBackend.prototype.importData = function () {
  return Promise.resolve();
};
