window.LinkHive = window.LinkHive || {};

LinkHive.Modals = (function () {

  var DOM = {};

  var _deadCheckRunning = false;
  var _deadCheckCancelled = false;

  function init(dom) {
    DOM = dom;
    bindSettingsEvents();
  }

  function show(el) {
    el.classList.remove('hidden');
    document.body.classList.add('modal-open');
    window.refreshIcons(el);
  }

  function hide(el) {
    el.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }

  function showSettings() {
    var config = LinkHive.Config.get();
    if (!config) return;
    if (!DOM.settingsName) return;

    DOM.settingsName.value = config.name || '';
    DOM.settingsTheme.value = config.theme || 'catppuccin';

    var storageRadio = config.storage === 'github' ?
      DOM.settingsStorageType.querySelector('input[value="github"]') :
      DOM.settingsStorageType.querySelector('input[value="local"]');
    if (storageRadio) storageRadio.checked = true;

    DOM.settingsGithubToken.value = config.githubToken || '';
    DOM.settingsGithubRepo.value = config.githubRepo || '';
    DOM.settingsGithubBranch.value = config.githubBranch || 'main';

    var av = config.avatar || {};
    var typeRadios = document.getElementsByName('avatarType');
    if (typeRadios.length) {
      typeRadios.forEach(function (r) { r.checked = r.value === (av.type || 'upload'); });
    }
    DOM.settingsAvatarUrl.value = av.url || '';
    DOM.avatarUploadName.textContent = av.dataUrl ? 'Image uploaded' : '';

    var isInitials = (av.type || 'initials') === 'initials';
    var isUpload = (av.type || 'initials') === 'upload';
    var isUrl = (av.type || 'initials') === 'url';

    if (DOM.avatarColors) {
      DOM.avatarColors.classList.toggle('hidden', !isInitials);
      DOM.avatarColors.querySelectorAll('.avatar-color-btn').forEach(function (b) {
        b.classList.toggle('active', b.dataset.color === (av.color || '#89b4fa'));
      });
    }
    DOM.avatarUploadRow.classList.toggle('hidden', !isUpload);
    DOM.settingsAvatarUrl.classList.toggle('hidden', !isUrl);

    toggleGithubSettings(config.storage === 'github');
    if (DOM.settingsAvatarSection) {
      DOM.settingsAvatarSection.classList.toggle('hidden', config.storage === 'github' && !!config.githubUser);
    }
    if (DOM.settingsNameSection) {
      DOM.settingsNameSection.classList.toggle('hidden', config.storage === 'github' && !!config.githubUser);
    }

    if (config._serverManaged) {
      DOM.settingsGithubToken.disabled = true;
      DOM.settingsGithubRepo.disabled = true;
      DOM.settingsGithubBranch.disabled = true;
      DOM.settingsStorageType.querySelectorAll('input').forEach(function (r) { r.disabled = true; });
      toggleServerHint('serverTokenHint', true);
      toggleServerHint('serverRepoHint', true);
      toggleServerHint('serverBranchHint', true);
    } else {
      DOM.settingsGithubToken.disabled = false;
      DOM.settingsGithubRepo.disabled = false;
      DOM.settingsGithubBranch.disabled = false;
      DOM.settingsStorageType.querySelectorAll('input').forEach(function (r) { r.disabled = false; });
      toggleServerHint('serverTokenHint', false);
      toggleServerHint('serverRepoHint', false);
      toggleServerHint('serverBranchHint', false);
    }

    DOM.settingsVersion.textContent = 'v' + LinkHive.VERSION;
    var authorEl = document.getElementById('settingsAuthor');
    if (authorEl && config.author) authorEl.textContent = config.author;
    updateSyncStatus();
    resetWipeConfirm();
    DOM.githubStatus.textContent = '';
    DOM.githubStatus.className = 'github-status';

    if (!_deadCheckRunning) {
      DOM.deadLinkStatus.textContent = '';
      DOM.settingsCancelDeadLinksBtn.style.display = 'none';
      DOM.settingsCheckDeadLinksBtn.disabled = false;
    }

    show(DOM.settingsModal);
  }

  function hideSettings() {
    hide(DOM.settingsModal);
    saveSettingsFromModal();
    resetWipeConfirm();
    if (LinkHive.Sidebar) LinkHive.Sidebar.update();
    if (LinkHive.LinkGrid) LinkHive.LinkGrid.render();
  }

  function toggleGithubSettings(show) {
    DOM.settingsGithub.classList.toggle('hidden', !show);
  }

  function toggleServerHint(id, show) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !show);
  }

  function updateSyncStatus() {
    if (!DOM.syncStatus) return;
    var config = LinkHive.Config.get();
    if (config && config.storage === 'github' && config.githubToken && config.githubRepo) {
      DOM.syncStatus.textContent = 'GitHub sync enabled — ' + config.githubRepo;
      if (DOM.settingsSyncActions) DOM.settingsSyncActions.classList.remove('hidden');
    } else {
      DOM.syncStatus.textContent = 'Local storage only';
      if (DOM.settingsSyncActions) DOM.settingsSyncActions.classList.add('hidden');
    }
  }

  function saveSettingsFromModal() {
    var config = LinkHive.Config.get();
    if (!config) return;

    config.name = DOM.settingsName.value.trim() || config.name;

    var storageInput = DOM.settingsStorageType.querySelector('input[name="settingsStorage"]:checked');
    if (storageInput) config.storage = storageInput.value;

    config.githubToken = DOM.settingsGithubToken.value.trim();
    config.githubRepo = DOM.settingsGithubRepo.value.trim();
    config.githubBranch = DOM.settingsGithubBranch.value.trim() || 'main';

    config.theme = DOM.settingsTheme.value;

    config.avatar = config.avatar || {};
    var avatarTypeRadio = document.querySelector('input[name="avatarType"]:checked');
    if (avatarTypeRadio) config.avatar.type = avatarTypeRadio.value;
    config.avatar.url = DOM.settingsAvatarUrl.value.trim();

    var activeColor = DOM.avatarColors.querySelector('.avatar-color-btn.active');
    if (activeColor) config.avatar.color = activeColor.dataset.color;

    LinkHive.Config.save(config);
    LinkHive.Themes.apply(config.theme, config.mode);

    if (DOM.settingsTheme) DOM.settingsTheme.value = config.theme;
  }

  function resetWipeConfirm() {
    DOM.settingsWipeBtn.classList.remove('hidden');
    DOM.settingsWipeConfirm.classList.add('hidden');
    DOM.settingsWipeInput.value = '';
    DOM.settingsWipeConfirmBtn.disabled = true;
  }

  function showConfirm(title, message, onConfirm) {
    DOM.confirmTitle.textContent = title || 'Are you sure?';
    DOM.confirmMessage.textContent = message || 'This action cannot be undone.';
    DOM.confirmYes.onclick = function () {
      hide(DOM.confirmModal);
      if (onConfirm) onConfirm();
    };
    show(DOM.confirmModal);
  }

  function showLinkModal(editLink) {
    var collections = LinkHive.LinkStore.getCollections();
    var options = '<option value="">No collection</option>' + collections.map(function (c) {
      return '<option value="' + c.id + '">' + LinkHive.escapeHtml(c.name) + '</option>';
    }).join('');

    DOM.linkCollection.innerHTML = options;
    DOM.linkUrl.value = '';
    DOM.linkTitle.value = '';
    DOM.linkDesc.value = '';
    DOM.linkEditId.value = '';
    DOM.linkUrlError.classList.add('hidden');
    DOM.urlPreview.classList.add('hidden');
    DOM.linkUrl.classList.remove('error');
    clearTags();

    if (editLink) {
      DOM.linkModalTitle.textContent = 'Edit Link';
      DOM.linkUrl.value = editLink.url || '';
      DOM.linkTitle.value = editLink.title || '';
      DOM.linkDesc.value = editLink.description || '';
      DOM.linkEditId.value = editLink.id;
      DOM.linkCollection.value = editLink.collectionId || '';
      if (editLink.tags) {
        editLink.tags.forEach(function (t) { addTagChip(t); });
      }
      showUrlPreview(editLink);
    } else {
      DOM.linkModalTitle.textContent = 'Add Link';
      var activeCol = getActiveCollectionId();
      if (activeCol) DOM.linkCollection.value = activeCol;
    }

    show(DOM.linkModal);
    setTimeout(function () { DOM.linkUrl.focus(); }, 200);
  }

  function hideLinkModal() {
    hide(DOM.linkModal);
    clearTags();
    DOM.linkEditId.value = '';
  }

  function showUrlPreview(data) {
    if (!data || !data.url) return;
    DOM.urlPreview.classList.remove('hidden');
    DOM.urlPreviewTitle.textContent = data.title || '';
    DOM.urlPreviewDomain.textContent = data.domain || '';
    DOM.urlPreviewDesc.textContent = data.description || '';
  }

  function clearTags() {
    DOM.linkTagTags.innerHTML = '';
    DOM.linkTagInput.value = '';
  }

  function addTagChip(tag) {
    var chip = document.createElement('span');
    chip.className = 'tag';
    chip.textContent = tag;
    var remove = document.createElement('span');
    remove.className = 'tag-remove';
    remove.innerHTML = '&times;';
    remove.addEventListener('click', function () {
      chip.remove();
    });
    chip.appendChild(remove);
    DOM.linkTagTags.appendChild(chip);
  }

  function getTags() {
    return Array.from(DOM.linkTagTags.querySelectorAll('.tag')).map(function (t) {
      return t.firstChild.textContent.trim();
    }).filter(Boolean);
  }

  function getActiveCollectionId() {
    var hash = location.hash;
    var match = hash.match(/^#\/c\/(.+)/);
    if (match) {
      var col = LinkHive.LinkStore.getCollectionBySlug(match[1]);
      if (col) return col.id;
    }
    return '';
  }

  function showCollectionModal(editCollection) {
    DOM.collectionEditId.value = '';
    DOM.collectionName.value = '';
    DOM.collectionNameError.classList.add('hidden');
    DOM.collectionName.classList.remove('error');
    DOM.collectionIconSearch.value = '';

    renderIconGrid();
    renderColorGrid(editCollection ? editCollection.color : null);

    if (editCollection) {
      DOM.collectionModalTitle.textContent = 'Edit Collection';
      DOM.collectionEditId.value = editCollection.id;
      DOM.collectionName.value = editCollection.name || '';
      var iconBtn = DOM.collectionIconGrid.querySelector('[data-icon="' + (editCollection.icon || 'bookmark') + '"]');
      if (iconBtn) {
        DOM.collectionIconGrid.querySelectorAll('.collection-icon-btn').forEach(function (b) { b.classList.remove('active'); });
        iconBtn.classList.add('active');
      }
    } else {
      DOM.collectionModalTitle.textContent = 'New Collection';
      DOM.collectionEditId.value = '';
    }

    show(DOM.collectionModal);
    setTimeout(function () { DOM.collectionName.focus(); }, 200);
  }

  function renderIconGrid(filter) {
    var icons = LinkHive.COLLECTION_ICONS;
    var filtered = filter ? icons.filter(function (name) {
      return name.indexOf(filter.toLowerCase()) !== -1;
    }) : icons;

    DOM.collectionIconGrid.innerHTML = filtered.map(function (name) {
      return '<button class="collection-icon-btn" data-icon="' + name + '" title="' + name + '">' +
             '<i data-lucide="' + name + '"></i>' +
             '</button>';
    }).join('');

    if (filtered.length > 0 && !DOM.collectionIconGrid.querySelector('.active')) {
      DOM.collectionIconGrid.querySelector('.collection-icon-btn').classList.add('active');
    }
    window.refreshIcons(DOM.collectionIconGrid);
  }

  function renderColorGrid(selectedColor) {
    var colors = LinkHive.COLLECTION_COLORS;
    DOM.collectionColorGrid.innerHTML = colors.map(function (c) {
      return '<button class="collection-color-btn' + (c === selectedColor ? ' active' : '') + '" data-color="' + c + '" style="background:' + c + '"></button>';
    }).join('');
    if (!DOM.collectionColorGrid.querySelector('.active')) {
      var first = DOM.collectionColorGrid.querySelector('.collection-color-btn');
      if (first) first.classList.add('active');
    }
  }

  function hideCollectionModal() {
    hide(DOM.collectionModal);
    DOM.collectionEditId.value = '';
  }

  function parseCSV(text) {
    var rows = [];
    var row = [];
    var cell = '';
    var inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; }
          else { inQuotes = false; }
        } else { cell += c; }
      } else {
        if (c === '"') { inQuotes = true; }
        else if (c === ',') { row.push(cell.trim()); cell = ''; }
        else if (c === '\n' || c === '\r') {
          if (c === '\r' && text[i + 1] === '\n') i++;
          if (row.length > 0 || cell.trim() !== '') { row.push(cell.trim()); rows.push(row); row = []; cell = ''; }
        }
        else { cell += c; }
      }
    }
    row.push(cell.trim());
    if (row.length > 1 || row[0] !== '') rows.push(row);
    return rows;
  }

  function importRaindropCSV(text) {
    var rows = parseCSV(text);
    if (rows.length < 2) { LinkHive.Toast.show('CSV file is empty or invalid', 'error'); return; }

    var header = rows[0];
    var colIdx = {};
    for (var i = 0; i < header.length; i++) {
      colIdx[header[i].toLowerCase()] = i;
    }

    var urlIdx = colIdx['url'];
    var titleIdx = colIdx['title'];
    var descIdx = colIdx['excerpt'] !== undefined ? colIdx['excerpt'] : -1;
    var folderIdx = colIdx['folder'];
    var tagsIdx = colIdx['tags'];
    var coverIdx = colIdx['cover'] !== undefined ? colIdx['cover'] : -1;

    if (urlIdx === undefined) { LinkHive.Toast.show('CSV missing "url" column', 'error'); return; }

    LinkHive.Toast.show('Importing ' + (rows.length - 1) + ' links from Raindrop...', '');
    var toastEl = document.querySelector('.toast-container .toast');
    if (toastEl) toastEl.style.animation = 'none';

    var collectionMap = {};
    var collections = LinkHive.LinkStore.getCollections();
    collections.forEach(function (c) { collectionMap[c.name.toLowerCase()] = { coll: c }; });

    var newCollections = [];
    var links = [];
    var skipped = 0;
    var existingUrls = {};
    LinkHive.LinkStore.getLinks().forEach(function (l) { existingUrls[l.url] = true; });

    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var url = (row[urlIdx] || '').trim();
      if (!url || existingUrls[url]) { skipped++; continue; }
      existingUrls[url] = true;

      var folderName = folderIdx !== undefined ? (row[folderIdx] || '').trim() : '';

      var collId = '';
      var collSlug = '';
      if (folderName) {
        var key = folderName.toLowerCase();
        if (collectionMap[key] && collectionMap[key].coll) {
          collId = collectionMap[key].coll.id;
          collSlug = collectionMap[key].coll.slug;
        } else if (!collectionMap[key]) {
          collectionMap[key] = { pending: true };
          var nc = {
            id: LinkHive.generateId(),
            name: folderName,
            slug: LinkHive.slugify(folderName),
            icon: 'bookmark',
            color: LinkHive.COLLECTION_COLORS[newCollections.length % LinkHive.COLLECTION_COLORS.length],
            order: collections.length + newCollections.length,
            createdAt: new Date().toISOString()
          };
          newCollections.push(nc);
          collectionMap[key] = { coll: nc };
          collId = nc.id;
          collSlug = nc.slug;
        }
      }

      var tags = tagsIdx !== undefined && row[tagsIdx] ? row[tagsIdx].split(',').map(function (t) { return t.trim(); }).filter(Boolean) : [];

      links.push({
        id: LinkHive.generateId(),
        url: url,
        title: titleIdx !== undefined ? (row[titleIdx] || '').trim() : '',
        description: descIdx >= 0 ? (row[descIdx] || '').trim() : '',
        collectionId: collId,
        collectionSlug: collSlug,
        tags: tags,
        favicon: coverIdx >= 0 ? (row[coverIdx] || '').trim() : '',
        createdAt: (row[7] || new Date().toISOString()),
        updatedAt: new Date().toISOString(),
        isRead: false,
        order: 0
      });
    }

    var backend = new LinkHive.LocalBackend();

    Promise.resolve().then(function () {
      if (newCollections.length > 0) {
        var colTx = null;
        return backend._openDb().then(function (db) {
          return new Promise(function (resolve) {
            var tx = db.transaction('collections', 'readwrite');
            var store = tx.objectStore('collections');
            newCollections.forEach(function (c) { store.put(c); });
            tx.oncomplete = resolve;
          });
        });
      }
    }).then(function () {
      if (links.length === 0) return;
      return backend._openDb().then(function (db) {
        var batch = [];
        var batchSize = 200;
        function writeBatch(start) {
          return new Promise(function (resolve) {
            var tx = db.transaction('links', 'readwrite');
            var store = tx.objectStore('links');
            var end = Math.min(start + batchSize, links.length);
            for (var j = start; j < end; j++) { store.put(links[j]); }
            tx.oncomplete = function () {
              if (toastEl) toastEl.textContent = 'Importing... ' + end + '/' + links.length;
              if (end < links.length) { writeBatch(end).then(resolve); } else { resolve(); }
            };
          });
        }
        return writeBatch(0);
      });
    }).then(function () {
      return LinkHive.LinkStore.loadAll();
    }).then(function () {
      LinkHive.LinkGrid.render();
      LinkHive.Sidebar.update();
      var msg = 'Imported ' + links.length + ' links';
      if (newCollections.length > 0) msg += ' into ' + newCollections.length + ' new collection' + (newCollections.length !== 1 ? 's' : '');
      if (skipped > 0) msg += ' (' + skipped + ' duplicates skipped)';
      LinkHive.Toast.show(msg, 'success');
      LinkHive.Sync.autoSync();
    }).catch(function (err) {
      LinkHive.LinkGrid.render();
      LinkHive.Sidebar.update();
      LinkHive.Toast.show('Import error: ' + (err.message || 'unknown'), 'error');
    });
  }

  function getSelectedCollectionIcon() {
    var active = DOM.collectionIconGrid.querySelector('.collection-icon-btn.active');
    return active ? active.dataset.icon : 'bookmark';
  }

  function getSelectedCollectionColor() {
    var active = DOM.collectionColorGrid.querySelector('.collection-color-btn.active');
    return active ? active.dataset.color : LinkHive.COLLECTION_COLORS[0];
  }

  function checkDeadLinks() {
    if (_deadCheckRunning) return;
    _deadCheckRunning = true;
    _deadCheckCancelled = false;

    var BATCH_SIZE = 10;
    var TIMEOUT_MS = 5000;

    // Find existing Dead Links collection
    var collections = LinkHive.LinkStore.getCollections();
    var deadCol = collections.find(function (c) { return c.name === 'Dead Links'; });
    var deadColId = deadCol ? deadCol.id : null;

    // Exclude links already in Dead Links collection; skip non-HTTPS (mixed content false positives)
    var allLinks = LinkHive.LinkStore.getLinks();
    var linksToCheck = allLinks.filter(function (l) {
      return l.collectionId !== deadColId && l.url && l.url.indexOf('https://') === 0;
    });

    var total = linksToCheck.length;
    var checked = 0;
    var deadLinks = [];

    DOM.settingsCancelDeadLinksBtn.style.display = '';
    DOM.settingsCheckDeadLinksBtn.disabled = true;
    DOM.deadLinkStatus.textContent = 'Checking 0 / ' + total + '…';

    function checkOne(link) {
      return new Promise(function (resolve) {
        var controller = new AbortController();
        var timer = setTimeout(function () {
          controller.abort();
          resolve({ link: link, alive: true }); // timeout = assume alive (server slow, not gone)
        }, TIMEOUT_MS);

        fetch(link.url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal })
          .then(function () {
            clearTimeout(timer);
            resolve({ link: link, alive: true });
          })
          .catch(function (err) {
            clearTimeout(timer);
            // AbortError = our own timeout = treat as alive
            // TypeError = network failure = dead domain
            resolve({ link: link, alive: err && err.name === 'AbortError' });
          });
      });
    }

    function processBatch(batch) {
      return Promise.all(batch.map(checkOne)).then(function (results) {
        results.forEach(function (r) {
          checked++;
          if (!r.alive) deadLinks.push(r.link);
        });
        DOM.deadLinkStatus.textContent = 'Checking ' + checked + ' / ' + total + '…';
      });
    }

    // Split into batches
    var batches = [];
    for (var i = 0; i < linksToCheck.length; i += BATCH_SIZE) {
      batches.push(linksToCheck.slice(i, i + BATCH_SIZE));
    }

    function runBatches(idx) {
      if (_deadCheckCancelled || idx >= batches.length) return Promise.resolve();
      return processBatch(batches[idx]).then(function () { return runBatches(idx + 1); });
    }

    runBatches(0).then(function () {
      _deadCheckRunning = false;
      DOM.settingsCancelDeadLinksBtn.style.display = 'none';
      DOM.settingsCheckDeadLinksBtn.disabled = false;

      var wasCancelled = _deadCheckCancelled;
      _deadCheckCancelled = false;

      if (deadLinks.length === 0) {
        DOM.deadLinkStatus.textContent = wasCancelled
          ? 'Cancelled — no dead links found.'
          : 'All ' + checked + ' links alive.';
        return;
      }

      // Find or create Dead Links collection, then move dead links into it
      var cols = LinkHive.LinkStore.getCollections();
      var existing = cols.find(function (c) { return c.name === 'Dead Links'; });
      var colPromise = existing
        ? Promise.resolve(existing)
        : LinkHive.LinkStore.addCollection('Dead Links', 'skull', '#f38ba8');

      colPromise.then(function (col) {
        var updates = deadLinks.map(function (link) {
          return LinkHive.LinkStore.updateLink(link.id, {
            collectionId: col.id,
            deadFrom: link.collectionId || null
          });
        });
        return Promise.all(updates);
      }).then(function () {
        var n = deadLinks.length;
        var noun = n === 1 ? 'link' : 'links';
        DOM.deadLinkStatus.textContent = 'Found ' + n + ' dead ' + noun + (wasCancelled ? ' (partial scan)' : '') + ' — moved to Dead Links.';
        LinkHive.Toast.show('Moved ' + n + ' dead ' + noun + ' to Dead Links');
        LinkHive.Sync.autoSync();
      });
    });
  }

  function bindSettingsEvents() {
    DOM.settingsClose.addEventListener('click', hideSettings);
    DOM.settingsModal.addEventListener('click', function (e) {
      if (e.target === DOM.settingsModal) hideSettings();
    });

    var storageRadios = DOM.settingsStorageType.querySelectorAll('input[name="settingsStorage"]');
    storageRadios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        toggleGithubSettings(this.value === 'github');
      });
    });

    DOM.settingsValidateGithub.addEventListener('click', function () {
      var token = DOM.settingsGithubToken.value.trim();
      var repo = DOM.settingsGithubRepo.value.trim();
      if (!token) { DOM.githubStatus.textContent = 'Token required'; DOM.githubStatus.className = 'github-status error'; return; }
      DOM.githubStatus.textContent = 'Validating...';
      DOM.githubStatus.className = 'github-status';

      var client = new LinkHive.GitHubClient(token);
      client.validate().then(function (user) {
        DOM.githubStatus.textContent = 'Connected as ' + user.login;
        DOM.githubStatus.className = 'github-status success';
      }).catch(function () {
        DOM.githubStatus.textContent = 'Invalid token or network error';
        DOM.githubStatus.className = 'github-status error';
      });
    });

    DOM.settingsWipeBtn.addEventListener('click', function () {
      DOM.settingsWipeBtn.classList.add('hidden');
      DOM.settingsWipeConfirm.classList.remove('hidden');
      DOM.settingsWipeInput.focus();
    });

    DOM.settingsWipeInput.addEventListener('input', function () {
      DOM.settingsWipeConfirmBtn.disabled = DOM.settingsWipeInput.value !== 'DELETE';
    });

    DOM.settingsWipeConfirmBtn.addEventListener('click', function () {
      resetWipeConfirm();
      showConfirm(
        'Delete All Data',
        'This will permanently delete all links and collections for this profile. This cannot be undone.',
        function () {
          LinkHive.LinkStore.deleteAll().then(function () {
            return LinkHive.LinkStore.loadAll();
          }).then(function () {
            LinkHive.LinkGrid.render();
            LinkHive.Sidebar.update();
            hideSettings();
            LinkHive.Toast.show('All data deleted', 'success');
          }).catch(function () {
            LinkHive.Toast.show('Failed to delete data', 'error');
          });
        }
      );
    });

    DOM.settingsName.addEventListener('change', function () {
      var config = LinkHive.Config.get();
      if (config) { config.name = this.value.trim(); LinkHive.Config.save(config); LinkHive.Sidebar.update(); }
    });

    var avatarTypeRadios = document.getElementsByName('avatarType');
    avatarTypeRadios.forEach(function (r) {
      r.addEventListener('change', function () {
        var isInitials = this.value === 'initials';
        var isUpload = this.value === 'upload';
        var isUrl = this.value === 'url';
        if (DOM.avatarColors) DOM.avatarColors.classList.toggle('hidden', !isInitials);
        DOM.avatarUploadRow.classList.toggle('hidden', !isUpload);
        DOM.settingsAvatarUrl.classList.toggle('hidden', !isUrl);
      });
    });

    DOM.settingsAvatarUploadBtn.addEventListener('click', function () {
      DOM.settingsAvatarFile.click();
    });

    DOM.settingsAvatarFile.addEventListener('change', function () {
      var file = this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var config = LinkHive.Config.get();
        if (config) {
          config.avatar = config.avatar || {};
          config.avatar.dataUrl = reader.result;
          config.avatar.type = 'upload';
          LinkHive.Config.save(config);
          LinkHive.Sidebar.update();
        }
        DOM.avatarUploadName.textContent = file.name;
      };
      reader.readAsDataURL(file);
    });

    DOM.avatarColors.querySelectorAll('.avatar-color-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        DOM.avatarColors.querySelectorAll('.avatar-color-btn').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
      });
    });

    DOM.settingsAvatarUrl.addEventListener('change', function () {
      var config = LinkHive.Config.get();
      if (config) { config.avatar.url = this.value.trim(); LinkHive.Config.save(config); }
    });

    DOM.settingsExportBtn.addEventListener('click', function () {
      LinkHive.LinkStore.exportData().then(function (json) {
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'linkhive-export-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
        LinkHive.Toast.show('Data exported', 'success');
      });
    });

    DOM.settingsImportBtn.addEventListener('click', function () {
      DOM.settingsImportFile._mode = 'json';
      DOM.settingsImportFile.accept = '.json';
      DOM.settingsImportFile.click();
    });

    DOM.settingsImportFile.addEventListener('change', function () {
      var file = this.files[0];
      if (!file) return;
      var mode = this._mode || (file.name.endsWith('.csv') ? 'raindrop' : 'json');
      delete this._mode;
      this.accept = '.json,.csv';

      var reader = new FileReader();
      reader.onload = function () {
        if (mode === 'raindrop') {
          importRaindropCSV(reader.result);
        } else {
          LinkHive.LinkStore.importData(reader.result).then(function () {
            LinkHive.LinkGrid.render();
            LinkHive.Sidebar.update();
            LinkHive.Toast.show('Data imported successfully', 'success');
            LinkHive.Sync.autoSync();
          }).catch(function (err) {
            LinkHive.Toast.show('Import failed: ' + err.message, 'error');
          });
        }
      };
      reader.readAsText(file);
      this.value = '';
    });

    DOM.settingsImportRaindropBtn.addEventListener('click', function () {
      DOM.settingsImportFile._mode = 'raindrop';
      DOM.settingsImportFile.accept = '.csv';
      DOM.settingsImportFile.click();
    });

    DOM.settingsPushBtn.addEventListener('click', function () {
      LinkHive.Sync.pushToGithub().then(function () {
        updateSyncStatus();
      });
    });

    DOM.settingsPullBtn.addEventListener('click', function () {
      LinkHive.Sync.pullFromGithub().then(function () {
        updateSyncStatus();
      });
    });

    DOM.linkModal.addEventListener('click', function (e) {
      if (e.target === DOM.linkModal) hideLinkModal();
    });
    DOM.linkModalClose.addEventListener('click', hideLinkModal);
    DOM.linkModalCancel.addEventListener('click', hideLinkModal);

    DOM.linkModalSave.addEventListener('click', function () {
      var url = LinkHive.Forms.normalizeUrl(DOM.linkUrl.value);
      if (!LinkHive.Forms.isValidUrl(url)) {
        DOM.linkUrlError.classList.remove('hidden');
        DOM.linkUrl.classList.add('error');
        return;
      }
      DOM.linkUrlError.classList.add('hidden');
      DOM.linkUrl.classList.remove('error');

      var title = DOM.linkTitle.value.trim();
      var desc = DOM.linkDesc.value.trim();
      var collectionId = DOM.linkCollection.value;
      var tags = getTags();
      var editId = DOM.linkEditId.value;

      if (editId) {
        LinkHive.LinkStore.updateLink(editId, { url: url, title: title, description: desc, collectionId: collectionId, tags: tags, favicon: '' }).then(function () {
          LinkHive.LinkGrid.render();
          hideLinkModal();
          LinkHive.Toast.show('Link updated', 'success');
          LinkHive.Sync.autoSync();
        });
      } else {
        LinkHive.LinkStore.addLink(url, title, desc, collectionId, tags, '').then(function () {
          LinkHive.LinkGrid.render();
          hideLinkModal();
          LinkHive.Toast.show('Link saved', 'success');
          LinkHive.Sync.autoSync();
        });
      }
    });

    DOM.linkUrl.addEventListener('blur', function () {
      var rawUrl = DOM.linkUrl.value.trim();
      if (rawUrl && LinkHive.Forms.isValidUrl(rawUrl)) {
        DOM.linkUrlError.classList.add('hidden');
        DOM.linkUrl.classList.remove('error');
        if (!DOM.linkEditId.value) {
          var url = LinkHive.Forms.normalizeUrl(rawUrl);
          var domain = LinkHive.getDomain(url);
          showUrlPreview({ url: url, domain: domain, title: domain, description: '' });
          LinkHive.Forms.parseUrl(url).then(function (data) {
            if (data) {
              showUrlPreview(data);
              DOM.linkTitle.value = data.title || '';
              DOM.linkDesc.value = data.description || '';
            }
          });
        }
      }
    });

    DOM.linkUrl.addEventListener('input', function () {
      if (DOM.urlPreview.classList.contains('hidden') && DOM.linkUrl.value.trim()) {
        DOM.linkUrlError.classList.add('hidden');
        DOM.linkUrl.classList.remove('error');
      }
    });

    DOM.linkTagInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        var tag = this.value.trim().replace(/,/g, '').toLowerCase();
        if (tag) {
          var existing = getTags().find(function (t) { return t === tag; });
          if (!existing) addTagChip(tag);
        }
        this.value = '';
      }
      if (e.key === 'Backspace' && this.value === '') {
        var chips = DOM.linkTagTags.querySelectorAll('.tag');
        if (chips.length > 0) chips[chips.length - 1].remove();
      }
    });

    DOM.linkTagWrapper.addEventListener('click', function () {
      DOM.linkTagInput.focus();
    });

    DOM.collectionModal.addEventListener('click', function (e) {
      if (e.target === DOM.collectionModal) hideCollectionModal();
    });
    DOM.collectionModalClose.addEventListener('click', hideCollectionModal);
    DOM.collectionModalCancel.addEventListener('click', hideCollectionModal);

    DOM.collectionModalSave.addEventListener('click', function () {
      var name = DOM.collectionName.value.trim();
      if (!name) {
        DOM.collectionNameError.classList.remove('hidden');
        DOM.collectionName.classList.add('error');
        return;
      }
      DOM.collectionNameError.classList.add('hidden');
      DOM.collectionName.classList.remove('error');

      var icon = getSelectedCollectionIcon();
      var color = getSelectedCollectionColor();
      var editId = DOM.collectionEditId.value;

      var promise;
      if (editId) {
        promise = LinkHive.LinkStore.updateCollection(editId, { name: name, icon: icon, color: color });
      } else {
        promise = LinkHive.LinkStore.addCollection(name, icon, color);
      }

      promise.then(function () {
        LinkHive.Sidebar.update();
        LinkHive.LinkGrid.render();
        hideCollectionModal();
        LinkHive.Toast.show(editId ? 'Collection updated' : 'Collection created', 'success');
        LinkHive.Sync.autoSync();
      }).catch(function (err) {
        LinkHive.Toast.show('Error: ' + err.message, 'error');
      });
    });

    DOM.collectionIconGrid.addEventListener('click', function (e) {
      var btn = e.target.closest('.collection-icon-btn');
      if (!btn) return;
      DOM.collectionIconGrid.querySelectorAll('.collection-icon-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });

    DOM.collectionIconSearch.addEventListener('input', LinkHive.debounce(function () {
      renderIconGrid(this.value.trim());
    }, 150));

    DOM.collectionColorGrid.addEventListener('click', function (e) {
      var btn = e.target.closest('.collection-color-btn');
      if (!btn) return;
      DOM.collectionColorGrid.querySelectorAll('.collection-color-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });

    DOM.confirmModal.addEventListener('click', function (e) {
      if (e.target === DOM.confirmModal) hide(DOM.confirmModal);
    });
    DOM.confirmCancel.addEventListener('click', function () { hide(DOM.confirmModal); });

    DOM.emptyAddBtn.addEventListener('click', function () {
      showLinkModal();
    });

    DOM.quickAddBtn.addEventListener('click', function () {
      showLinkModal();
    });

    DOM.bottomAddBtn.addEventListener('click', function () {
      showLinkModal();
    });

    DOM.addCollectionSidebar.addEventListener('click', function () {
      showCollectionModal();
    });

    DOM.settingsCheckDeadLinksBtn.addEventListener('click', function () {
      checkDeadLinks();
    });

    DOM.settingsCancelDeadLinksBtn.addEventListener('click', function () {
      _deadCheckCancelled = true;
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!DOM.settingsModal.classList.contains('hidden')) hideSettings();
        if (!DOM.linkModal.classList.contains('hidden')) hideLinkModal();
        if (!DOM.collectionModal.classList.contains('hidden')) hideCollectionModal();
        if (!DOM.confirmModal.classList.contains('hidden')) hide(DOM.confirmModal);
        if (DOM.sidebar && DOM.sidebar.classList.contains('open')) {
          LinkHive.Sidebar.close();
        }
      }
    });
  }

  return {
    init: init,
    showSettings: showSettings,
    hideSettings: hideSettings,
    showConfirm: showConfirm,
    showLinkModal: showLinkModal,
    hideLinkModal: hideLinkModal,
    showCollectionModal: showCollectionModal,
    hideCollectionModal: hideCollectionModal
  };

})();
