chrome.runtime.onInstalled.addListener(function () {
  chrome.action.setIcon({ path: { 16: 'icons/icon-16.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' } });
});
