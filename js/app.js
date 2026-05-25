window.LinkHive = window.LinkHive || {};

LinkHive.App = (function () {

  function init() {
    try { mapDomRefs(); } catch (e) { return; }
    try { LinkHive.Sidebar.init(LinkHive.DOM); } catch (e) {}
    try { LinkHive.LinkGrid.init(LinkHive.DOM); } catch (e) {}
    try { LinkHive.Modals.init(LinkHive.DOM); } catch (e) {}
    try { LinkHive.Themes.init(); } catch (e) {}
    try { LinkHive.Toast.init(); } catch (e) {}

    window.addEventListener('hashchange', onRouteChange);
    document.addEventListener('click', handleGlobalClicks);

    var applyServerConfig = function (serverCfg) {
      if (!serverCfg) return;
      var cfg = LinkHive.Config.get() || Object.assign({}, LinkHive.DEFAULTS);
      cfg._serverManaged = true;
      if (serverCfg.githubToken) cfg.githubToken = serverCfg.githubToken;
      if (serverCfg.repo) cfg.githubRepo = serverCfg.repo;
      if (serverCfg.branch) cfg.githubBranch = serverCfg.branch;
      if (serverCfg.title) cfg._title = serverCfg.title;
      if (serverCfg.description) cfg._description = serverCfg.description;
      if (serverCfg.author) cfg.author = serverCfg.author;
      cfg.storage = cfg.githubToken && cfg.githubRepo ? 'github' : cfg.storage;
      LinkHive.Config.save(cfg);
    };

    var boot = function () {
      var config = LinkHive.Config.get();
      if (config) {
        if (config._title) document.title = config._title;
        if (config._description) {
          var meta = document.querySelector('meta[name="description"]');
          if (meta) meta.setAttribute('content', config._description);
        }
        if (config.author) {
          var authorMeta = document.querySelector('meta[name="author"]');
          if (authorMeta) authorMeta.setAttribute('content', config.author);
        }
      }
      if (!config) { showOnboarding(); } else { initWithConfig(config); }
    };

    LinkHive.Config.loadServerConfig(function (serverCfg) {
      applyServerConfig(serverCfg);
      boot();
    });
  }

  function mapDomRefs() {
    var qs = function (sel) { return document.querySelector(sel); };
    LinkHive.DOM = {
      appLayout: qs('#appLayout'),
      mainWrapper: qs('#mainWrapper'),
      header: qs('#header'),
      headerSearch: qs('#headerSearch'),
      searchInput: qs('#searchInput'),
      themeQuickToggle: qs('#themeQuickToggle'),
      settingsToggle: qs('#settingsToggle'),
      sidebar: qs('#sidebar'),
      sidebarPanel: qs('.sidebar-panel'),
      sidebarBackdrop: qs('#sidebarBackdrop'),
      sidebarToggle: qs('#sidebarToggle'),
      sidebarClose: qs('#sidebarClose'),
      sidebarUser: qs('#sidebarUser'),
      sidebarAvatar: qs('#sidebarAvatar'),
      sidebarName: qs('#sidebarName'),
      sidebarCollections: qs('#sidebarCollections'),
      sidebarSettingsBtn: qs('#sidebarSyncBtn'),
      addCollectionSidebar: qs('#addCollectionSidebar'),
      quickAddBtn: qs('#quickAddBtn'),
      mainContent: qs('#mainContent'),
      collectionChips: qs('#collectionChips'),
      toolbar: qs('#toolbar'),
      linkGrid: qs('#linkGrid'),
      sortSelect: qs('#sortSelect'),
      emptyState: qs('#emptyState'),
      loadingState: qs('#loadingState'),
      emptyAddBtn: qs('#emptyAddBtn'),
      bottomBar: qs('#bottomBar'),
      bottomAddBtn: qs('#bottomAddBtn'),
      bottomSearchBtn: qs('#bottomSearchBtn'),
      onboarding: qs('#onboarding'),
      onboardingForm: qs('#onboardingForm'),
      onboardingName: qs('#onboardingName'),
      onboardingGithub: qs('#onboardingGithub'),
      onboardingToken: qs('#onboardingToken'),
      onboardingRepo: qs('#onboardingRepo'),
      onboardingCreate: qs('#onboardingCreate'),
      settingsModal: qs('#settingsModal'),
      settingsClose: qs('#settingsClose'),
      settingsBody: qs('#settingsBody'),
      settingsName: qs('#settingsName'),
      settingsNameSection: qs('#settingsNameSection'),
      settingsTheme: qs('#settingsTheme'),
      settingsStorageType: qs('#settingsStorageType'),
      settingsGithub: qs('#settingsGithub'),
      settingsGithubToken: qs('#settingsGithubToken'),
      settingsGithubRepo: qs('#settingsGithubRepo'),
      settingsGithubBranch: qs('#settingsGithubBranch'),
      settingsValidateGithub: qs('#settingsValidateGithub'),
      settingsExportBtn: qs('#settingsExportBtn'),
      settingsImportBtn: qs('#settingsImportBtn'),
      settingsImportFile: qs('#settingsImportFile'),
      settingsImportRaindropBtn: qs('#settingsImportRaindropBtn'),
      settingsPushBtn: qs('#settingsPushBtn'),
      settingsPullBtn: qs('#settingsPullBtn'),
      settingsSyncActions: qs('#settingsSyncActions'),
      settingsWipeBtn: qs('#settingsWipeBtn'),
      settingsWipeConfirm: qs('#settingsWipeConfirm'),
      settingsWipeInput: qs('#settingsWipeInput'),
      settingsWipeConfirmBtn: qs('#settingsWipeConfirmBtn'),
      settingsVersion: qs('#settingsVersion'),
      githubStatus: qs('#githubStatus'),
      syncStatus: qs('#syncStatus'),
      avatarColors: qs('#avatarColors'),
      settingsAvatarSection: qs('#settingsAvatarSection'),
      avatarTypeRadios: null,
      settingsAvatarUrl: qs('#settingsAvatarUrl'),
      settingsAvatarFile: qs('#settingsAvatarFile'),
      avatarUploadRow: qs('#avatarUploadRow'),
      avatarUploadName: qs('#avatarUploadName'),
      settingsAvatarUploadBtn: qs('#settingsAvatarUploadBtn'),
      linkModal: qs('#linkModal'),
      linkModalTitle: qs('#linkModalTitle'),
      linkModalClose: qs('#linkModalClose'),
      linkModalCancel: qs('#linkModalCancel'),
      linkModalSave: qs('#linkModalSave'),
      linkUrl: qs('#linkUrl'),
      linkTitle: qs('#linkTitle'),
      linkDesc: qs('#linkDesc'),
      linkCollection: qs('#linkCollection'),
      linkTagWrapper: qs('#linkTagWrapper'),
      linkTagTags: qs('#linkTagTags'),
      linkTagInput: qs('#linkTagInput'),
      linkEditId: qs('#linkEditId'),
      linkUrlError: qs('#linkUrlError'),
      urlPreview: qs('#urlPreview'),
      urlPreviewFavicon: qs('#urlPreviewFavicon'),
      urlPreviewTitle: qs('#urlPreviewTitle'),
      urlPreviewDomain: qs('#urlPreviewDomain'),
      urlPreviewDesc: qs('#urlPreviewDesc'),
      collectionModal: qs('#collectionModal'),
      collectionModalTitle: qs('#collectionModalTitle'),
      collectionModalClose: qs('#collectionModalClose'),
      collectionModalCancel: qs('#collectionModalCancel'),
      collectionModalSave: qs('#collectionModalSave'),
      collectionName: qs('#collectionName'),
      collectionNameError: qs('#collectionNameError'),
      collectionIconGrid: qs('#collectionIconGrid'),
      collectionIconSearch: qs('#collectionIconSearch'),
      collectionColorGrid: qs('#collectionColorGrid'),
      collectionEditId: qs('#collectionEditId'),
      confirmModal: qs('#confirmModal'),
      confirmTitle: qs('#confirmTitle'),
      confirmMessage: qs('#confirmMessage'),
      confirmCancel: qs('#confirmCancel'),
      confirmYes: qs('#confirmYes'),
      toastContainer: qs('#toastContainer')
    };
  }

  function initWithConfig(config, options) {
    options = options || {};
    LinkHive.Themes.apply(config.theme, config.mode);
    var backend = new LinkHive.LocalBackend();
    LinkHive.LinkStore.init(backend).then(function () {
      try {
        DOM('onboarding').classList.add('hidden');
        DOM('appLayout').style.display = '';
        DOM('sidebar').style.display = '';
        if (config.defaultView) LinkHive.LinkGrid.updateView(config.defaultView);
        if (config.defaultSort) {
          LinkHive.LinkGrid.updateSort(config.defaultSort);
          DOM('sortSelect').value = config.defaultSort;
        }
        LinkHive.Sidebar.update();
        onRouteChange();
        document.title = 'LinkHive \u2014 Never lose a link again';
        if (options.pullFromGithub && config.storage === 'github' && config.githubToken && config.githubRepo) {
          var btn = document.getElementById('onboardingCreate');
          if (btn) { btn.disabled = true; btn.textContent = 'Pulling data...'; }
          LinkHive.Sync.pullFromGithub().then(function () {
            LinkHive.LinkGrid.render();
            LinkHive.Sidebar.update();
          }).catch(function () {}).finally(function () {
            if (btn) { btn.disabled = false; btn.textContent = 'Get Started'; }
          });
        }
      } catch (e) { console.warn('initWithConfig then:', e); }
    }).catch(function (err) {
      DOM('onboarding').classList.add('hidden');
      DOM('appLayout').style.display = '';
      DOM('sidebar').style.display = '';
      try { LinkHive.Sidebar.update(); } catch (e) {}
      try { LinkHive.LinkGrid.render(); } catch (e) {}
    });
  }

  function DOM(id) { return LinkHive.DOM[id]; }

  function showOnboarding() {
    var d = LinkHive.DOM;
    d.appLayout.style.display = 'none';
    if (d.sidebar) d.sidebar.style.display = 'none';
    d.onboarding.classList.remove('hidden');
    d.onboardingGithub.classList.add('hidden');
    d.onboardingName.value = '';
    var storageRadios = d.onboarding.querySelectorAll('input[name="onboardingStorage"]');
    storageRadios.forEach(function (r) { r.checked = r.value === 'local'; });
    document.title = 'LinkHive \u2014 Welcome';
    window.refreshIcons(d.onboarding);
  }

  function handleGlobalClicks(e) {
    var link = e.target.closest('.sidebar-link[data-route]');
    if (link) { e.preventDefault(); location.hash = link.dataset.route; if (window.innerWidth < 1024) LinkHive.Sidebar.close(); return; }
    var colLink = e.target.closest('.sidebar-collection-link[data-slug]');
    if (colLink) { e.preventDefault(); location.hash = '#/c/' + colLink.dataset.slug; if (window.innerWidth < 1024) LinkHive.Sidebar.close(); return; }
    var tagLink = e.target.closest('[data-tag]');
    if (tagLink) { e.preventDefault(); location.hash = '#/tags/' + encodeURIComponent(tagLink.dataset.tag); return; }
  }

  function onRouteChange() {
    var hash = location.hash || '#/';
    if (hash === '#/' || hash === '#') document.title = 'LinkHive \u2014 All Links';
    else if (hash.startsWith('#/c/')) {
      var slug = decodeURIComponent(hash.replace('#/c/', ''));
      var collection = LinkHive.LinkStore.getCollectionBySlug(slug);
      document.title = (collection ? collection.name + ' \u2014 ' : '') + 'LinkHive';
    } else if (hash.startsWith('#/tags/')) {
      document.title = decodeURIComponent(hash.replace('#/tags/', '')) + ' \u2014 LinkHive';
    } else if (hash.startsWith('#/tags')) {
      document.title = 'Tags \u2014 LinkHive';
    }
    LinkHive.Sidebar.update();
    LinkHive.Sidebar.updateCollectionChips();
    LinkHive.LinkGrid.render();
    DOM('searchInput').value = '';
  }

  function reinit() {
    var config = LinkHive.Config.get();
    if (!config) { showOnboarding(); } else { initWithConfig(config); }
  }

  return { init: init, reinit: reinit, initWithConfig: initWithConfig, onRouteChange: onRouteChange };
})();

