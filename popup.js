document.addEventListener('DOMContentLoaded', function() {
  const convertBtn = document.getElementById('convertBtn');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const statusDiv = document.getElementById('status');
  const markdownEditor = document.getElementById('markdownEditor');
  const preview = document.getElementById('preview');
  
  let markdownContent = '';

  // Initialize marked
  marked.setOptions({
    breaks: true,
    gfm: true
  });

  // Real-time preview
  markdownEditor.addEventListener('input', function() {
    const markdown = markdownEditor.value;
    preview.innerHTML = marked.parse(markdown);
  });

  // Automatically convert the current page when popup opens
  function autoConvert() {
    statusDiv.textContent = 'Converting...';
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        function: convertPageToMarkdown
      }, function(results) {
        if (chrome.runtime.lastError) {
          statusDiv.textContent = 'Conversion failed: ' + chrome.runtime.lastError.message;
          return;
        }
        
        if (results && results[0]) {
          markdownContent = results[0].result;
          chrome.storage.local.set({'markdownContent': markdownContent});
          markdownEditor.value = markdownContent;
          preview.innerHTML = marked.parse(markdownContent);
          statusDiv.textContent = 'Conversion successful!';
        }
      });
    });
  }

  // Convert button click event
  convertBtn.addEventListener('click', autoConvert);

  // Copy button click event
  copyBtn.addEventListener('click', function() {
    const content = markdownEditor.value;
    if (content) {
      navigator.clipboard.writeText(content)
        .then(() => {
          statusDiv.textContent = 'Copied to clipboard!';
        })
        .catch(err => {
          statusDiv.textContent = 'Copy failed: ' + err;
        });
    } else {
      statusDiv.textContent = 'Please convert a webpage first';
    }
  });

  // Download button click event
  downloadBtn.addEventListener('click', function() {
    const content = markdownEditor.value;
    if (content) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const pageUrl = tabs[0].url;
        const hostname = new URL(pageUrl).hostname;
        const fileName = hostname.replace(/\./g, '_') + '.md';
        
        const blob = new Blob([content], {type: 'text/markdown'});
        const downloadUrl = URL.createObjectURL(blob);
        
        chrome.downloads.download({
          url: downloadUrl,
          filename: fileName,
          saveAs: true
        }, function() {
          if (chrome.runtime.lastError) {
            statusDiv.textContent = 'Download failed: ' + chrome.runtime.lastError.message;
          } else {
            statusDiv.textContent = 'Download successful!';
          }
        });
      });
    } else {
      statusDiv.textContent = 'Please convert a webpage first';
    }
  });

  // Load the last content or auto convert
  chrome.storage.local.get('markdownContent', function(data) {
    if (data.markdownContent) {
      markdownEditor.value = data.markdownContent;
      preview.innerHTML = marked.parse(data.markdownContent);
    }
    
    // Auto convert when popup opens
    autoConvert();
  });
});

