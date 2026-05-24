window.LinkHive = window.LinkHive || {};

var _$ = function (selector, context) {
  return (context || document).querySelector(selector);
};

var _$$ = function (selector, context) {
  return Array.from((context || document).querySelectorAll(selector));
};

LinkHive.$ = _$;
LinkHive.$$ = _$$;

LinkHive.createElement = function (tag, attrs, children) {
  var el = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach(function (key) {
      if (key === 'className') {
        el.className = attrs[key];
      } else if (key === 'style' && typeof attrs[key] === 'object') {
        Object.keys(attrs[key]).forEach(function (prop) {
          el.style[prop] = attrs[key][prop];
        });
      } else if (key === 'dataset') {
        Object.keys(attrs[key]).forEach(function (k) {
          el.dataset[k] = attrs[key][k];
        });
      } else if (key.startsWith('on')) {
        el.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
      } else if (key === 'html') {
        el.innerHTML = attrs[key];
      } else if (key === 'text') {
        el.textContent = attrs[key];
      } else {
        el.setAttribute(key, attrs[key]);
      }
    });
  }
  if (children) {
    if (Array.isArray(children)) {
      children.forEach(function (child) {
        if (child instanceof Node) {
          el.appendChild(child);
        } else if (typeof child === 'string') {
          el.appendChild(document.createTextNode(child));
        }
      });
    } else if (children instanceof Node) {
      el.appendChild(children);
    } else if (typeof children === 'string') {
      el.textContent = children;
    }
  }
  return el;
};

LinkHive.escapeHtml = function (str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

LinkHive.debounce = function (fn, delay) {
  var timer;
  return function () {
    var args = arguments;
    var ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
  };
};

LinkHive.formatDate = function (dateStr) {
  if (!dateStr) return '';
  var date = new Date(dateStr);
  var now = new Date();
  var diff = now - date;
  var secs = Math.floor(diff / 1000);
  var mins = Math.floor(secs / 60);
  var hours = Math.floor(mins / 60);
  var days = Math.floor(hours / 24);

  if (secs < 60) return 'Just now';
  if (mins < 60) return mins + 'm ago';
  if (hours < 24) return hours + 'h ago';
  if (days < 7) return days + 'd ago';
  if (days < 365) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

LinkHive.generateId = function () {
  return 'lh_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
};

LinkHive.slugify = function (str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
};

LinkHive.truncateUrl = function (url, max) {
  if (!url) return '';
  max = max || 40;
  var clean = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 3) + '...';
};

LinkHive.getDomain = function (url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (e) {
    return '';
  }
};

LinkHive.openLink = function (url) {
  window.open(url, '_blank', 'noopener,noreferrer');
};
