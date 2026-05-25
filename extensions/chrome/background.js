chrome.runtime.onInstalled.addListener(function () {
  updateIcon();
});

try {
  self.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    updateIcon(e.matches);
  });
} catch (e) {}

function updateIcon(isDark) {
  if (typeof isDark === 'undefined') {
    try { isDark = self.matchMedia && self.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { isDark = false; }
  }
  var base = isDark ? 'icons/icon-' : 'icons/icon-';
  var suffix = isDark ? '-dark.png' : '.png';
  chrome.action.setIcon({
    path: {
      16: base + '16' + suffix,
      48: base + '48' + suffix,
      128: base + '128' + suffix
    }
  });
}
