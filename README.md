# EPUB Annotator for Obsidian

Read and annotate EPUB books directly in Obsidian. Your highlights and notes are saved as human-readable markdown in your vault.

![EPUB Annotator Screenshot](screenshot-placeholder.png)
*EPUB reader with color-coded highlighting and annotation features*

## Quick Start

1. **Install**: Add the plugin to your `.obsidian/plugins/` folder and enable it
2. **Link an EPUB**: Add `epub-file: "path/to/book.epub"` to any note's frontmatter
3. **Open**: Right-click the note and select "Open associated EPUB"
4. **Highlight**: Select text, pick a color, add notes - everything saves automatically

## Key Features

- **Built-in EPUB Reader** - No need for external apps
- **5 Color Highlighting** - Organize highlights by importance or category  
- **Clickable Links** - Jump back to exact locations in the book
- **Auto-Organization** - Highlights sorted by color into markdown sections
- **Progress Tracking** - Remembers where you left off
- **Keyboard Navigation** - Use arrow keys to turn pages

## How It Works

### 1. Link Your EPUB

Add any EPUB file to your note using frontmatter:

```yaml
---
epub-file: "Books/My Book.epub"
# or use wikilinks:
epub-file: "[[My Book.epub]]"
---
```

### 2. Start Reading

- **Command Palette**: Search for "Open associated EPUB"
- **Right-click menu**: Available on notes with EPUB links
- **Arrow keys**: Navigate between pages
- **Automatic bookmarking**: Picks up where you left off

### 3. Create Highlights

1. Select any text in the reader
2. Choose a highlight color from the picker
3. Add an optional personal note
4. Your annotation automatically appears in the note

### 4. Organized Output

Highlights are automatically sorted by color into clean markdown sections:

```markdown
## Yellow Highlights

- "Important quote from the book" - My thoughts here [📖](obsidian://epub-annotator?file=...)

## Blue Highlights  

- "Technical concept to remember" [📖](obsidian://epub-annotator?file=...)
```

The 📖 links take you back to the exact location in the book.

## Customization

### Color Mappings

Go to Settings → Community Plugins → EPUB Annotator to customize:

- **Colors**: Change highlight colors
- **Section Titles**: Customize section headings (e.g., "Important Quotes", "Key Concepts")
- **Templates**: Control how highlights appear in your notes

### Template Variables

Use these in your templates:
- `{{text}}` - The highlighted text
- `{{note}}` - Your personal note  
- `{{link}}` - Clickable link back to the book location

### Examples

```markdown
- {{text}} - {{note}} [📖]({{link}})
> {{text}}
> 
> Note: {{note}} [🔗]({{link}})
**{{text}}** ({{note}}) [📖]({{link}})
```

## Commands

- **Open associated EPUB** - Opens the reader for the current note

## Requirements

- Obsidian 0.15.0+
- EPUB files in your vault or accessible file paths

## Development

Built with TypeScript using [epub.js](http://epubjs.org/) and the [Obsidian API](https://docs.obsidian.md/Reference/TypeScript+API/Reference).

## License

MIT License
