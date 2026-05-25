window.LinkHive = window.LinkHive || {};

LinkHive.LinkStore = (function () {

  var _collections = [];
  var _links = [];
  var _backend = null;
  var _linkCounts = {};
  var _countsBuilt = false;

  function _rebuildCounts() {
    _linkCounts = {};
    _links.forEach(function (l) {
      var cid = l.collectionId || '__none__';
      _linkCounts[cid] = (_linkCounts[cid] || 0) + 1;
    });
    _linkCounts.__total__ = _links.length;
    _countsBuilt = true;
  }

  function getLinkCount(collectionId) {
    if (!_countsBuilt) _rebuildCounts();
    return _linkCounts[collectionId || '__none__'] || 0;
  }

  function getTotalLinkCount() {
    if (!_countsBuilt) _rebuildCounts();
    return _linkCounts.__total__ || 0;
  }

  function init(backend) {
    _backend = backend;
    return loadAll();
  }

  function loadAll() {
    if (!_backend) return Promise.resolve();
    return _backend.getCollections().then(function (cols) {
      _collections = cols || [];
      _collections.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
      return _backend.getLinks().then(function (links) {
        _links = links || [];
        _rebuildCounts();
        return { collections: _collections, links: _links };
      }).catch(function () {
        _links = [];
        _rebuildCounts();
        return { collections: _collections, links: [] };
      });
    }).catch(function (err) {
      console.warn('LinkStore: storage load failed, starting fresh:', err);
      _collections = [];
      _links = [];
      _rebuildCounts();
      return { collections: [], links: [] };
    });
  }

  function getCollections() {
    return _collections.slice();
  }

  function getCollection(id) {
    return _collections.find(function (c) { return c.id === id; }) || null;
  }

  function getCollectionBySlug(slug) {
    return _collections.find(function (c) { return c.slug === slug; }) || null;
  }

  function addCollection(name, icon, color) {
    var slug = LinkHive.slugify(name);
    var existing = _collections.find(function (c) { return c.slug === slug; });
    if (existing) slug = slug + '-' + Date.now().toString(36);

    var collection = {
      id: LinkHive.generateId(),
      name: name,
      slug: slug,
      icon: icon || 'bookmark',
      color: color || LinkHive.COLLECTION_COLORS[0],
      order: _collections.length,
      createdAt: new Date().toISOString()
    };
    _collections.push(collection);
    _collections.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
    return _backend.saveCollection(collection).then(function () {
      return collection;
    });
  }

  function updateCollection(id, updates) {
    var idx = _collections.findIndex(function (c) { return c.id === id; });
    if (idx === -1) return Promise.reject(new Error('Collection not found'));
    var oldSlug = _collections[idx].slug;
    if (updates.name && updates.name !== _collections[idx].name) {
      updates.slug = LinkHive.slugify(updates.name);
    }
    Object.assign(_collections[idx], updates);
    _collections.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });

    if (updates.slug && updates.slug !== oldSlug) {
      var links = _links.filter(function (l) { return l.collectionSlug === oldSlug; });
      links.forEach(function (l) { l.collectionSlug = updates.slug; });
    }

    return _backend.saveCollection(_collections[idx]).then(function () {
      return _collections[idx];
    });
  }

  function deleteCollection(id) {
    var idx = _collections.findIndex(function (c) { return c.id === id; });
    if (idx === -1) return Promise.reject(new Error('Collection not found'));
    _links = _links.filter(function (l) { return l.collectionId !== id; });
    _collections.splice(idx, 1);
    _rebuildCounts();
    return Promise.all([
      _backend.deleteCollection(id),
      _backend.deleteLinksByCollection ? _backend.deleteLinksByCollection(id) : Promise.resolve()
    ]);
  }

  function getLinks(collectionId) {
    if (collectionId) {
      return _links.filter(function (l) { return l.collectionId === collectionId; });
    }
    return _links.slice();
  }

  function getLinkById(id) {
    return _links.find(function (l) { return l.id === id; }) || null;
  }

  function addLink(url, title, description, collectionId, tags, favicon) {
    var collection = _collections.find(function (c) { return c.id === collectionId; });
    var link = {
      id: LinkHive.generateId(),
      url: url,
      title: title || LinkHive.truncateUrl(url, 60),
      description: description || '',
      collectionId: collectionId || '',
      collectionSlug: collection ? collection.slug : '',
      tags: tags || [],
      favicon: favicon || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isRead: false,
      order: _links.length
    };
    _links.push(link);
    var cid = collectionId || '__none__';
    _linkCounts[cid] = (_linkCounts[cid] || 0) + 1;
    _linkCounts.__total__ = (_linkCounts.__total__ || 0) + 1;
    return _backend.saveLink(link).then(function () {
      return link;
    });
  }

  function updateLink(id, updates) {
    var idx = _links.findIndex(function (l) { return l.id === id; });
    if (idx === -1) return Promise.reject(new Error('Link not found'));
    if (updates.collectionId) {
      var oldCid = _links[idx].collectionId || '__none__';
      var newCid = updates.collectionId || '__none__';
      if (oldCid !== newCid) {
        _linkCounts[oldCid] = Math.max(0, (_linkCounts[oldCid] || 1) - 1);
        _linkCounts[newCid] = (_linkCounts[newCid] || 0) + 1;
      }
      var collection = _collections.find(function (c) { return c.id === updates.collectionId; });
      if (collection) updates.collectionSlug = collection.slug;
    }
    updates.updatedAt = new Date().toISOString();
    Object.assign(_links[idx], updates);
    return _backend.saveLink(_links[idx]).then(function () {
      return _links[idx];
    });
  }

  function deleteLink(id) {
    var link = _links.find(function (l) { return l.id === id; });
    _links = _links.filter(function (l) { return l.id !== id; });
    if (link) {
      var cid = link.collectionId || '__none__';
      _linkCounts[cid] = Math.max(0, (_linkCounts[cid] || 1) - 1);
      _linkCounts.__total__ = Math.max(0, (_linkCounts.__total__ || 1) - 1);
    }
    return _backend.deleteLink(id);
  }

  function search(query, collectionId) {
    if (!query) {
      return collectionId ? getLinks(collectionId) : _links.slice();
    }
    var q = query.toLowerCase();
    var source = collectionId ? getLinks(collectionId) : _links.slice();
    return source.filter(function (link) {
      return (link.title && link.title.toLowerCase().indexOf(q) !== -1) ||
             (link.description && link.description.toLowerCase().indexOf(q) !== -1) ||
             (link.url && link.url.toLowerCase().indexOf(q) !== -1) ||
             (link.tags && link.tags.some(function (t) { return t.toLowerCase().indexOf(q) !== -1; }));
    });
  }

  function getLinksByTag(tag, collectionId) {
    var source = collectionId ? getLinks(collectionId) : _links.slice();
    return source.filter(function (link) {
      return link.tags && link.tags.some(function (t) { return t.toLowerCase() === tag.toLowerCase(); });
    });
  }

  function getAllTags(collectionId) {
    var source = collectionId ? getLinks(collectionId) : _links.slice();
    var tagMap = {};
    source.forEach(function (link) {
      if (!link.tags) return;
      link.tags.forEach(function (tag) {
        var key = tag.toLowerCase();
        tagMap[key] = (tagMap[key] || 0) + 1;
      });
    });
    var tags = Object.keys(tagMap).map(function (tag) {
      return { name: tag, count: tagMap[tag] };
    });
    tags.sort(function (a, b) { return b.count - a.count; });
    return tags;
  }

  function sortLinks(links, sortBy) {
    var sorted = links.slice();
    switch (sortBy) {
      case 'oldest':
        sorted.sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
        break;
      case 'title':
        sorted.sort(function (a, b) { return (a.title || '').localeCompare(b.title || ''); });
        break;
      case 'newest':
      default:
        sorted.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
        break;
    }
    return sorted;
  }

  function exportData() {
    if (_backend && _backend.exportData) {
      return _backend.exportData();
    }
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      collections: _collections,
      links: _links
    }, null, 2);
  }

  function importData(jsonStr) {
    if (_backend && _backend.importData) {
      return _backend.importData(jsonStr).then(function () {
        return loadAll();
      });
    }
    var data = JSON.parse(jsonStr);
    _collections = data.collections || [];
    _links = data.links || [];
    return Promise.all([
      Promise.all(_collections.map(function (c) { return _backend.saveCollection(c); })),
      Promise.all(_links.map(function (l) { return _backend.saveLink(l); }))
    ]).then(function () { _rebuildCounts(); return loadAll(); });
  }

  function deleteAll() {
    _collections = [];
    _links = [];
    _linkCounts = {};
    _countsBuilt = false;
    if (_backend && _backend.deleteAll) {
      return _backend.deleteAll();
    }
    return Promise.resolve();
  }

  return {
    init: init,
    loadAll: loadAll,

    getCollections: getCollections,
    getCollection: getCollection,
    getCollectionBySlug: getCollectionBySlug,
    addCollection: addCollection,
    updateCollection: updateCollection,
    deleteCollection: deleteCollection,

    getLinks: getLinks,
    getLinkById: getLinkById,
    getLinkCount: getLinkCount,
    getTotalLinkCount: getTotalLinkCount,
    addLink: addLink,
    updateLink: updateLink,
    deleteLink: deleteLink,

    search: search,
    getLinksByTag: getLinksByTag,
    getAllTags: getAllTags,
    sortLinks: sortLinks,

    exportData: exportData,
    importData: importData,
    deleteAll: deleteAll
  };

})();
