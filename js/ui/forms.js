window.LinkHive = window.LinkHive || {};

LinkHive.Forms = (function () {

  function parseUrl(url) {
    if (!url) return Promise.resolve(null);
    var cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }
    try { new URL(cleanUrl); } catch (e) { return Promise.resolve(null); }

    var domain = LinkHive.getDomain(cleanUrl);
    var faviconUrl = '';

    return fetchViaProxy(cleanUrl).then(function (html) {
      if (!html) {
        faviconUrl = cleanUrl.replace(/\/$/, '') + '/favicon.ico';
        return {
          url: cleanUrl,
          domain: domain,
          title: domain,
          description: '',
          favicon: faviconUrl
        };
      }

      var title = extractMeta(html, 'og:title') ||
                  extractMeta(html, 'twitter:title') ||
                  extractTitle(html) ||
                  domain;

      var description = extractMeta(html, 'og:description') ||
                        extractMeta(html, 'twitter:description') ||
                        extractMeta(html, 'description') ||
                        '';

      var pageFavicon = extractFavicon(html, cleanUrl);
      if (pageFavicon) {
        faviconUrl = pageFavicon;
      }

      return {
        url: cleanUrl,
        domain: domain,
        title: title,
        description: description,
        favicon: faviconUrl
      };
    }).catch(function () {
      return {
        url: cleanUrl,
        domain: domain,
        title: domain,
        description: '',
        favicon: ''
      };
    });
  }

  function fetchViaProxy(url) {
    function fetchWithTimeout(u, ms) {
      return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () { reject(new Error('timeout')); }, ms);
        fetch(u, { headers: { 'Accept': 'text/html' } })
          .then(function (res) {
            clearTimeout(timer);
            if (res.ok) return res.text();
            throw new Error('bad status');
          })
          .then(resolve, reject);
      });
    }

    var encoded = encodeURIComponent(url);

    function tryAllOriginsGet() {
      return fetchWithTimeout('https://api.allorigins.win/get?url=' + encoded, 2500).then(function (raw) {
        try { var j = JSON.parse(raw); return j.contents || ''; } catch (e) { return ''; }
      });
    }

    function tryCodetabs() {
      return fetchWithTimeout('https://api.codetabs.com/v1/proxy?quest=' + encoded, 2500);
    }

    return tryAllOriginsGet().catch(tryCodetabs).catch(function () {
      return null;
    });
  }

  function decodeEntities(str) {
    return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013').replace(/&#(\d+);/g, function (m, d) { return String.fromCharCode(d); });
  }

  function extractTitle(html) {
    var match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!match) return '';
    var title = decodeEntities(match[1]).trim();
    if (title.length > 200) title = title.slice(0, 200);
    return title;
  }

  function extractMeta(html, name) {
    var regex1 = new RegExp('<meta[^>]+property=["\']' + name + '["\'][^>]+content=["\']([^"\']+)["\']', 'i');
    var regex2 = new RegExp('<meta[^>]+name=["\']' + name + '["\'][^>]+content=["\']([^"\']+)["\']', 'i');
    var regex3 = new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']' + name + '["\']', 'i');
    var regex4 = new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']' + name + '["\']', 'i');

    var match = html.match(regex1) || html.match(regex2) || html.match(regex3) || html.match(regex4);
    return match ? decodeEntities(match[1]).trim() : '';
  }

  function extractFavicon(html, baseUrl) {
    var match = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"\']+)["']/i) ||
                html.match(/<link[^>]+href=["']([^"\']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i);
    if (match) {
      var href = match[1].trim();
      try {
        return new URL(href, baseUrl).href;
      } catch (e) {
        return '';
      }
    }
    return '';
  }

  function isValidUrl(str) {
    if (!str) return false;
    if (!/^https?:\/\//i.test(str)) {
      str = 'https://' + str;
    }
    try {
      var url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  function normalizeUrl(str) {
    str = str.trim();
    if (!/^https?:\/\//i.test(str)) {
      str = 'https://' + str;
    }
    try {
      var url = new URL(str);
      if (url.pathname === '/' && !str.endsWith('/')) {
        return url.origin;
      }
      return url.href;
    } catch (e) { return str; }
  }

  return {
    parseUrl: parseUrl,
    isValidUrl: isValidUrl,
    normalizeUrl: normalizeUrl
  };

})();
