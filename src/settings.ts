// src/settings.ts

export interface EpubReaderSettings {
    epubLinkPropertyName: string;
    progressPropertyName: string;
}

export const DEFAULT_SETTINGS: EpubReaderSettings = {
    epubLinkPropertyName: 'epub-file',
    progressPropertyName: 'epub-progress',
};