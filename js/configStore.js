window.LinkHive = window.LinkHive || {};

LinkHive.Config = (function () {

  function migrate() {
    var newKey = LinkHive.STORE.CONFIG;
    if (localStorage.getItem(newKey)) return;

    var oldProfiles = localStorage.getItem('linkhive_profiles');
    if (!oldProfiles) return;

    try {
      var profiles = JSON.parse(oldProfiles);
      var activeId = localStorage.getItem('linkhive_active_profile');
      var profile = activeId
        ? profiles.find(function (p) { return p.id === activeId; })
        : profiles[0];

      if (!profile) return;

      var config = Object.assign({}, LinkHive.DEFAULTS, {
        name: profile.name || '',
        storage: profile.storage || 'local',
        githubToken: profile.githubToken || '',
        githubUser: profile.githubUser || '',
        githubRepo: profile.githubRepo || '',
        githubBranch: profile.githubBranch || 'main',
        avatar: {
          type: 'initials',
          color: profile.avatarColor || LinkHive.AVATAR_COLORS[0],
          url: '',
          dataUrl: ''
        }
      });

      if (profile.settings) {
        config.theme = profile.settings.theme || config.theme;
        config.mode = profile.settings.mode || config.mode;
        config.defaultView = profile.settings.defaultView || config.defaultView;
        config.defaultSort = profile.settings.defaultSort || config.defaultSort;
      }

      localStorage.setItem(newKey, JSON.stringify(config));
    } catch (e) {
      console.warn('LinkHive: failed to migrate old data', e);
    }
  }

  function get() {
    migrate();
    try {
      var raw = localStorage.getItem(LinkHive.STORE.CONFIG);
      if (raw) {
        var parsed = JSON.parse(raw);
        return Object.assign({}, LinkHive.DEFAULTS, parsed);
      }
    } catch (e) {}
    return null;
  }

  function save(config) {
    try {
      localStorage.setItem(LinkHive.STORE.CONFIG, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save config:', e);
    }
  }

  function exists() {
    return !!localStorage.getItem(LinkHive.STORE.CONFIG);
  }

  function remove() {
    localStorage.removeItem(LinkHive.STORE.CONFIG);
  }

  function loadServerConfig(callback) {
    fetch('config.json?t=' + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then(function (serverCfg) {
        callback(serverCfg || null);
      })
      .catch(function () {
        callback(null);
      });
  }

  return {
    get: get,
    save: save,
    exists: exists,
    remove: remove,
    loadServerConfig: loadServerConfig
  };

})();
