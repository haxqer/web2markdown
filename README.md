# Web2Markdown

Web2Markdown is a Chrome browser extension that converts the current webpage to Markdown format.

## Features

- One-click conversion of webpage to Markdown format
- Copy Markdown content to clipboard
- Download Markdown file locally
- Automatically extract webpage metadata (title, links, author, date, etc.)
- Intelligently identify main content area of webpage

## Installation

### Install from Chrome Web Store (Recommended)

1. Visit Web2Markdown page on Chrome Web Store
2. Click "Add to Chrome" button

### Manual Installation (Development Mode)

1. Download or clone this repository to your local machine
2. Open Chrome browser and go to the Extensions page (chrome://extensions/)
3. Turn on the "Developer mode" toggle
4. Click "Load unpacked"
5. Select the folder containing this repository

## Usage

1. Click the extension icon on the webpage you want to convert
2. Click "Convert to Markdown"
3. Wait for conversion to complete, then you can:
   - Click "Copy to Clipboard" to copy the content to your clipboard
   - Click "Download Markdown File" to save the content as a local file

## Conversion Rules

Web2Markdown will automatically extract and convert the following content:

- Webpage Title → Markdown Level 1 Header
- Webpage Links, Author, Date → Markdown Metadata
- Headers (h1-h6) → Markdown Headers
- Paragraphs → Markdown Paragraphs
- Lists → Markdown Lists
- Images → Markdown Image Syntax
- Links → Markdown Link Syntax
- Block Quotes → Markdown Block Quotes
- Code Blocks → Markdown Code Blocks
- Tables → Markdown Tables

## License

MIT License 