# EPUB Annotator Plugin for Obsidian

A powerful Obsidian plugin for reading EPUB files with advanced annotation and note-taking capabilities. Seamlessly integrates with your vault's markdown notes.

## Features

### 📖 EPUB Reading
- Full EPUB viewer with navigation controls
- Reading progress saving
- Keyboard navigation (arrow keys)
- Responsive design

### 🎨 Multi-Color Highlighting
- 5 default highlight colors (customizable)
- Color-coded sections in notes
- Visual color picker in reader
- Organized highlight sections

### 📝 Smart Annotations
- Add personal notes to highlights
- Human-readable markdown format
- Automatic section organization
- Hidden metadata for synchronization

### ⚙️ Configurable Settings
- Custom property names for EPUB linking
- Color-to-section mapping
- Progress tracking configuration
- Annotation organization options

## Setup

1. Install the plugin in your `.obsidian/plugins/` folder
2. Enable the plugin in Obsidian settings
3. Configure your EPUB link property name (default: `epub-file`)

## Usage

### Linking EPUB to Notes

Add the EPUB file path to your note's frontmatter:

```yaml
---
epub-file: "path/to/your/book.epub"
# or use wikilinks
epub-file: "[[My Book.epub]]"
---
```

### Opening EPUB Reader

1. **Command Palette**: Use "Open associated EPUB"
2. **Right-click**: On markdown files with EPUB links
3. **Automatic**: The plugin detects EPUB-linked notes

### Creating Highlights

1. Select text in the EPUB reader
2. Choose a highlight color from the color picker
3. Add an optional personal note
4. The highlight is automatically saved to your note

### Organizing Annotations

- Highlights are automatically organized by color into sections
- Use the "Reorganize EPUB annotations by color" command to clean up existing notes
- Each section title is customizable in settings

## Configuration

Access plugin settings via Settings → Community Plugins → EPUB Annotator

### Color Mappings

Configure which colors correspond to which sections:

- **Yellow** → `## Yellow Highlights`
- **Green** → `## Green Highlights`  
- **Blue** → `## Blue Highlights`
- **Orange** → `## Orange Highlights`
- **Pink** → `## Pink Highlights`

Add, remove, or modify color mappings as needed.

### Property Names

Customize the frontmatter property names:

- **EPUB Link Property**: Property for linking EPUB files
- **Progress Property**: Property for saving reading position
- **Annotations Property**: Property for annotation metadata

## Note Format

Annotations are stored in human-readable markdown format:

```markdown
## Yellow Highlights

- "This is an important quote from the book" - My personal note about this passage
<!-- EPUB_ANNOTATION: {"id":"1640995200000","cfi":"epubcfi(/6/14[id4]!/4/2/2/2[id4]/2/1:0)","text":"This is an important quote from the book","color":"#ffeb3b","note":"My personal note about this passage","timestamp":1640995200000} -->

## Green Highlights

- "Another significant passage"
<!-- EPUB_ANNOTATION: {"id":"1640995300000","cfi":"epubcfi(/6/16[id5]!/4/2/2/4[id5]/2/1:0)","text":"Another significant passage","color":"#4caf50","timestamp":1640995300000} -->
```

The hidden comments contain metadata for synchronization and are automatically managed.

## Commands

- **Open associated EPUB**: Opens the EPUB reader for the current note
- **Reorganize EPUB annotations by color**: Reorganizes existing annotations into color-coded sections

## Development

Built with TypeScript using:
- [epub.js](http://epubjs.org/) for EPUB rendering
- [Obsidian API](https://docs.obsidian.md/Reference/TypeScript+API/Reference) for vault integration

## License

MIT License
