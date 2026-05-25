chrome.runtime.onInstalled.addListener(function () {
  console.log('LinkHive extension installed');
});

chrome.runtime.onMessage.addListener(function (request) {
  if (request.setIcon) {
    chrome.action.setIcon({ path: request.setIcon });
  }
});
