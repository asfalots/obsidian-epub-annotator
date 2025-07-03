// src/settings.ts

export interface EpubReaderSettings {
    epubLinkPropertyName: string;
}

export const DEFAULT_SETTINGS: EpubReaderSettings = {
    epubLinkPropertyName: 'epub-file',
};