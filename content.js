// Listen for messages from background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getPageContent') {
    sendResponse({
      title: document.title,
      content: document.body.innerHTML
    });
  }
}); 