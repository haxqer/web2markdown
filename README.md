# Web2Markdown

Web2Markdown is a Chrome browser extension that converts the current webpage to Markdown format.

## Features

- Automatically converts web pages to Markdown format
- Supports copying Markdown content to clipboard
- Supports downloading Markdown files locally
- Automatically extracts webpage title, links, author, date and other metadata
- Intelligently identifies the main content area of the webpage
- Preserves original page layout in the Markdown output
- Filters out advertisements and irrelevant content

## Installation

### Install from Chrome Web Store (Recommended)

1. Visit the Web2Markdown page on the Chrome Web Store
2. Click the "Add to Chrome" button

### Manual Installation (Developer Mode)

1. Download or clone this repository locally
2. Open Chrome browser, go to the extensions page (chrome://extensions/)
3. Turn on "Developer mode" in the top right corner
4. Click "Load unpacked extension"
5. Select the folder containing this repository

## Usage

1. On the webpage you want to convert, click the extension icon
2. The extension automatically converts the page to Markdown
3. After conversion is complete, you can:
   - Click "Copy to Clipboard" to copy the content to clipboard
   - Click "Download Markdown" to save the content as a local file
   - Edit the Markdown directly in the editor
   - See a real-time preview of the Markdown

## Conversion Rules

Web2Markdown automatically extracts and converts the following:

- Webpage title → Markdown level 1 heading
- Webpage link, author, date → Markdown metadata
- Headings (h1-h6) → Markdown headings
- Paragraphs → Markdown paragraphs
- Lists → Markdown lists
- Images → Markdown image syntax
- Links → Markdown link syntax
- Blockquotes → Markdown quotes
- Code blocks → Markdown code blocks
- Tables → Markdown tables

## License

MIT License 