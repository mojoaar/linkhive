function setIcon(isDark) {
  chrome.action.setIcon({
    path: isDark
      ? { 16: 'icons/icon-16-dark.png', 48: 'icons/icon-48-dark.png', 128: 'icons/icon-128-dark.png' }
      : { 16: 'icons/icon-16.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' }
  });
}

function detectAndSetIcon() {
  try {
    var mq = self.matchMedia('(prefers-color-scheme: dark)');
    setIcon(mq.matches);
    mq.addEventListener('change', function (e) { setIcon(e.matches); });
  } catch (e) {
    setIcon(false);
  }
}

chrome.runtime.onInstalled.addListener(detectAndSetIcon);
detectAndSetIcon();
