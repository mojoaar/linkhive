window.LinkHive = window.LinkHive || {};

LinkHive.Sidebar = (function () {

  var DOM = {};
  var isOpen = false;

  function closeAllMenus() {
    if (DOM.sidebarCollections) {
      DOM.sidebarCollections.querySelectorAll('.collection-menu').forEach(function (m) {
        m.classList.add('hidden');
      });
    }
  }

  function init(dom) {
    DOM = dom;
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.collection-more-btn') && !e.target.closest('.collection-menu')) {
        closeAllMenus();
      }
    });
    bindEvents();
  }

  function bindEvents() {
    DOM.sidebarToggle.addEventListener('click', function () {
      if (isOpen) { close(); } else { open(); }
    });

    DOM.sidebarBackdrop.addEventListener('click', close);
    DOM.sidebarClose.addEventListener('click', close);

    DOM.settingsToggle.addEventListener('click', function () {
      LinkHive.Modals.showSettings();
    });

    DOM.sidebarSettingsBtn.addEventListener('click', function () {
      var config = LinkHive.Config.get();
      var hasGithub = !!(config && config.storage === 'github' && config.githubToken && config.githubRepo);
      if (hasGithub) {
        LinkHive.Sync.pushToGithub();
      } else {
        LinkHive.Modals.showSettings();
      }
    });

    DOM.themeQuickToggle.addEventListener('click', function () {
      var result = LinkHive.Themes.toggle();
      var config = LinkHive.Config.get();
      if (config) {
        config.mode = result.mode;
        config.theme = result.theme;
        LinkHive.Config.save(config);
      }
    });

    var bottomBtns = DOM.bottomBar.querySelectorAll('.bottom-bar-btn');
    bottomBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        bottomBtns.forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
      });
    });

    DOM.bottomSearchBtn.addEventListener('click', function () {
      DOM.searchInput.focus();
    });
  }

  function open() {
    DOM.sidebar.classList.add('open');
    isOpen = true;
    document.body.classList.add('modal-open');
  }

  function close() {
    DOM.sidebar.classList.remove('open');
    isOpen = false;
    document.body.classList.remove('modal-open');
  }

  function update() {
    updateUser();
    updateCollections();
    updateActiveRoute();
    updateCollectionChips();
    updateFooterBtn();
    updateAllLinksCount();
  }

  function updateAllLinksCount() {
    var link = DOM.sidebarPanel.querySelector('.sidebar-link[data-route="/"]');
    if (!link) return;
    var span = link.querySelector('span');
    if (!span) return;
    var count = LinkHive.LinkStore.getTotalLinkCount();
    span.textContent = 'All Links [' + count + ']';
  }

  function updateUser() {
    var config = LinkHive.Config.get();
    if (!config) {
      DOM.sidebarAvatar.textContent = '?';
      DOM.sidebarAvatar.style.background = '#666';
      DOM.sidebarAvatar.style.backgroundImage = '';
      DOM.sidebarAvatar.style.backgroundSize = '';
      DOM.sidebarName.textContent = 'LinkHive';
      return;
    }

    if (config.storage === 'github' && config.githubUser) {
      DOM.sidebarName.textContent = config.githubUser;
      DOM.sidebarAvatar.textContent = '';
      DOM.sidebarAvatar.style.background = 'var(--bg-elevated)';
      DOM.sidebarAvatar.style.backgroundImage = 'url(https://github.com/' + config.githubUser + '.png)';
      DOM.sidebarAvatar.style.backgroundSize = 'cover';
      return;
    }

    DOM.sidebarName.textContent = config.name || 'LinkHive';

    if (config.avatar && config.avatar.type === 'url' && config.avatar.url) {
      DOM.sidebarAvatar.textContent = '';
      DOM.sidebarAvatar.style.background = 'var(--bg-elevated)';
      DOM.sidebarAvatar.style.backgroundImage = 'url(' + config.avatar.url + ')';
      DOM.sidebarAvatar.style.backgroundSize = 'cover';
    } else if (config.avatar && config.avatar.type === 'upload' && config.avatar.dataUrl) {
      DOM.sidebarAvatar.textContent = '';
      DOM.sidebarAvatar.style.background = 'var(--bg-elevated)';
      DOM.sidebarAvatar.style.backgroundImage = 'url(' + config.avatar.dataUrl + ')';
      DOM.sidebarAvatar.style.backgroundSize = 'cover';
    } else {
      var color = (config.avatar && config.avatar.color) || LinkHive.AVATAR_COLORS[0];
      var initial = (config.name || 'L').charAt(0).toUpperCase();
      DOM.sidebarAvatar.textContent = initial;
      DOM.sidebarAvatar.style.background = color;
      DOM.sidebarAvatar.style.backgroundImage = '';
      DOM.sidebarAvatar.style.backgroundSize = '';
    }
  }

  function updateFooterBtn() {
    var btn = DOM.sidebarSettingsBtn;
    if (!btn) return;
    var config = LinkHive.Config.get();
    var hasGithub = !!(config && config.storage === 'github' && config.githubToken && config.githubRepo);
    if (hasGithub) {
      btn.innerHTML = '<i data-lucide="cloud-upload"></i><span>Sync to GitHub</span>';
    } else {
      btn.innerHTML = '<i data-lucide="settings"></i><span>Settings</span>';
    }
    window.refreshIcons(btn);
  }

  function updateCollections() {
    var collections = LinkHive.LinkStore.getCollections();
    var activeSlug = '';

    var hash = location.hash;
    var match = hash.match(/^#\/c\/(.+)/);
    if (match) activeSlug = match[1];

    DOM.sidebarCollections.innerHTML = collections.map(function (c) {
      var isActive = c.slug === activeSlug;
      var linkCount = LinkHive.LinkStore.getLinkCount(c.id);
      return '<div class="sidebar-collection-row">' +
             '<a href="#/c/' + c.slug + '" class="sidebar-collection-link' + (isActive ? ' active' : '') + '" data-slug="' + c.slug + '">' +
             '<span class="collection-icon-sidebar" style="color:' + (c.color || '#666') + '"><i data-lucide="' + (c.icon || 'bookmark') + '"></i></span>' +
             '<span>' + LinkHive.escapeHtml(c.name) + '</span>' +
             '<span class="collection-count">' + linkCount + '</span>' +
             '</a>' +
             '<button class="collection-more-btn" data-id="' + c.id + '" aria-label="More actions">' +
             '<i data-lucide="more-horizontal" style="width:14px;height:14px"></i>' +
             '</button>' +
             '<div class="collection-menu hidden" data-menu-id="' + c.id + '">' +
             '<button class="collection-menu-item" data-action="edit" data-id="' + c.id + '">' +
             '<i data-lucide="edit-3" style="width:14px;height:14px"></i> Edit' +
             '</button>' +
             '<button class="collection-menu-item" data-action="delete" data-id="' + c.id + '">' +
             '<i data-lucide="trash-2" style="width:14px;height:14px"></i> Delete' +
             '</button>' +
             '</div>' +
             '</div>';
    }).join('');

    if (collections.length === 0) {
      DOM.sidebarCollections.innerHTML = '<div style="padding:8px 12px;font-size:0.78rem;color:var(--text-faint)">No collections</div>';
    }

    window.refreshIcons(DOM.sidebarCollections);

    DOM.sidebarCollections.querySelectorAll('.collection-more-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = this.dataset.id;
        var menu = DOM.sidebarCollections.querySelector('[data-menu-id="' + id + '"]');
        var allMenus = DOM.sidebarCollections.querySelectorAll('.collection-menu');
        allMenus.forEach(function (m) { m.classList.add('hidden'); });
        if (menu) menu.classList.toggle('hidden');
      });
    });

    DOM.sidebarCollections.querySelectorAll('.collection-menu-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = this.dataset.id;
        var action = this.dataset.action;
        DOM.sidebarCollections.querySelectorAll('.collection-menu').forEach(function (m) {
          m.classList.add('hidden');
        });

        if (action === 'edit') {
          var col = LinkHive.LinkStore.getCollection(id);
          if (col) LinkHive.Modals.showCollectionModal(col);
        } else if (action === 'delete') {
          var col = LinkHive.LinkStore.getCollection(id);
          if (col) {
            LinkHive.Modals.showConfirm(
              'Delete Collection',
              'Are you sure you want to delete "' + col.name + '" and all its links?',
              function () {
                LinkHive.LinkStore.deleteCollection(id).then(function () {
                  LinkHive.Sidebar.update();
                  LinkHive.LinkGrid.render();
                  LinkHive.Toast.show('Collection deleted', 'success');
                  LinkHive.Sync.autoSync();
                });
              }
            );
          }
        }
      });
    });
  }

  function updateActiveRoute() {
    var hash = location.hash || '#/';
    var sidebarLinks = DOM.sidebarPanel.querySelectorAll('.sidebar-link[data-route]');
    sidebarLinks.forEach(function (link) { link.classList.remove('active'); });

    if (hash === '#/' || hash === '#') {
      var homeLink = DOM.sidebarPanel.querySelector('.sidebar-link[data-route="/"]');
      if (homeLink) homeLink.classList.add('active');
    } else if (hash.startsWith('#/tags')) {
      var tagsLink = DOM.sidebarPanel.querySelector('.sidebar-link[data-route="/tags"]');
      if (tagsLink) tagsLink.classList.add('active');
    }
  }

  function updateCollectionChips() {
    var collections = LinkHive.LinkStore.getCollections();
    var activeSlug = '';
    var hash = location.hash;
    var match = hash.match(/^#\/c\/(.+)/);
    if (match) activeSlug = match[1];

    var chips = collections.map(function (c) {
      var isActive = c.slug === activeSlug;
      var color = c.color || '#888';
      var style = isActive
        ? 'background:' + color + ';color:#fff;border-color:' + color
        : 'border-color:' + color + ';color:' + color;
      return '<button class="chip' + (isActive ? ' active' : '') + '" data-slug="' + c.slug + '" style="' + style + '">' +
             LinkHive.escapeHtml(c.name) + '</button>';
    }).join('');

    var allActive = hash === '#/' || !match;
    var html = '<button class="chip' + (allActive ? ' active' : '') + '" data-slug="">All</button>' +
               chips +
               '<button class="chip chip-add" id="chipAddCollection" title="New collection"><i data-lucide="plus" style="width:14px;height:14px"></i></button>';

    DOM.collectionChips.innerHTML = html;
    window.refreshIcons(DOM.collectionChips);

    DOM.collectionChips.querySelectorAll('.chip[data-slug]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var slug = this.dataset.slug;
        location.hash = slug ? '#/c/' + slug : '#/';
      });
    });

    var addChip = DOM.collectionChips.querySelector('#chipAddCollection');
    if (addChip) {
      addChip.addEventListener('click', function () {
        LinkHive.Modals.showCollectionModal();
      });
    }
  }

  return {
    init: init,
    update: update,
    updateCollectionChips: updateCollectionChips,
    open: open,
    close: close
  };

})();
