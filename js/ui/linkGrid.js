window.LinkHive = window.LinkHive || {};

LinkHive.LinkGrid = (function () {

  var DOM = {};
  var currentSort = 'newest';
  var currentView = 'grid';
  var currentSearch = '';
  var selectedIds = [];

  var selectionMode = false;

  function init(dom) {
    DOM = dom;
    bindEvents();
  }

  function bindEvents() {
    DOM.searchInput.addEventListener('input', LinkHive.debounce(function () {
      currentSearch = this.value.trim();
      clearSelection();
      render();
    }, 250));

    DOM.sortSelect.addEventListener('change', function () {
      currentSort = this.value;
      clearSelection();
      render();
    });

    var viewBtns = DOM.toolbar.querySelectorAll('.btn-view-toggle');
    viewBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.id === 'btnSelectMode') return;
        viewBtns.forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        currentView = this.dataset.view;
        clearSelection();
        render();
      });
    });

    var selectBtn = document.getElementById('btnSelectMode');
    if (selectBtn) {
      selectBtn.addEventListener('click', function () {
        selectionMode = !selectionMode;
        this.classList.toggle('active', selectionMode);
        if (!selectionMode) clearSelection();
        render();
      });
    }

    DOM.linkGrid.addEventListener('change', function (e) {
      var cb = e.target.closest('.link-card-check');
      if (cb) toggleSelect(cb.dataset.linkId);
    });
  }

  function clearSelection() {
    selectedIds = [];
    updateBulkBar();
  }

  function toggleSelect(id) {
    var idx = selectedIds.indexOf(id);
    if (idx >= 0) { selectedIds.splice(idx, 1); } else { selectedIds.push(id); }
    updateBulkBar();
  }

  function selectAll(links) {
    var allSelected = links.length > 0 && links.every(function (l) { return selectedIds.indexOf(l.id) >= 0; });
    if (allSelected) {
      selectedIds = [];
    } else {
      selectedIds = links.map(function (l) { return l.id; });
    }
    updateBulkBar();
    renderCheckboxes();
  }

  function updateBulkBar() {
    var bar = document.getElementById('bulkBar');
    var count = document.getElementById('bulkCount');
    var moveSelect = document.getElementById('bulkMoveSelect');
    if (!bar || !count) return;
    if (selectedIds.length > 0) {
      bar.classList.remove('hidden');
      count.textContent = selectedIds.length + ' selected';
      if (moveSelect) {
        var collections = LinkHive.LinkStore.getCollections();
        moveSelect.innerHTML = '<option value="">Move to...</option>' +
          '<option value="__none__">No collection</option>' +
          collections.map(function (c) {
            return '<option value="' + c.id + '">' + LinkHive.escapeHtml(c.name) + '</option>';
          }).join('');
      }
    } else {
      bar.classList.add('hidden');
    }
  }

  function bulkMove(collectionId) {
    if (selectedIds.length === 0 || !collectionId) return;
    var targetId = collectionId === '__none__' ? '' : collectionId;
    var collection = LinkHive.LinkStore.getCollection(targetId);
    var count = selectedIds.length;
    var promises = selectedIds.map(function (id) {
      return LinkHive.LinkStore.updateLink(id, {
        collectionId: targetId || '',
        collectionSlug: collection ? collection.slug : ''
      });
    });
    Promise.all(promises).then(function () {
      selectedIds = [];
      updateBulkBar();
      LinkHive.LinkGrid.render();
      LinkHive.Sidebar.update();
      LinkHive.Toast.show('Moved ' + count + ' link' + (count !== 1 ? 's' : ''), 'success');
      LinkHive.Sync.autoSync();
    }).catch(function () {
      LinkHive.Toast.show('Failed to move some links', 'error');
    });
  }

  function renderCheckboxes() {
    DOM.linkGrid.querySelectorAll('.link-card-check').forEach(function (cb) {
      cb.checked = selectedIds.indexOf(cb.dataset.linkId) >= 0;
    });
  }

  function bulkDelete() {
    if (selectedIds.length === 0) return;
    LinkHive.Modals.showConfirm(
      'Delete ' + selectedIds.length + ' link' + (selectedIds.length !== 1 ? 's' : ''),
      'This will permanently delete ' + selectedIds.length + ' link' + (selectedIds.length !== 1 ? 's' : '') + '. This cannot be undone.',
      function () {
        var count = selectedIds.length;
        var promises = selectedIds.map(function (id) { return LinkHive.LinkStore.deleteLink(id); });
        Promise.all(promises).then(function () {
          selectedIds = [];
          updateBulkBar();
          LinkHive.LinkGrid.render();
          LinkHive.Sidebar.update();
          LinkHive.Toast.show('Deleted ' + count + ' link' + (count !== 1 ? 's' : ''), 'success');
          LinkHive.Sync.autoSync();
        }).catch(function () {
          LinkHive.Toast.show('Failed to delete some links', 'error');
          LinkHive.LinkGrid.render();
          LinkHive.Sidebar.update();
        });
      }
    );
  }

  function selectAllVisible() {
    var cards = DOM.linkGrid.querySelectorAll('.link-card-check');
    var allSelected = cards.length > 0 && selectedIds.length >= cards.length;
    if (allSelected) {
      cards.forEach(function (cb) { cb.checked = false; });
      selectedIds = [];
    } else {
      cards.forEach(function (cb) { cb.checked = true; });
      selectedIds = [];
      cards.forEach(function (cb) { selectedIds.push(cb.dataset.linkId); });
    }
    updateBulkBar();
  }

  function render() {
    var collectionId = getCollectionIdFromRoute();
    var links;

    if (location.hash === '#/tags' || location.hash === '#/tags/') {
      DOM.toolbar.style.display = 'none';
      renderTagCloud(collectionId);
      return;
    }

    if (currentSearch) {
      links = LinkHive.LinkStore.search(currentSearch, collectionId);
    } else if (location.hash.startsWith('#/tags/')) {
      var tag = decodeURIComponent(location.hash.replace('#/tags/', ''));
      links = LinkHive.LinkStore.getLinksByTag(tag, collectionId);
    } else {
      links = LinkHive.LinkStore.getLinks(collectionId);
    }

    links = LinkHive.LinkStore.sortLinks(links, currentSort);
    DOM.toolbar.style.display = '';

    var isListView = currentView === 'list';

    if (links.length === 0) {
      DOM.linkGrid.innerHTML = '';
      DOM.emptyState.classList.remove('hidden');
      DOM.toolbar.style.display = 'none';
      DOM.searchInput.placeholder = currentSearch ? 'No results for "' + currentSearch + '"' : 'Search links...';
    } else {
      DOM.emptyState.classList.add('hidden');
      DOM.toolbar.style.display = '';
      DOM.searchInput.placeholder = 'Search links...';

      DOM.linkGrid.className = 'link-grid' + (isListView ? ' list-view' : '');
      DOM.linkGrid.innerHTML = links.map(function (link) {
        return renderLinkCard(link, isListView);
      }).join('');

      if (isListView) {
        DOM.linkGrid.querySelectorAll('.link-card-check').forEach(function (cb) {
          cb.checked = selectedIds.indexOf(cb.dataset.linkId) >= 0;
        });
      }

      bindLinkCardEvents();
    }

    updateBulkBar();
    window.refreshIcons(DOM.mainContent);
  }

  function renderTagCloud(collectionId) {
    var tags = LinkHive.LinkStore.getAllTags(collectionId);
    DOM.emptyState.classList.add('hidden');
    DOM.linkGrid.className = 'link-grid';

    if (tags.length === 0) {
      DOM.linkGrid.innerHTML = '';
      DOM.emptyState.classList.remove('hidden');
      var icon = DOM.emptyState.querySelector('i');
      if (icon) icon.setAttribute('data-lucide', 'tag');
      DOM.emptyState.querySelector('h2').textContent = 'No tags yet';
      DOM.emptyState.querySelector('p').textContent = 'Add tags to your links to see them here';
      window.refreshIcons(DOM.mainContent);
      return;
    }

    var maxCount = tags[0].count;
    DOM.linkGrid.innerHTML = tags.map(function (tag) {
      var size = 0.75 + (tag.count / maxCount) * 0.6;
      return '<a href="#/tags/' + encodeURIComponent(tag.name) + '" class="tag-card">' +
             '<span class="tag-card-name" style="font-size:' + size.toFixed(2) + 'rem">' + LinkHive.escapeHtml(tag.name) + '</span>' +
             '<span class="tag-card-count">' + tag.count + ' link' + (tag.count !== 1 ? 's' : '') + '</span>' +
             '</a>';
    }).join('');

    window.refreshIcons(DOM.mainContent);
  }

  function renderLinkCard(link, isListView) {
    var collection = LinkHive.LinkStore.getCollection(link.collectionId);
    var collectionName = collection ? collection.name : '';
    var collectionColor = collection ? collection.color : '';

    var faviconHtml = '<div class="link-card-favicon-placeholder"><i data-lucide="link" style="width:12px;height:12px"></i></div>';

    var tagsHtml = '';
    if (link.tags && link.tags.length > 0) {
      tagsHtml = '<div class="link-card-tags">' +
        link.tags.map(function (t) {
          return '<a href="#/tags/' + encodeURIComponent(t) + '" class="tag" data-tag="' + LinkHive.escapeHtml(t) + '">' + LinkHive.escapeHtml(t) + '</a>';
        }).join('') +
        '</div>';
    }

    var descHtml = '';
    if (link.description) {
      descHtml = '<div class="link-card-description">' + LinkHive.escapeHtml(link.description) + '</div>';
    }

    var metaHtml = '';
    if (collectionName || link.createdAt) {
      var metaParts = [];
      if (collectionName) {
        metaParts.push('<span class="link-card-collection" style="color:' + (collectionColor || 'var(--text-muted)') + '">' + LinkHive.escapeHtml(collectionName) + '</span>');
      }
      metaParts.push('<span>' + LinkHive.formatDate(link.createdAt) + '</span>');
      metaHtml = '<div class="link-card-meta">' + metaParts.join('<span class="link-card-meta-dot"></span>') + '</div>';
    }

    var checkboxHtml = '';
    if (isListView && selectionMode) {
      checkboxHtml = '<label class="link-card-check-label" onclick="event.stopPropagation()">' +
        '<input type="checkbox" class="link-card-check" data-link-id="' + link.id + '">' +
        '</label>';
    }

    return '<article class="link-card' + (isListView ? ' list-card' : '') + '" data-link-id="' + link.id + '">' +
      (isListView ? '' : checkboxHtml) +
      '<div class="link-card-header">' +
        (isListView ? checkboxHtml : '') +
        faviconHtml +
        '<div class="link-card-header-text">' +
          '<h3 class="link-card-title">' + LinkHive.escapeHtml(link.title || LinkHive.truncateUrl(link.url, 60)) + '</h3>' +
          '<div class="link-card-url">' + LinkHive.escapeHtml(LinkHive.truncateUrl(link.url, 40)) + '</div>' +
        '</div>' +
        (isListView ? '<div class="link-card-actions list-actions">' +
          '<button class="link-card-action edit" data-link-id="' + link.id + '" aria-label="Edit">' +
            '<i data-lucide="edit-3" style="width:14px;height:14px"></i>' +
          '</button>' +
          '<button class="link-card-action delete" data-link-id="' + link.id + '" aria-label="Delete">' +
            '<i data-lucide="trash-2" style="width:14px;height:14px"></i>' +
          '</button>' +
          '<button class="link-card-action open" data-link-url="' + LinkHive.escapeHtml(link.url) + '" aria-label="Open">' +
            '<i data-lucide="external-link" style="width:14px;height:14px"></i>' +
          '</button>' +
        '</div>' : '') +
      '</div>' +
      descHtml +
      (isListView
        ? ((tagsHtml || metaHtml) ? '<div class="link-card-bottom">' + tagsHtml + metaHtml + '</div>' : '')
        : '<div class="link-card-bottom">' + tagsHtml + metaHtml + '</div>') +
      (!isListView ? '<div class="link-card-footer">' +
        '<span class="link-card-date">' + LinkHive.formatDate(link.createdAt) + '</span>' +
        '<div class="link-card-actions">' +
          '<button class="link-card-action edit" data-link-id="' + link.id + '" aria-label="Edit">' +
            '<i data-lucide="edit-3" style="width:14px;height:14px"></i>' +
          '</button>' +
          '<button class="link-card-action delete" data-link-id="' + link.id + '" aria-label="Delete">' +
            '<i data-lucide="trash-2" style="width:14px;height:14px"></i>' +
          '</button>' +
          '<button class="link-card-action open" data-link-url="' + LinkHive.escapeHtml(link.url) + '" aria-label="Open">' +
            '<i data-lucide="external-link" style="width:14px;height:14px"></i>' +
          '</button>' +
        '</div>' +
      '</div>' : '') +
    '</article>';
  }

  function bindLinkCardEvents() {
    DOM.linkGrid.querySelectorAll('.link-card').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('.link-card-action') || e.target.closest('.tag') || e.target.closest('.link-card-check-label')) return;
        var url = card.querySelector('.open').dataset.linkUrl;
        if (url) LinkHive.openLink(url);
      });
    });

    DOM.linkGrid.querySelectorAll('.link-card-action.edit').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = this.dataset.linkId;
        var link = LinkHive.LinkStore.getLinkById(id);
        if (link) LinkHive.Modals.showLinkModal(link);
      });
    });

    DOM.linkGrid.querySelectorAll('.link-card-action.delete').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = this.dataset.linkId;
        LinkHive.Modals.showConfirm(
          'Delete Link',
          'Are you sure you want to delete this link?',
          function () {
            LinkHive.LinkStore.deleteLink(id).then(function () {
              selectedIds = selectedIds.filter(function (sid) { return sid !== id; });
              LinkHive.LinkGrid.render();
              LinkHive.Sidebar.update();
              LinkHive.Toast.show('Link deleted', 'success');
              LinkHive.Sync.autoSync();
            });
          }
        );
      });
    });

    DOM.linkGrid.querySelectorAll('.link-card-action.open').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var url = this.dataset.linkUrl;
        if (url) LinkHive.openLink(url);
      });
    });
  }

  function getCollectionIdFromRoute() {
    var hash = location.hash;
    var match = hash.match(/^#\/c\/(.+)/);
    if (match) {
      var col = LinkHive.LinkStore.getCollectionBySlug(match[1]);
      if (col) return col.id;
      location.replace('#/');
      return null;
    }
    return null;
  }

  function updateSort(sort) {
    currentSort = sort;
    DOM.sortSelect.value = sort;
  }

  function updateView(view) {
    currentView = view;
    var btns = DOM.toolbar.querySelectorAll('.btn-view-toggle');
    btns.forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === view);
    });
  }

  return {
    init: init,
    render: render,
    updateSort: updateSort,
    updateView: updateView,
    getCollectionIdFromRoute: getCollectionIdFromRoute,
    bulkDelete: bulkDelete,
    selectAllVisible: selectAllVisible,
    bulkMove: bulkMove
  };

})();