LinkHive.Sync = (function () {
  function pushToGithub() {
    var config = LinkHive.Config.get();
    if (!config || !config.githubToken || !config.githubRepo) {
      LinkHive.Toast.show('GitHub not configured. Set up in Settings.', 'error');
      return Promise.reject(new Error('not configured'));
    }
    var parts = config.githubRepo.split('/');
    if (parts.length !== 2) {
      LinkHive.Toast.show('Invalid repo format. Use owner/repo-name.', 'error');
      return Promise.reject(new Error('invalid repo'));
    }
    LinkHive.Toast.show('Syncing to GitHub...', '');
    return _doPush();
  }

  function _doPush() {
    _syncing = true;
    _syncPending = false;
    return _pushToGithub().then(function () {
      LinkHive.Toast.show('Synced to GitHub', 'success');
      _syncing = false;
      if (_syncPending) {
        _syncPending = false;
        _doPush().catch(function () {});
      }
    }).catch(function (err) {
      LinkHive.Toast.show('Sync failed: ' + (err.message || 'error'), 'error');
      _syncing = false;
      if (_syncPending) {
        _syncPending = false;
        _doPush().catch(function () {});
      }
    });
  }

  function _pushToGithub() {
    var config = LinkHive.Config.get();
    var parts = config.githubRepo.split('/');
    var client = new LinkHive.GitHubClient(config.githubToken, parts[0], parts[1], config.githubBranch);

    var getAll = function () {
      return Promise.all([LinkHive.LinkStore.getCollections(), LinkHive.LinkStore.getLinks()]);
    };

    var pushFile = function (path, data) {
      return client.getFile(path).catch(function () { return null; }).then(function (existing) {
        return client.putFile(path, data, existing ? existing.sha : undefined);
      });
    };

    return getAll().then(function (results) {
      var collections = results[0];
      var links = results[1];
      var chunkSize = 500;
      var chunks = [];
      for (var i = 0; i < links.length; i += chunkSize) {
        chunks.push(links.slice(i, i + chunkSize));
      }

      return pushFile('data/collections.json', collections).then(function () {
        var chain = Promise.resolve();
        chunks.forEach(function (chunk, idx) {
          chain = chain.then(function () {
            return pushFile('data/links-' + idx + '.json', chunk);
          });
        });
        return chain.then(function () {
          return pushFile('data/index.json', { chunks: chunks.length, total: links.length, exportedAt: new Date().toISOString() });
        });
      });
    });
  }

  function pullFromGithub() {
    var config = LinkHive.Config.get();
    if (!config || !config.githubToken || !config.githubRepo) return Promise.reject(new Error('not configured'));
    var parts = config.githubRepo.split('/');
    if (parts.length !== 2) return Promise.reject(new Error('invalid repo'));
    LinkHive.Toast.show('Syncing from GitHub...', '');
    return _pullFromGithub();
  }

  function _pullFromGithub() {
    var config = LinkHive.Config.get();
    var parts = config.githubRepo.split('/');
    var client = new LinkHive.GitHubClient(config.githubToken, parts[0], parts[1], config.githubBranch);

    var getFile = function (path) {
      return client.getFile(path).then(function (data) {
        return data ? data.content : null;
      }).catch(function () { return null; });
    };

    return getFile('data/index.json').then(function (index) {
      if (!index || !index.chunks) { LinkHive.Toast.show('No data found on GitHub', 'warning'); return; }
      var linkPromises = [];
      for (var i = 0; i < index.chunks; i++) {
        linkPromises.push(getFile('data/links-' + i + '.json'));
      }
      return getFile('data/collections.json').then(function (collections) {
        return Promise.all(linkPromises).then(function (linkArrays) {
          var links = [];
          linkArrays.forEach(function (arr) { if (arr) links = links.concat(arr); });
          var data = { version: 1, collections: collections || [], links: links };
          return LinkHive.LinkStore.importData(JSON.stringify(data)).then(function () {
            LinkHive.LinkGrid.render();
            LinkHive.Sidebar.update();
            LinkHive.Toast.show('Data pulled from GitHub', 'success');
          });
        });
      });
    }).catch(function (err) { LinkHive.Toast.show('Pull failed: ' + (err.message || 'error'), 'error'); throw err; });
  }
  var _autoSyncTimer = null;
  var _syncing = false;
  var _syncPending = false;

  function autoSync() {
    var config = LinkHive.Config.get();
    if (!config || config.storage !== 'github' || !config.githubToken || !config.githubRepo) return;
    clearTimeout(_autoSyncTimer);
    _autoSyncTimer = setTimeout(function () {
      if (_syncing) { _syncPending = true; return; }
      _doPush().catch(function () {});
    }, 2000);
  }

  function _doPush() {
    _syncing = true;
    _syncPending = false;
    return pushToGithub().then(function () {
      _syncing = false;
      if (_syncPending) {
        _syncPending = false;
        _doPush().catch(function () {});
      }
    }).catch(function () {
      _syncing = false;
      if (_syncPending) {
        _syncPending = false;
        _doPush().catch(function () {});
      }
    });
  }

  return { pushToGithub: pushToGithub, pullFromGithub: pullFromGithub, autoSync: autoSync };
})();

