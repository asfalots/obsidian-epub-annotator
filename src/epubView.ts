// src/epubView.ts

import { ItemView, WorkspaceLeaf, TFile, Notice, normalizePath, ViewStateResult } from "obsidian";
import ePub from "epubjs";
import MyEpubPlugin from "../main";

export const EPUB_VIEW_TYPE = "epub-view";

export class EpubView extends ItemView {
    plugin: MyEpubPlugin;
    book: any;
    rendition: any;
    
    // --- CHANGE 1: Add a property to store the path ---
    // We will store the companion file path here directly.
    companionFile: TFile;
    epubFile: TFile | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: MyEpubPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return EPUB_VIEW_TYPE;
    }

    getDisplayText(): string {
        return "EPUB Reader";
    }


    // --- CHANGE 2: Implement setState to capture the state reliably ---
    // This method is called by Obsidian to set the view's state.
    async setState(state: any, result: ViewStateResult): Promise<void> {
        this.companionFile = state.companionFile as TFile;
        console.log(`Setting state for EpubView with companion file: ${this.companionFile}`);

        const fileCache = this.app.metadataCache.getFileCache(this.companionFile);
		const epubPath = fileCache?.frontmatter?.[state.settings.epubLinkPropertyName];
		console.log(`Opening EPUB view for companion file: ${this.companionFile.path}`);
		console.log(`EPUB path from frontmatter: ${epubPath}`);

        this.epubFile = this.resolveEpubLink(epubPath, this.companionFile);
        await this.draw();
        // This is important! It ensures the rest of the view's state is handled correctly.
        await super.setState(state, result);
    }


    async draw() {
        try {
            const container = this.containerEl.children[1];
            container.empty();

            if (!this.epubFile || !this.epubFile.path) {
                throw new Error("EPUB file not resolved or path is undefined.");
            }
            const arrayBuffer = await this.app.vault.adapter.readBinary(this.epubFile.path);
            this.book = ePub(arrayBuffer);

            const epubContainer = container.createEl("div", {
                attr: { style: "width: 100%; height: 100%;" }
            });

            this.rendition = this.book.renderTo(epubContainer, {
                width: "100%",
                height: "100%"
            });
            
            await this.rendition.display();

            const progressCache = this.app.metadataCache.getFileCache(this.companionFile);
            const savedCfi = progressCache?.frontmatter?.[this.plugin.settings.progressPropertyName];

            if (savedCfi) {
                console.log(`Found saved progress: ${savedCfi}. Attempting to display.`);
                try {
                    // Tell the rendition to go to the saved CFI
                    await this.rendition.display(savedCfi);
                } catch (error) {
                    console.error("Failed to display saved CFI:", savedCfi, error);
                    new Notice("Could not restore last reading position.");
                }
            }
            // --- END NEW ---

            this.addNavigationButtons();

                // --- Listen for page changes to save progress ---
            this.rendition.on('relocated', (location: any) => {
                const cfi = location.start.cfi;
                if (this.companionFile) {
                    // Call the save function from our main plugin class
                    this.plugin.saveReadingProgress(this.companionFile, cfi);
                }
            });

        } catch (error) {
            console.error("Error in draw() method:", error);
        }
    }

    addNavigationButtons() {
        this.addAction('chevron-left', 'Previous Page', () => this.rendition?.prev());
        this.addAction('chevron-right', 'Next Page', () => this.rendition?.next());
    }

    getState() {
        return { companionFile: this.companionFile };
    }

    showLoading() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h2", { text: "Opening EPUB..." });
    }  

    async onOpen() {
        console.log("onOpen triggered.");
        // Set up a MutationObserver to watch for the iframe creation
        this.showLoading();
    }

    resolveEpubLink(link: string, companionFile:TFile): TFile | null {
        let rawEpubPath = link.toString().trim(); // Ensure it's a string
        let epubFile: TFile | null = null;

    if (rawEpubPath.startsWith('[[') && rawEpubPath.endsWith(']]')) {
        // It's a wikilink, so we need to resolve it.
        const linkText = rawEpubPath.substring(2, rawEpubPath.length - 2);
        console.log(`Resolving wikilink: ${linkText}`);

        // Use the API to find the file the link points to.
        // The second argument, companionFile.path, is crucial as it provides context.
        epubFile = this.app.metadataCache.getFirstLinkpathDest(linkText, companionFile.path); [3, 4]
    } else {
        // It's a plain path, use the old method.
        console.log(`Treating as plain path: ${rawEpubPath}`);
        const abstractFile = this.app.vault.getAbstractFileByPath(normalizePath(rawEpubPath));
        if (abstractFile instanceof TFile) {
            epubFile = abstractFile;
        }
    }
    console.log(`Resolved EPUB file: ${epubFile ? epubFile.path : 'not found'}`);
    return epubFile;

    }

    async onClose() {
        if (this.book) {
            this.book.destroy();
        }
    }
}