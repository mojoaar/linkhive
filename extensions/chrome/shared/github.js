var LinkHiveExt = LinkHiveExt || {};

LinkHiveExt.GITHUB_API = 'https://api.github.com';

LinkHiveExt.fetchCollections = function (token, owner, repo, branch) {
  return LinkHiveExt._getFile(token, owner, repo, branch, 'data/collections.json').then(function (data) {
    return data ? data.content : [];
  }).catch(function () {
    return [];
  }).then(function (cols) {
    if (cols && cols.length > 0) return cols;
    return LinkHiveExt._getFile(token, owner, repo, branch, 'profiles/default/collections.json').then(function (data) {
      return data ? data.content : [];
    });
  });
};

LinkHiveExt.fetchLinks = function (token, owner, repo, branch) {
  return LinkHiveExt._getFile(token, owner, repo, branch, 'data/index.json').then(function (index) {
    if (!index || !index.content || !index.content.chunks) return [];
    var promises = [];
    for (var i = 0; i < index.content.chunks; i++) {
      promises.push(LinkHiveExt._getFile(token, owner, repo, branch, 'data/links-' + i + '.json'));
    }
    return Promise.all(promises).then(function (chunks) {
      var links = [];
      chunks.forEach(function (c) { if (c) links = links.concat(c.content); });
      return links;
    });
  }).catch(function () { return []; });
};

LinkHiveExt.addLink = function (token, owner, repo, branch, link, collections) {
  return LinkHiveExt._getFile(token, owner, repo, branch, 'data/index.json').catch(function () {
    return null;
  }).then(function (index) {
    var chunks = index && index.content ? index.content.chunks : 0;
    var total = index && index.content ? index.content.total : 0;
    var indexSha = index ? index.sha : undefined;
    var chunkIdx = Math.floor(total / 250);
    if (chunkIdx >= chunks) {
      return LinkHiveExt._putFile(token, owner, repo, branch, 'data/links-' + chunkIdx + '.json', [link], undefined).then(function () {
        var newIndex = { chunks: chunks + 1, total: total + 1, exportedAt: new Date().toISOString() };
        return LinkHiveExt._putFile(token, owner, repo, branch, 'data/index.json', newIndex, indexSha);
      });
    } else {
      return LinkHiveExt._getFile(token, owner, repo, branch, 'data/links-' + chunkIdx + '.json').then(function (existing) {
        var links = existing && existing.content ? existing.content : [];
        links.push(link);
        return LinkHiveExt._putFile(token, owner, repo, branch, 'data/links-' + chunkIdx + '.json', links, existing ? existing.sha : undefined).then(function () {
          var newIndex = { chunks: chunks, total: total + 1, exportedAt: new Date().toISOString() };
          return LinkHiveExt._putFile(token, owner, repo, branch, 'data/index.json', newIndex, indexSha);
        });
      });
    }
  });
};

LinkHiveExt.updateLink = function (token, owner, repo, branch, url, updates) {
  return LinkHiveExt._getFile(token, owner, repo, branch, 'data/index.json').then(function (index) {
    if (!index || !index.content || !index.content.chunks) throw new Error('No data found');
    var chunkPromises = [];
    for (var i = 0; i < index.content.chunks; i++) {
      chunkPromises.push(LinkHiveExt._getFile(token, owner, repo, branch, 'data/links-' + i + '.json'));
    }
    return Promise.all(chunkPromises).then(function (chunks) {
      for (var c = 0; c < chunks.length; c++) {
        var chunk = chunks[c];
        if (!chunk || !chunk.content) continue;
        for (var l = 0; l < chunk.content.length; l++) {
          var existing = chunk.content[l];
          if (existing.url && existing.url.replace(/\/$/, '').toLowerCase() === url.replace(/\/$/, '').toLowerCase()) {
            for (var key in updates) { existing[key] = updates[key]; }
            existing.updatedAt = new Date().toISOString();
            return LinkHiveExt._putFile(token, owner, repo, branch, 'data/links-' + c + '.json', chunk.content, chunk.sha);
          }
        }
      }
      throw new Error('Link not found');
    });
  });
};

LinkHiveExt._apiUrl = function (owner, repo, path) {
  return LinkHiveExt.GITHUB_API + '/repos/' + owner + '/' + repo + '/contents/' + path;
};

LinkHiveExt._getFile = function (token, owner, repo, branch, path) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', LinkHiveExt._apiUrl(owner, repo, path) + '?ref=' + branch, true);
    xhr.setRequestHeader('Authorization', 'token ' + token);
    xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
    xhr.timeout = 30000;
    xhr.ontimeout = function () { reject(new Error('Request timed out')); };
    xhr.onload = function () {
      if (xhr.status === 404) { resolve(null); return; }
      if (xhr.status !== 200) { reject(new Error('GitHub API error: ' + xhr.status)); return; }
      try {
        var data = JSON.parse(xhr.responseText);
        resolve({ path: data.path, sha: data.sha, content: JSON.parse(atob(data.content.replace(/\s/g, ''))) });
      } catch (e) { reject(e); }
    };
    xhr.onerror = function () { reject(new Error('Network error')); };
    xhr.send();
  });
};

LinkHiveExt._putFile = function (token, owner, repo, branch, path, content, sha) {
  var jsonStr = JSON.stringify(content);
  var bytes = [];
  for (var i = 0; i < jsonStr.length; i++) {
    var c = jsonStr.charCodeAt(i);
    if (c < 128) { bytes.push(c); }
    else if (c < 2048) { bytes.push(192 | (c >> 6)); bytes.push(128 | (c & 63)); }
    else { bytes.push(224 | (c >> 12)); bytes.push(128 | ((c >> 6) & 63)); bytes.push(128 | (c & 63)); }
  }
  var binary = '';
  var chunk = 8192;
  for (var j = 0; j < bytes.length; j += chunk) {
    binary += String.fromCharCode.apply(null, bytes.slice(j, j + chunk));
  }
  var body = { message: 'Update ' + path, content: btoa(binary), branch: branch };
  if (sha) body.sha = sha;
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', LinkHiveExt._apiUrl(owner, repo, path), true);
    xhr.setRequestHeader('Authorization', 'token ' + token);
    xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 30000;
    xhr.ontimeout = function () { reject(new Error('Request timed out')); };
    xhr.onload = function () {
      if (xhr.status !== 200 && xhr.status !== 201) { reject(new Error('GitHub API error: ' + xhr.status)); return; }
      try { resolve(JSON.parse(xhr.responseText)); } catch (e) { reject(e); }
    };
    xhr.onerror = function () { reject(new Error('Network error')); };
    xhr.send(JSON.stringify(body));
  });
};
