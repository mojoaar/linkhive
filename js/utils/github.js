window.LinkHive = window.LinkHive || {};

LinkHive.GitHubClient = (function () {

  function GitHubClient(token, owner, repo, branch) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.branch = branch || 'main';
  }

  GitHubClient.prototype._headers = function () {
    return {
      'Authorization': 'token ' + this.token,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  };

  GitHubClient.prototype._apiUrl = function (path) {
    return LinkHive.GITHUB_API + '/repos/' + this.owner + '/' + this.repo + '/contents/' + path;
  };

  GitHubClient.prototype.validate = function () {
    var self = this;
    return fetch(LinkHive.GITHUB_API + '/user', {
      headers: { 'Authorization': 'token ' + self.token, 'Accept': 'application/vnd.github.v3+json' }
    }).then(function (res) {
      if (!res.ok) throw new Error('Invalid token');
      return res.json();
    }).then(function (user) {
      self.username = user.login;
      return user;
    });
  };

  GitHubClient.prototype.getFile = function (path) {
    var self = this;
    return fetch(self._apiUrl(path) + '?ref=' + self.branch, {
      headers: self._headers()
    }).then(function (res) {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('GitHub API error: ' + res.status);
      return res.json();
    }).then(function (data) {
      if (!data) return null;
      if (Array.isArray(data)) {
        return Promise.all(data.map(function (item) {
          return self.getFile(path + '/' + item.name);
        }));
      }
      return {
        path: data.path,
        sha: data.sha,
        content: (function () {
          var raw = atob(data.content.replace(/\s/g, ''));
          var buf = new Uint8Array(raw.length);
          for (var i = 0; i < raw.length; i++) { buf[i] = raw.charCodeAt(i); }
          return JSON.parse(new TextDecoder().decode(buf));
        })()
      };
    });
  };

  GitHubClient.prototype.putFile = function (path, content, sha) {
    var self = this;
    var jsonStr = JSON.stringify(content);
    var enc = new TextEncoder();
    var bytes = enc.encode(jsonStr);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) { binary += String.fromCharCode(bytes[i]); }
    var body = { message: 'Update ' + path, content: btoa(binary), branch: self.branch };
    if (sha) body.sha = sha;

    return fetch(self._apiUrl(path), {
      method: 'PUT',
      headers: self._headers(),
      body: JSON.stringify(body)
    }).then(function (res) {
      if (res.status === 409 && sha) {
        return _retry409(path, body.content, body.branch, 4);
      }
      if (!res.ok) throw new Error('GitHub API error: ' + res.status);
      return res.json();
    });

    function _retry409(path, b64content, branch, remaining) {
      var delay = (5 - remaining) * 1000;
      return new Promise(function (resolveRetry) {
        setTimeout(function () {
          resolveRetry(self.getFile(path).then(function (fresh) {
            var retryBody = {
              message: 'Update ' + path,
              content: b64content,
              branch: branch
            };
            if (fresh) retryBody.sha = fresh.sha;
            return fetch(self._apiUrl(path), {
              method: 'PUT',
              headers: self._headers(),
              body: JSON.stringify(retryBody)
            }).then(function (r) {
              if ((r.status === 409 || r.status === 422) && remaining > 0) {
                return _retry409(path, b64content, branch, remaining - 1);
              }
              if (!r.ok) throw new Error('GitHub API error: ' + r.status);
              return r.json();
            });
          }).catch(function (e) {
            if (typeof e.message === 'string' && e.message.indexOf('404') !== -1) return;
            throw e;
          }));
        }, delay);
      });
    };

  };

  GitHubClient.prototype.deleteFile = function (path, sha) {
    var self = this;
    return fetch(self._apiUrl(path), {
      method: 'DELETE',
      headers: self._headers(),
      body: JSON.stringify({ message: 'Delete ' + path, sha: sha, branch: self.branch })
    }).then(function (res) {
      if (!res.ok) throw new Error('GitHub API error: ' + res.status);
      return res.json();
    });
  };

  return GitHubClient;

})();
