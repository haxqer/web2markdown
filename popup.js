document.addEventListener('DOMContentLoaded', function() {
  const convertBtn = document.getElementById('convertBtn');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const statusDiv = document.getElementById('status');
  
  let markdownContent = '';

  // 转换按钮点击事件
  convertBtn.addEventListener('click', function() {
    statusDiv.textContent = '正在转换...';
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        function: convertPageToMarkdown
      }, function(results) {
        if (chrome.runtime.lastError) {
          statusDiv.textContent = '转换失败: ' + chrome.runtime.lastError.message;
          return;
        }
        
        if (results && results[0]) {
          markdownContent = results[0].result;
          chrome.storage.local.set({'markdownContent': markdownContent});
          statusDiv.textContent = '转换成功!';
        }
      });
    });
  });

  // 复制按钮点击事件
  copyBtn.addEventListener('click', function() {
    chrome.storage.local.get('markdownContent', function(data) {
      if (data.markdownContent) {
        navigator.clipboard.writeText(data.markdownContent)
          .then(() => {
            statusDiv.textContent = '已复制到剪贴板!';
          })
          .catch(err => {
            statusDiv.textContent = '复制失败: ' + err;
          });
      } else {
        statusDiv.textContent = '请先转换网页';
      }
    });
  });

  // 下载按钮点击事件
  downloadBtn.addEventListener('click', function() {
    chrome.storage.local.get('markdownContent', function(data) {
      if (data.markdownContent) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          const pageUrl = tabs[0].url;
          const hostname = new URL(pageUrl).hostname;
          const fileName = hostname.replace(/\./g, '_') + '.md';
          
          const blob = new Blob([data.markdownContent], {type: 'text/markdown'});
          const downloadUrl = URL.createObjectURL(blob);
          
          chrome.downloads.download({
            url: downloadUrl,
            filename: fileName,
            saveAs: true
          }, function() {
            if (chrome.runtime.lastError) {
              statusDiv.textContent = '下载失败: ' + chrome.runtime.lastError.message;
            } else {
              statusDiv.textContent = '下载成功!';
            }
          });
        });
      } else {
        statusDiv.textContent = '请先转换网页';
      }
    });
  });
});

// 将网页转换为Markdown的函数
function convertPageToMarkdown() {
  // 这个函数会在网页的上下文中执行
  function extractMetadata() {
    const title = document.title || '';
    const url = window.location.href;
    let author = '';
    let date = '';
    
    // 尝试查找作者
    const authorMeta = document.querySelector('meta[name="author"], meta[property="article:author"]');
    if (authorMeta) {
      author = authorMeta.getAttribute('content');
    }
    
    // 尝试查找日期
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
  
  function processHeadings() {
    let markdownHeadings = '';
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.substring(1), 10);
      const text = cleanText(getTextContent(heading));
      if (text) {
        markdownHeadings += '#'.repeat(level) + ' ' + text + '\n\n';
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
      });
      
      markdownLists += '\n';
    });
    
    return markdownLists;
  }
  
  function processImages() {
    let markdownImages = '';
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
      const src = img.src;
      const alt = img.alt || 'image';
      
      if (src) {
        markdownImages += `![${alt}](${src})\n\n`;
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
    
    blockquotes.forEach(blockquote => {
      const text = cleanText(getTextContent(blockquote));
      if (text) {
        markdownBlockquotes += '> ' + text.replace(/\n/g, '\n> ') + '\n\n';
      }
    });
    
    return markdownBlockquotes;
  }
  
  function processCodeBlocks() {
    let markdownCode = '';
    const codeBlocks = document.querySelectorAll('pre, code');
    
    codeBlocks.forEach(codeBlock => {
      const text = getTextContent(codeBlock);
      if (text) {
        markdownCode += '```\n' + text + '\n```\n\n';
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
      
      // 处理表头
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
      
      // 处理表格内容
      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        if (cells.length === 0) continue;
        
        let rowContent = [];
        cells.forEach(cell => {
          const text = cleanText(getTextContent(cell));
          rowContent.push(text || ' ');
        });
        
        markdownTables += '| ' + rowContent.join(' | ') + ' |\n';
      }
      
      markdownTables += '\n';
    });
    
    return markdownTables;
  }
  
  function processMainContent() {
    // 尝试找到主要内容区域
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
      mainContent = document.body; // 如果找不到主要内容区域，就使用整个body
    }
    
    return mainContent;
  }
  
  // 提取元数据
  const metadata = extractMetadata();
  
  // 构建Markdown内容
  let markdown = `# ${metadata.title}\n\n`;
  
  if (metadata.url) {
    markdown += `原始链接: ${metadata.url}\n\n`;
  }
  
  if (metadata.author) {
    markdown += `作者: ${metadata.author}\n\n`;
  }
  
  if (metadata.date) {
    markdown += `发布日期: ${metadata.date}\n\n`;
  }
  
  markdown += `---\n\n`;
  
  // 获取主要内容
  const mainContent = processMainContent();
  
  // 处理主要内容
  markdown += processHeadings();
  markdown += processParagraphs();
  markdown += processLists();
  markdown += processBlockquotes();
  markdown += processCodeBlocks();
  markdown += processTables();
  
  // 添加图片和链接信息
  markdown += `## 图片\n\n`;
  markdown += processImages();
  
  markdown += `## 链接\n\n`;
  markdown += processLinks();
  
  return markdown;
} 