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
        { color: '#ffeb3b', sectionTitle: '## Yellow Highlights', template: '- {{text}} - {{note}} - [📖]({{link}})' },
        { color: '#4caf50', sectionTitle: '## Green Highlights', template: '- {{text}} - {{note}} - [📖]({{link}})' },
        { color: '#2196f3', sectionTitle: '## Blue Highlights', template: '- {{text}} - {{note}} - [📖]({{link}})' },
        { color: '#ff9800', sectionTitle: '## Orange Highlights', template: '- {{text}} - {{note}} - [📖]({{link}})' },
        { color: '#e91e63', sectionTitle: '## Pink Highlights', template: '- {{text}} - {{note}} - [📖]({{link}})' }
    ]
};