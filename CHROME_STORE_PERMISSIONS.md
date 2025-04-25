# Web2Markdown - Chrome Store Submission

## Single Purpose Description
Web2Markdown is an extension with a single purpose: to convert the content of the current webpage into Markdown format. This allows users to easily save and reuse web content in a standardized text format that is widely compatible with various documentation and note-taking systems.

## Permission Justification

### 1. activeTab Permission
**Justification**: This permission is required to access the content of the currently active tab when the user activates the extension. It allows Web2Markdown to read the webpage DOM structure and text content to convert it accurately to Markdown format.

### 2. scripting Permission
**Justification**: The scripting permission is necessary to execute content scripts that analyze and extract the webpage structure, formatting, and content. This is essential for proper conversion of HTML elements to their Markdown equivalents (headings, lists, links, etc.).

### 3. storage Permission
**Justification**: Storage permission is used to save user preferences, such as formatting options and default settings. This improves user experience by remembering their preferred conversion settings between sessions.

### 4. downloads Permission
**Justification**: The downloads permission is crucial for the core functionality of saving the generated Markdown content as a file. It allows users to export and save the converted content directly to their device.

### 5. Host Permission (<all_urls>)
**Justification**: Web2Markdown needs to function on any website the user chooses to convert to Markdown. This permission is only used when explicitly triggered by the user, and the extension only accesses the currently active tab at that moment. No persistent tracking or background data collection occurs. 