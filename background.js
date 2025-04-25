// Listen for extension installation
chrome.runtime.onInstalled.addListener(function() {
  console.log('Web2Markdown extension installed');
});

// Clear previously stored Markdown content
chrome.storage.local.remove('markdownContent', function() {
  console.log('Previous Markdown content cleared');
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'convertToMarkdown') {
    console.log('Received conversion request');
    sendResponse({status: 'success'});
  }
}); 