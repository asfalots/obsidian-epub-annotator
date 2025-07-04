// src/settings.ts

export interface HighlightColorMapping {
    color: string;
    sectionTitle: string;
    template: string;
}

export interface EpubReaderSettings {
    epubLinkPropertyName: string;
    progressPropertyName: string;
    annotationsPropertyName: string;
    colorMappings: HighlightColorMapping[];
}

export const DEFAULT_SETTINGS: EpubReaderSettings = {
    epubLinkPropertyName: 'epub-file',
    progressPropertyName: 'epub-progress',
    annotationsPropertyName: 'epub-annotations',
    colorMappings: [
        { color: '#ffeb3b', sectionTitle: '## Characters', template: '- **{{text}}**: {{note}} - [📖]({{link}})' },
        { color: '#4caf50', sectionTitle: '## Plot', template: '> {{text}}[📖]({{link}})\n\n{{note}}' },
        { color: '#2196f3', sectionTitle: '## Quotes', template: '> [!quote] {{text}}\n> {{note}} - [📖]({{link}})' }
    ]
};