LinkHive.Toast = (function () {
  var container = null;
  function init() { container = document.querySelector('#toastContainer'); }
  function show(message, type) {
    if (!container) init();
    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || '');
    var text = document.createElement('span');
    text.className = 'toast-text';
    text.textContent = message;
    toast.appendChild(text);
    if (type === 'error') {
      var copyBtn = document.createElement('button');
      copyBtn.className = 'toast-copy-btn';
      copyBtn.innerHTML = '<i data-lucide="clipboard"></i>';
      copyBtn.title = 'Copy error';
      copyBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        navigator.clipboard.writeText(message).then(function () {
          text.textContent = 'Copied!';
          setTimeout(function () { text.textContent = message; }, 1500);
        });
      });
      toast.appendChild(copyBtn);
      window.refreshIcons(toast);
    }
    container.appendChild(toast);
    var duration = type === 'error' ? 10000 : 3000;
    setTimeout(function () { toast.classList.add('removing'); setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 150); }, duration);
  }
  return { init: init, show: show };
})();

(function () {
  var onboardingStorageRadios = document.querySelectorAll('input[name="onboardingStorage"]');
  if (onboardingStorageRadios.length) {
    onboardingStorageRadios.forEach(function (r) {
      r.addEventListener('change', function () {
        var d = document.getElementById('onboardingGithub');
        if (d) d.classList.toggle('hidden', this.value !== 'github');
      });
    });
  }
  var onboardCreateBtn = document.getElementById('onboardingCreate');
  if (onboardCreateBtn) {
    onboardCreateBtn.addEventListener('click', function () {
      var name = document.getElementById('onboardingName').value.trim() || 'User';
      var storageRadio = document.querySelector('input[name="onboardingStorage"]:checked');
      var storage = storageRadio ? storageRadio.value : 'local';
      var token = document.getElementById('onboardingToken').value.trim();
      var repo = document.getElementById('onboardingRepo').value.trim();
      var config = Object.assign({}, LinkHive.DEFAULTS, { name: name, storage: storage, githubToken: token, githubRepo: repo });
      if (storage === 'github' && token) {
        onboardCreateBtn.disabled = true;
        onboardCreateBtn.textContent = 'Validating...';
        var client = new LinkHive.GitHubClient(token);
        client.validate().then(function (user) {
          config.githubUser = user.login;
          LinkHive.Config.save(config);
          onboardCreateBtn.textContent = 'Pulling data...';
          LinkHive.App.initWithConfig(config, { pullFromGithub: true });
        }).catch(function () {
          LinkHive.Toast.show('Invalid GitHub token', 'error');
          onboardCreateBtn.disabled = false;
          onboardCreateBtn.textContent = 'Get Started';
        });
      } else {
        LinkHive.Config.save(config);
        LinkHive.App.reinit();
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { LinkHive.App.init(); });
  } else {
    LinkHive.App.init();
  }
})();
