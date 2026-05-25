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
