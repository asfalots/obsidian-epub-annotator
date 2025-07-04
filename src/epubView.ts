// src/epubView.ts

import { ItemView, WorkspaceLeaf, TFile, Notice, ViewStateResult } from "obsidian";
import ePub from "epubjs";
import MyEpubPlugin from "../main";
import { EpubAnnotation, parseAnnotationsFromMarkdown } from "./annotations";
import { EpubNavigationHandler } from "./epubNavigationHandler";
import { EpubPositionManager } from "./epubPositionManager";
import { EpubHighlightManager } from "./epubHighlightManager";
import { EpubFileResolver } from "./epubFileResolver";
import { EpubUIComponents } from "./epubUIComponents";

export const EPUB_VIEW_TYPE = "epub-view";

export class EpubView extends ItemView {
    plugin: MyEpubPlugin;
    book: any;
    rendition: any;
    
    companionFile: TFile;
    epubFile: TFile | null = null;
    
    // Component managers
    private navigationHandler: EpubNavigationHandler | null = null;
    private positionManager: EpubPositionManager | null = null;
    private highlightManager: EpubHighlightManager | null = null;
    private fileResolver: EpubFileResolver;
    private uiComponents: EpubUIComponents;

    constructor(leaf: WorkspaceLeaf, plugin: MyEpubPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.fileResolver = new EpubFileResolver(this.app);
        this.uiComponents = new EpubUIComponents(plugin, this.containerEl);
    }

    getViewType() {
        return EPUB_VIEW_TYPE;
    }

    getDisplayText(): string {
        return "EPUB Reader";
    }


    async setState(state: any, result: ViewStateResult): Promise<void> {
        this.companionFile = state.companionFile as TFile;
        console.debug(`Setting state for EpubView with companion file: ${this.companionFile}`);

        const fileCache = this.app.metadataCache.getFileCache(this.companionFile);
        const epubPath = fileCache?.frontmatter?.[state.settings.epubLinkPropertyName];

        this.epubFile = this.fileResolver.resolveEpubLink(epubPath, this.companionFile);
        await this.loadAnnotations();
        await this.draw();
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

            // Initialize component managers
            this.navigationHandler = new EpubNavigationHandler(this.book, this.rendition);
            this.positionManager = new EpubPositionManager(this.plugin, this.rendition, this.companionFile);
            this.highlightManager = new EpubHighlightManager(this.app, this.plugin, this.rendition, this.companionFile);

            // Load saved position
            await this.positionManager.loadSavedPosition(this.app);

            // Setup components
            this.setupNavigation(epubContainer);
            this.setupUI();
            this.positionManager.setupPositionTracking(epubContainer);
            this.highlightManager.setupHighlighting();
            
            // Load and display existing annotations
            this.highlightManager.setAnnotations(await this.loadAnnotations());
            this.highlightManager.displayExistingHighlights();

        } catch (error) {
            console.error("Error in draw() method:", error);
        }
    }

    /**
     * Set up navigation controls and keyboard handling
     */
    private setupNavigation(epubContainer: HTMLElement) {
        // Add navigation buttons
        this.uiComponents.addNavigationActions(
            this,
            () => this.navigationHandler?.prevPage(),
            () => this.navigationHandler?.nextPage()
        );

        // Setup keyboard navigation
        this.navigationHandler?.setupKeyboardNavigation(epubContainer, (event) => {
            // Only handle if this view is active and no modal is open
            if (this.app.workspace.activeLeaf?.view === this && !document.querySelector('.modal')) {
                this.navigationHandler?.handleKeyPress(event);
            }
        });

        // Listen for keyboard events on the document when this view is active
        this.registerDomEvent(document, 'keydown', (event: KeyboardEvent) => {
            if (this.app.workspace.activeLeaf?.view === this && !document.querySelector('.modal')) {
                this.navigationHandler?.handleKeyPress(event);
            }
        });
    }

    /**
     * Set up UI components
     */
    private setupUI() {
        // Add color picker
        this.uiComponents.addColorPicker((color: string) => {
            this.highlightManager?.setSelectedColor(color);
        });
    }

    /**
     * Load annotations from companion file
     */
    private async loadAnnotations(): Promise<EpubAnnotation[]> {
        try {
            const content = await this.app.vault.read(this.companionFile);
            return parseAnnotationsFromMarkdown(content);
        } catch (error) {
            console.error("Failed to load annotations:", error);
            return [];
        }
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
        this.showLoading();
    }

    async onClose() {
        this.positionManager?.cleanup();
        if (this.book) {
            this.book.destroy();
        }
    }
}