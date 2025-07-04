// src/epubFileResolver.ts

import { TFile, normalizePath } from "obsidian";

export class EpubFileResolver {
    private app: any;

    constructor(app: any) {
        this.app = app;
    }

    /**
     * Resolve EPUB file from link in companion file
     */
    resolveEpubLink(link: string, companionFile: TFile): TFile | null {
        let rawEpubPath = link.toString().trim(); // Ensure it's a string
        let epubFile: TFile | null = null;

        if (rawEpubPath.startsWith('[[') && rawEpubPath.endsWith(']]')) {
            // It's a wikilink, so we need to resolve it.
            const linkText = rawEpubPath.substring(2, rawEpubPath.length - 2);
            console.debug(`Resolving wikilink: ${linkText}`);

            // Use the API to find the file the link points to.
            // The second argument, companionFile.path, is crucial as it provides context.
            epubFile = this.app.metadataCache.getFirstLinkpathDest(linkText, companionFile.path);
        } else {
            // It's a plain path, use the old method.
            console.debug(`Treating as plain path: ${rawEpubPath}`);
            const abstractFile = this.app.vault.getAbstractFileByPath(normalizePath(rawEpubPath));
            if (abstractFile instanceof TFile) {
                epubFile = abstractFile;
            }
        }
        
        console.debug(`Resolved EPUB file: ${epubFile ? epubFile.path : 'not found'}`);
        return epubFile;
    }
}