// Function to convert webpage to Markdown
function convertPageToMarkdown() {
  // Common advertisement keywords and patterns
  const adKeywords = [
    'advertisement', 'sponsored', 'promotion', 'ad-', 'ads-', 'advert', 'banner', 
    'promo', 'sponsor', 'publicity', 'affiliate', 'commercial'
  ];
  
  // Common ad-related class names, IDs, and attributes
  const adClassesAndIds = [
    'ad', 'ads', 'advertisement', 'advertising', 'sponsored', 'sponsor',
    'banner', 'promo', 'promotion', 'commercial', 'dfp', 'adsense', 'doubleclick',
    'taboola', 'outbrain', 'analytics', 'tracking', 'share', 'social',
    'related-posts', 'related-articles', 'recommended', 'popular', 'trending',
    'newsletter', 'subscribe', 'subscription', 'follow-us', 'like-us'
  ];
  
  // Social media related elements often used for sharing
  const socialMediaPatterns = [
    'share', 'follow', 'tweet', 'facebook', 'twitter', 'instagram', 'linkedin',
    'social', 'pinterest', 'reddit', 'whatsapp', 'telegram', 'comment'
  ];
  
  // Navigation and sidebar elements that aren't usually part of main content
  const navigationPatterns = [
    'nav', 'navigation', 'navbar', 'menu', 'header', 'footer', 'sidebar',
    'related', 'breadcrumb', 'pagination', 'pager', 'search'
  ];
  
  // Check if an element might be an advertisement based on content and attributes
  function isLikelyAd(element) {
    if (!element) return false;
    
    // Check element visibility
    if (element.offsetParent === null || 
        getComputedStyle(element).display === 'none' || 
        getComputedStyle(element).visibility === 'hidden') {
      return true;
    }
    
    // Check element dimensions - many ads are small or precisely sized
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return true;
    }
    
    // Analyze element content, attributes, classes, and IDs
    const elementText = element.textContent.toLowerCase();
    const elementHTML = element.outerHTML.toLowerCase();
    const classes = Array.from(element.classList).map(c => c.toLowerCase());
    const id = element.id.toLowerCase();
    
    // Check for iframe (common for ads)
    if (element.tagName === 'IFRAME') {
      return true;
    }
    
    // Check text content for ad keywords
    for (const keyword of adKeywords) {
      if (elementText.includes(keyword) || elementHTML.includes(keyword)) {
        return true;
      }
    }
    
    // Check class names and IDs for ad patterns
    for (const pattern of adClassesAndIds) {
      if (classes.some(cls => cls.includes(pattern)) || id.includes(pattern)) {
        return true;
      }
    }
    
    // Check for common ad attributes
    if (element.hasAttribute('data-ad') || 
        element.hasAttribute('data-ads') || 
        element.hasAttribute('data-advertisement') ||
        element.getAttribute('role') === 'banner') {
      return true;
    }
    
    // Check for social sharing elements
    for (const pattern of socialMediaPatterns) {
      if (classes.some(cls => cls.includes(pattern)) || id.includes(pattern)) {
        return true;
      }
    }
    
    // Check for navigation elements when not explicitly looking for them
    for (const pattern of navigationPatterns) {
      if ((classes.some(cls => cls.includes(pattern)) || id.includes(pattern)) &&
          !['main', 'article', 'section'].includes(element.tagName.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }
  
  // Function to extract main content element
  function getMainContentElement() {
    // Prioritized selectors for main content
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '#content',
      '.content',
      '.article',
      '.post',
      '.entry-content',
      '.post-content',
      '.main-content',
      '.article-content',
      '.story',
      '.story-content'
    ];
    
    // Try each selector in order
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element && element.offsetParent !== null) {
        return element;
      }
    }
    
    // If no specific content container found, use body
    return document.body;
  }

  function extractMetadata() {
    const title = document.title || '';
    const url = window.location.href;
    let author = '';
    let date = '';
    
    // Try to find author
    const authorSelectors = [
      'meta[name="author"]', 
      'meta[property="article:author"]',
      '.author',
      '.byline',
      '.article-author',
      '.post-author',
      '[rel="author"]'
    ];
    
    for (const selector of authorSelectors) {
      const authorElement = document.querySelector(selector);
      if (authorElement) {
        if (authorElement.tagName === 'META') {
          author = authorElement.getAttribute('content');
        } else {
          author = authorElement.textContent.trim();
        }
        if (author) break;
      }
    }
    
    // Try to find date
    const dateSelectors = [
      'meta[name="date"]', 
      'meta[property="article:published_time"]',
      'time',
      '.date',
      '.published',
      '.post-date',
      '.article-date',
      '.publication-date'
    ];
    
    for (const selector of dateSelectors) {
      const dateElement = document.querySelector(selector);
      if (dateElement) {
        if (dateElement.tagName === 'META') {
          date = dateElement.getAttribute('content');
        } else if (dateElement.hasAttribute('datetime')) {
          date = dateElement.getAttribute('datetime');
        } else {
          date = dateElement.textContent.trim();
        }
        if (date) break;
      }
    }
    
    return { title, url, author, date };
  }
  
  function getTextContent(element) {
    if (!element) return '';
    return element.textContent.trim();
  }
  
  function cleanText(text) {
    return text.replace(/\s+/g, ' ').trim();
  }
  
  function processContent() {
    // Get main content container
    const mainContent = getMainContentElement();
    
    // Process all elements in the main content
    const elements = Array.from(mainContent.querySelectorAll('*'));
    let markdown = '';
    const processedElements = new Set();
    const processedImages = new Set();
    
    // Process elements in order they appear in the document
    elements.forEach(element => {
      // Skip if already processed, not visible, or likely an ad
      if (processedElements.has(element) || 
          element.offsetParent === null || 
          getComputedStyle(element).display === 'none' ||
          isLikelyAd(element)) {
        return;
      }
      
      const tagName = element.tagName.toLowerCase();
      
      // Process headings
      if (/^h[1-6]$/.test(tagName)) {
        const level = parseInt(tagName.substring(1), 10);
        const text = cleanText(getTextContent(element));
        if (text && text !== document.title) { // Avoid duplicating title
          markdown += '#'.repeat(level) + ' ' + text + '\n\n';
        }
        processedElements.add(element);
      }
      
      // Process paragraphs
      else if (tagName === 'p') {
        const text = cleanText(getTextContent(element));
        if (text) {
          markdown += text + '\n\n';
        }
        
        // Process images within paragraphs
        element.querySelectorAll('img').forEach(img => {
          const src = img.src;
          const alt = img.alt || 'image';
          
          // Skip likely ad images
          if (src && 
              !processedImages.has(src) &&
              !isLikelyAd(img) &&
              !src.includes('pixel') &&
              !src.includes('tracking') &&
              !src.includes('analytics')) {
            markdown += `![${alt}](${src})\n\n`;
            processedImages.add(src);
          }
        });
        
        processedElements.add(element);
      }
      
      // Process standalone images (only if not ads)
      else if (tagName === 'img') {
        const src = element.src;
        const alt = element.alt || 'image';
        
        // Skip likely ad images
        if (src && 
            !processedImages.has(src) &&
            !isLikelyAd(element) &&
            !src.includes('pixel') &&
            !src.includes('tracking') &&
            !src.includes('analytics')) {
          markdown += `![${alt}](${src})\n\n`;
          processedImages.add(src);
        }
        processedElements.add(element);
      }
      
      // Process lists
      else if ((tagName === 'ul' || tagName === 'ol') && !isLikelyAd(element)) {
        const isOrdered = tagName === 'ol';
        const items = element.querySelectorAll('li');
        
        items.forEach((item, index) => {
          // Skip if the list item is likely an ad
          if (isLikelyAd(item)) return;
          
          const text = cleanText(getTextContent(item));
          if (text) {
            if (isOrdered) {
              markdown += `${index + 1}. ${text}\n`;
            } else {
              markdown += `* ${text}\n`;
            }
          }
          
          // Process images within list items
          item.querySelectorAll('img').forEach(img => {
            const src = img.src;
            const alt = img.alt || 'image';
            if (src && 
                !processedImages.has(src) && 
                !isLikelyAd(img) &&
                !src.includes('pixel') &&
                !src.includes('tracking') &&
                !src.includes('analytics')) {
              markdown += `  ![${alt}](${src})\n`;
              processedImages.add(src);
            }
          });
          
          processedElements.add(item);
        });
        
        markdown += '\n';
        processedElements.add(element);
      }
      
      // Process blockquotes
      else if (tagName === 'blockquote' && !isLikelyAd(element)) {
        const text = cleanText(getTextContent(element));
        if (text) {
          markdown += '> ' + text.replace(/\n/g, '\n> ') + '\n\n';
        }
        
        // Process images within blockquotes
        element.querySelectorAll('img').forEach(img => {
          const src = img.src;
          const alt = img.alt || 'image';
          if (src && 
              !processedImages.has(src) && 
              !isLikelyAd(img) &&
              !src.includes('pixel') &&
              !src.includes('tracking') &&
              !src.includes('analytics')) {
            markdown += `> ![${alt}](${src})\n\n`;
            processedImages.add(src);
          }
        });
        
        processedElements.add(element);
      }
      
      // Process code blocks
      else if ((tagName === 'pre' || tagName === 'code') && !isLikelyAd(element)) {
        const text = getTextContent(element);
        if (text) {
          markdown += '```\n' + text + '\n```\n\n';
        }
        processedElements.add(element);
      }
      
      // Process tables
      else if (tagName === 'table' && !isLikelyAd(element)) {
        const rows = element.querySelectorAll('tr');
        if (rows.length > 0) {
          // Process header
          const headerCells = rows[0].querySelectorAll('th, td');
          if (headerCells.length > 0) {
            let headers = [];
            let separator = [];
            
            headerCells.forEach(cell => {
              const text = cleanText(getTextContent(cell));
              headers.push(text || ' ');
              separator.push('---');
            });
            
            markdown += '| ' + headers.join(' | ') + ' |\n';
            markdown += '| ' + separator.join(' | ') + ' |\n';
            
            // Process table content
            for (let i = 1; i < rows.length; i++) {
              const cells = rows[i].querySelectorAll('td');
              if (cells.length > 0) {
                let rowContent = [];
                cells.forEach(cell => {
                  const text = cleanText(getTextContent(cell));
                  rowContent.push(text || ' ');
                });
                
                markdown += '| ' + rowContent.join(' | ') + ' |\n';
              }
            }
            
            markdown += '\n';
          }
        }
        processedElements.add(element);
      }
    });
    
    return markdown;
  }
  
  function processLinks() {
    // Get main content container
    const mainContent = getMainContentElement();
    
    let markdownLinks = '';
    const links = mainContent.querySelectorAll('a');
    const processedLinks = new Set();
    
    links.forEach(link => {
      // Skip likely ads or social sharing links
      if (isLikelyAd(link)) return;
      
      const href = link.href;
      const text = cleanText(getTextContent(link));
      
      // Skip empty links, self-referential links, anchors, javascript links
      if (!href || 
          !text || 
          processedLinks.has(href) ||
          href === window.location.href ||
          href.startsWith('#') ||
          href.startsWith('javascript:') ||
          href.includes('facebook.com/sharer') ||
          href.includes('twitter.com/share') ||
          href.includes('pinterest.com/pin')) {
        return;
      }
      
      markdownLinks += `[${text}](${href})\n\n`;
      processedLinks.add(href);
    });
    
    return markdownLinks;
  }
  
  // Extract metadata
  const metadata = extractMetadata();
  
  // Build Markdown content
  let markdown = `# ${metadata.title}\n\n`;
  
  if (metadata.author) {
    markdown += `Author: ${metadata.author}\n\n`;
  }
  
  if (metadata.date) {
    markdown += `Date: ${metadata.date}\n\n`;
  }
  
  markdown += `---\n\n`;
  
  // Process content preserving the original layout
  markdown += processContent();
  
  // Add remaining unprocessed links in a separate section
  const links = processLinks();
  if (links) {
    markdown += `## Links\n\n`;
    markdown += links;
  }

  // Add source link at the end
  if (metadata.url) {
    markdown += `\n---\n\nSource: ${metadata.url}\n`;
  }
  
  return markdown;
} 