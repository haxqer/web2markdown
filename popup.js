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
  function extractMetadata() {
    const title = document.title || '';
    const url = window.location.href;
    let author = '';
    let date = '';
    
    // Try to find author
    const authorMeta = document.querySelector('meta[name="author"], meta[property="article:author"]');
    if (authorMeta) {
      author = authorMeta.getAttribute('content');
    }
    
    // Try to find date
    const dateMeta = document.querySelector('meta[name="date"], meta[property="article:published_time"]');
    if (dateMeta) {
      date = dateMeta.getAttribute('content');
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
  
  function processHeadings(skipMainTitle) {
    let markdownHeadings = '';
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const processedHeadings = new Set();
    
    // Skip the main title if it's already included at the top
    if (skipMainTitle) {
      processedHeadings.add(skipMainTitle);
    }
    
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.substring(1), 10);
      const text = cleanText(getTextContent(heading));
      if (text && !processedHeadings.has(text)) {
        markdownHeadings += '#'.repeat(level) + ' ' + text + '\n\n';
        processedHeadings.add(text);
      }
    });
    
    return markdownHeadings;
  }
  
  function processParagraphs() {
    let markdownParagraphs = '';
    const paragraphs = document.querySelectorAll('p');
    
    paragraphs.forEach(paragraph => {
      const text = cleanText(getTextContent(paragraph));
      if (text) {
        markdownParagraphs += text + '\n\n';
      }
      
      // Process inline images within paragraphs to maintain layout
      const inlineImages = paragraph.querySelectorAll('img');
      if (inlineImages.length > 0) {
        inlineImages.forEach(img => {
          const src = img.src;
          const alt = img.alt || 'image';
          if (src) {
            markdownParagraphs += `![${alt}](${src})\n\n`;
          }
        });
      }
    });
    
    return markdownParagraphs;
  }
  
  function processLists() {
    let markdownLists = '';
    const lists = document.querySelectorAll('ul, ol');
    
    lists.forEach(list => {
      const isOrdered = list.tagName.toLowerCase() === 'ol';
      const items = list.querySelectorAll('li');
      
      items.forEach((item, index) => {
        const text = cleanText(getTextContent(item));
        if (text) {
          if (isOrdered) {
            markdownLists += `${index + 1}. ${text}\n`;
          } else {
            markdownLists += `* ${text}\n`;
          }
        }
        
        // Process inline images within list items
        const inlineImages = item.querySelectorAll('img');
        if (inlineImages.length > 0) {
          inlineImages.forEach(img => {
            const src = img.src;
            const alt = img.alt || 'image';
            if (src) {
              markdownLists += `  ![${alt}](${src})\n`;
            }
          });
        }
      });
      
      markdownLists += '\n';
    });
    
    return markdownLists;
  }
  
  function processImages() {
    // This function will now only process orphaned images (not within paragraphs or other elements)
    let markdownImages = '';
    const processedImages = new Set();
    
    // Keep track of images we've already processed
    document.querySelectorAll('p img, li img, a img, div > img').forEach(img => {
      processedImages.add(img.src);
    });
    
    // Process remaining images
    document.querySelectorAll('img').forEach(img => {
      const src = img.src;
      const alt = img.alt || 'image';
      
      if (src && !processedImages.has(src)) {
        markdownImages += `![${alt}](${src})\n\n`;
        processedImages.add(src);
      }
    });
    
    return markdownImages;
  }
  
  function processLinks() {
    let markdownLinks = '';
    const links = document.querySelectorAll('a');
    const processedLinks = new Set();
    
    links.forEach(link => {
      const href = link.href;
      const text = cleanText(getTextContent(link));
      
      if (href && text && !processedLinks.has(href)) {
        markdownLinks += `[${text}](${href})\n\n`;
        processedLinks.add(href);
      }
    });
    
    return markdownLinks;
  }
  
  function processBlockquotes() {
    let markdownBlockquotes = '';
    const blockquotes = document.querySelectorAll('blockquote');
    const processedQuotes = new Set();
    
    blockquotes.forEach(blockquote => {
      const text = cleanText(getTextContent(blockquote));
      if (text && !processedQuotes.has(text)) {
        markdownBlockquotes += '> ' + text.replace(/\n/g, '\n> ') + '\n\n';
        processedQuotes.add(text);
        
        // Process images within blockquotes
        const inlineImages = blockquote.querySelectorAll('img');
        if (inlineImages.length > 0) {
          inlineImages.forEach(img => {
            const src = img.src;
            const alt = img.alt || 'image';
            if (src) {
              markdownBlockquotes += `\n> ![${alt}](${src})\n\n`;
            }
          });
        }
      }
    });
    
    return markdownBlockquotes;
  }
  
  function processCodeBlocks() {
    let markdownCode = '';
    const codeBlocks = document.querySelectorAll('pre, code');
    const processedCode = new Set();
    
    codeBlocks.forEach(codeBlock => {
      const text = getTextContent(codeBlock);
      if (text && !processedCode.has(text)) {
        markdownCode += '```\n' + text + '\n```\n\n';
        processedCode.add(text);
      }
    });
    
    return markdownCode;
  }
  
  function processTables() {
    let markdownTables = '';
    const tables = document.querySelectorAll('table');
    
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      if (rows.length === 0) return;
      
      // Process header
      const headerCells = rows[0].querySelectorAll('th, td');
      if (headerCells.length === 0) return;
      
      let headers = [];
      let separator = [];
      
      headerCells.forEach(cell => {
        const text = cleanText(getTextContent(cell));
        headers.push(text || ' ');
        separator.push('---');
      });
      
      markdownTables += '| ' + headers.join(' | ') + ' |\n';
      markdownTables += '| ' + separator.join(' | ') + ' |\n';
      
      // Process table content
      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        if (cells.length === 0) continue;
        
        let rowContent = [];
        cells.forEach(cell => {
          const text = cleanText(getTextContent(cell));
          rowContent.push(text || ' ');
          
          // Handle images in table cells
          const inlineImages = cell.querySelectorAll('img');
          if (inlineImages.length > 0) {
            inlineImages.forEach(img => {
              const src = img.src;
              const alt = img.alt || 'image';
              if (src) {
                markdownTables += `\n![${alt}](${src})\n\n`;
              }
            });
          }
        });
        
        markdownTables += '| ' + rowContent.join(' | ') + ' |\n';
      }
      
      markdownTables += '\n';
    });
    
    return markdownTables;
  }
  
  function processContent() {
    // Get all elements in document body in order
    const elements = Array.from(document.body.querySelectorAll('*'));
    let markdown = '';
    const processedElements = new Set();
    const processedImages = new Set();
    
    // Process elements in order they appear in the document
    elements.forEach(element => {
      // Skip if already processed or not visible
      if (processedElements.has(element) || 
          element.offsetParent === null || 
          getComputedStyle(element).display === 'none') {
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
          if (src && !processedImages.has(src)) {
            markdown += `![${alt}](${src})\n\n`;
            processedImages.add(src);
          }
        });
        
        processedElements.add(element);
      }
      
      // Process standalone images
      else if (tagName === 'img') {
        const src = element.src;
        const alt = element.alt || 'image';
        if (src && !processedImages.has(src)) {
          markdown += `![${alt}](${src})\n\n`;
          processedImages.add(src);
        }
        processedElements.add(element);
      }
      
      // Process lists
      else if (tagName === 'ul' || tagName === 'ol') {
        const isOrdered = tagName === 'ol';
        const items = element.querySelectorAll('li');
        
        items.forEach((item, index) => {
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
            if (src && !processedImages.has(src)) {
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
      else if (tagName === 'blockquote') {
        const text = cleanText(getTextContent(element));
        if (text) {
          markdown += '> ' + text.replace(/\n/g, '\n> ') + '\n\n';
        }
        
        // Process images within blockquotes
        element.querySelectorAll('img').forEach(img => {
          const src = img.src;
          const alt = img.alt || 'image';
          if (src && !processedImages.has(src)) {
            markdown += `> ![${alt}](${src})\n\n`;
            processedImages.add(src);
          }
        });
        
        processedElements.add(element);
      }
      
      // Process code blocks
      else if (tagName === 'pre' || tagName === 'code') {
        const text = getTextContent(element);
        if (text) {
          markdown += '```\n' + text + '\n```\n\n';
        }
        processedElements.add(element);
      }
    });
    
    return markdown;
  }
  
  function processMainContent() {
    // Try to find main content area
    const mainContentSelectors = [
      'main',
      'article',
      '.article',
      '.post',
      '.content',
      '#content',
      '.main-content',
      '#main-content'
    ];
    
    let mainContent = null;
    
    for (const selector of mainContentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        mainContent = element;
        break;
      }
    }
    
    if (!mainContent) {
      mainContent = document.body; // If no main content area found, use body
    }
    
    return mainContent;
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