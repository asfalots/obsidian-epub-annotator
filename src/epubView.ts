// src/epubView.ts

import { ItemView, WorkspaceLeaf, TFile, Notice, normalizePath, ViewStateResult, Modal } from "obsidian";
import ePub from "epubjs";
import MyEpubPlugin from "../main";
import { EpubAnnotation, parseAnnotationsFromMarkdown } from "./annotations";
import { AnnotationNoteModal } from "./annotationModal";

export const EPUB_VIEW_TYPE = "epub-view";

export class EpubView extends ItemView {
    plugin: MyEpubPlugin;
    book: any;
    rendition: any;
    
    companionFile: TFile;
    epubFile: TFile | null = null;
    currentAnnotations: EpubAnnotation[] = [];
    selectedColor: string;
    currentCfi: string | null = null;
    isRestoringPosition: boolean = false;
    isResizing: boolean = false;
    resizeTimeout: NodeJS.Timeout | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: MyEpubPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.selectedColor = plugin.settings.colorMappings[0]?.color || '#ffeb3b';
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
        console.debug(`Setting state for EpubView with companion file: ${this.companionFile}`);

        const fileCache = this.app.metadataCache.getFileCache(this.companionFile);
		const epubPath = fileCache?.frontmatter?.[state.settings.epubLinkPropertyName];

        this.epubFile = this.resolveEpubLink(epubPath, this.companionFile);
        await this.loadAnnotations();
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
            
            
            const progressCache = this.app.metadataCache.getFileCache(this.companionFile);
            const savedCfi = progressCache?.frontmatter?.[this.plugin.settings.progressPropertyName];

            if (savedCfi) {
                console.debug(`Found saved progress: ${savedCfi}. Attempting to display.`);
                try {
                    // Tell the rendition to go to the saved CFI
                    await this.rendition.display(savedCfi);
                    this.currentCfi = savedCfi;
                } catch (error) {
                    console.error("Failed to display saved CFI:", savedCfi, error);
                    new Notice("Could not restore last reading position.");
                }
            }else{
                await this.rendition.display();
            }
            // --- END NEW ---

            this.addNavigationButtons();
            this.addColorPickerButton();

                // --- Listen for page changes to save progress ---
            this.rendition.on('relocated', (location: any) => {
                console.debug("Page relocated to:", location.start.cfi);
                const cfi = location.start.cfi;
                
                // Don't save if we're in the middle of restoring position or resizing
                if (!this.isRestoringPosition && !this.isResizing) {
                    this.currentCfi = cfi;
                    // Only save progress if this view is active and visible
                    if (this.companionFile && 
                        this.app.workspace.activeLeaf?.view === this && 
                        this.containerEl.isConnected && 
                        !this.containerEl.hidden) {
                        this.plugin.saveReadingProgress(this.companionFile, cfi);
                    }
                }
            });

            // Listen for resize events to restore position
            this.rendition.on('resized', () => {
                console.debug("Rendition resized, restoring position to:", this.currentCfi);
                this.handleResize();
            });

            // Use ResizeObserver to detect container size changes
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    console.debug("Container resized, restoring position");
                    this.handleResize();
                }
            });
            resizeObserver.observe(epubContainer);

            // Listen for window resize events
            const handleWindowResize = () => {
                console.debug("Window resized, restoring position");
                this.handleResize();
            };
            this.registerDomEvent(window, 'resize', handleWindowResize);

            // Use intersection observer to detect when view becomes visible
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && this.currentCfi) {
                        console.debug("View became visible, restoring position");
                        this.restorePosition();
                    }
                });
            });
            observer.observe(epubContainer);

            // Add keyboard navigation with proper event handling
            this.setupKeyboardNavigation(epubContainer);
            
            // Setup highlighting functionality
            this.setupHighlighting();
            
            // Load and display existing annotations
            this.displayExistingHighlights();

        } catch (error) {
            console.error("Error in draw() method:", error);
        }
    }

    addNavigationButtons() {
        this.addAction('chevron-left', 'Previous Page', () => this.rendition?.prev());
        this.addAction('chevron-right', 'Next Page', () => this.rendition?.next());
    }

    addColorPickerButton() {
        const colorContainer = this.containerEl.createDiv('epub-color-picker');
        colorContainer.style.cssText = `
            position: absolute;
            top: 30px;
            right: 30px;
            z-index: 1000;
            display: flex;
            gap: 5px;
            padding: 5px;
            background: var(--background-primary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 5px;
        `;

        this.plugin.settings.colorMappings.forEach(mapping => {
            const colorButton = colorContainer.createEl('button');
            colorButton.style.cssText = `
                width: 24px;
                height: 24px;
                border: 2px solid ${this.selectedColor === mapping.color ? '#000' : 'transparent'};
                border-radius: 3px;
                background-color: ${mapping.color};
                cursor: pointer;
                transition: border-color 0.2s;
            `;
            colorButton.title = mapping.sectionTitle.replace(/^#+\s*/, '');
            colorButton.onclick = () => {
                this.selectedColor = mapping.color;
                this.updateColorButtonSelection(colorContainer);
            };
        });
    }

    updateColorButtonSelection(container: HTMLElement) {
        const buttons = container.querySelectorAll('button');
        buttons.forEach((button, index) => {
            const mapping = this.plugin.settings.colorMappings[index];
            if (mapping) {
                button.style.border = this.selectedColor === mapping.color ? '2px solid #000' : '2px solid transparent';
            }
        });
    }

    setupKeyboardNavigation(container: HTMLElement) {
        // Make container focusable for keyboard events only
        container.tabIndex = -1;
        
        // Add keydown listener to container (not passive)
        container.addEventListener('keydown', this.handleKeyPress.bind(this), { passive: false });
        
        // Listen for keyboard events on the document when this view is active
        this.registerDomEvent(document, 'keydown', (event: KeyboardEvent) => {
            // Only handle if this view is active and no modal is open
            if (this.app.workspace.activeLeaf?.view === this && !document.querySelector('.modal')) {
                this.handleKeyPress(event);
            }
        });
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

    resolveEpubLink(link: string, companionFile:TFile): TFile | null {
        let rawEpubPath = link.toString().trim(); // Ensure it's a string
        let epubFile: TFile | null = null;

    if (rawEpubPath.startsWith('[[') && rawEpubPath.endsWith(']]')) {
        // It's a wikilink, so we need to resolve it.
        const linkText = rawEpubPath.substring(2, rawEpubPath.length - 2);
        console.debug(`Resolving wikilink: ${linkText}`);

        // Use the API to find the file the link points to.
        // The second argument, companionFile.path, is crucial as it provides context.
        epubFile = this.app.metadataCache.getFirstLinkpathDest(linkText, companionFile.path); [3, 4]
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

    async onClose() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        if (this.book) {
            this.book.destroy();
        }
    }

    
    handleKeyPress(event: KeyboardEvent) {
        // If there's no book or rendition, do nothing
        if (!this.book || !this.rendition) return;

        const isRtl = this.book.package.metadata.direction === 'rtl';
        let nextPage = isRtl ? () => this.rendition.prev() : () => this.rendition.next();
        let prevPage = isRtl ? () => this.rendition.next() : () => this.rendition.prev();

        switch (event.key) {
            case 'ArrowLeft':
                prevPage();
                event.preventDefault();
                event.stopPropagation();
                console.debug("Left arrow pressed, going to previous page.");
                break;
            case 'ArrowRight':
                nextPage();
                event.preventDefault();
                event.stopPropagation();
                console.debug("Right arrow pressed, going to next page.");
                break;
        }
    }

    async loadAnnotations() {
        try {
            const content = await this.app.vault.read(this.companionFile);
            this.currentAnnotations = parseAnnotationsFromMarkdown(content);
        } catch (error) {
            console.error("Failed to load annotations:", error);
            this.currentAnnotations = [];
        }
    }

    setupHighlighting() {
        if (!this.rendition) return;

        // Enable text selection
        this.rendition.themes.default({
            '::selection': {
                'background': 'rgba(255, 255, 0, 0.3)'
            }
        });

        // Listen for text selection events
        this.rendition.on('selected', (cfiRange: string, contents: any) => {
            this.handleTextSelection(cfiRange, contents);
        });
    }

    async handleTextSelection(cfiRange: string, contents: any) {
        try {
            const selectedText = contents.window.getSelection().toString().trim();
            if (!selectedText) return;

            // Create annotation object
            const annotation: EpubAnnotation = {
                id: Date.now().toString(),
                cfi: cfiRange,
                text: selectedText,
                color: this.selectedColor,
                timestamp: Date.now()
            };

            // Prompt for note
            const noteModal = new AnnotationNoteModal(this.app, selectedText, async (note: string) => {
                if (note) annotation.note = note;
                
                // Add highlight to rendition
                this.rendition.annotations.add('highlight', cfiRange, {}, undefined, undefined, {
                    fill: this.selectedColor,
                    'fill-opacity': '0.3',
                    'mix-blend-mode': 'multiply'
                });

                // Save annotation
                this.currentAnnotations.push(annotation);
                await this.saveAnnotationToNote(annotation);
                
                new Notice('Highlight saved!');
            });
            
            noteModal.open();
        } catch (error) {
            console.error("Error handling text selection:", error);
            new Notice('Failed to create highlight');
        }
    }

    displayExistingHighlights() {
        if (!this.rendition || !this.currentAnnotations.length) return;

        this.currentAnnotations.forEach(annotation => {
            try {
                this.rendition.annotations.add('highlight', annotation.cfi, {}, undefined, undefined, {
                    fill: annotation.color,
                    'fill-opacity': '0.3',
                    'mix-blend-mode': 'multiply'
                });
            } catch (error) {
                console.debug("Could not display highlight:", annotation.id, error);
            }
        });
    }

    async saveAnnotationToNote(annotation: EpubAnnotation) {
        try {
            const content = await this.app.vault.read(this.companionFile);
            const colorMapping = this.plugin.settings.colorMappings.find(m => m.color === annotation.color);
            const sectionTitle = colorMapping?.sectionTitle || '## Highlights';
            
            // Check if section exists
            const sectionRegex = new RegExp(`^${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm');
            const hasSection = sectionRegex.test(content);
            
            const noteText = annotation.note ? ` - ${annotation.note}` : '';
            const annotationLine = `- ${annotation.text}${noteText}\n<!-- EPUB_ANNOTATION: ${JSON.stringify(annotation)} -->\n`;
            
            let newContent: string;
            if (hasSection) {
                // Add to existing section
                newContent = content.replace(sectionRegex, `${sectionTitle}\n\n${annotationLine}`);
            } else {
                // Create new section at end
                newContent = content + `\n\n${sectionTitle}\n\n${annotationLine}`;
            }
            
            await this.app.vault.modify(this.companionFile, newContent);
        } catch (error) {
            console.error("Failed to save annotation:", error);
            new Notice('Failed to save annotation to note');
        }
    }

    handleResize() {
        if (!this.currentCfi) return;
        
        // Set resize flag to prevent saving progress during resize
        this.isResizing = true;
        
        // Clear any existing timeout
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        // Set timeout to clear resize flag and restore position
        this.resizeTimeout = setTimeout(() => {
            this.isResizing = false;
            this.restorePosition();
        }, 200);
    }

    restorePosition() {
        if (!this.currentCfi || this.isRestoringPosition) return;
        
        this.isRestoringPosition = true;
        console.debug("Restoring position to:", this.currentCfi);
        
        // Small delay to ensure any resize/redraw is complete
        setTimeout(() => {
            this.rendition.display(this.currentCfi).then(() => {
                console.debug("Position restored successfully");
                this.isRestoringPosition = false;
            }).catch((error: any) => {
                console.error("Failed to restore position:", error);
                this.isRestoringPosition = false;
            });
        }, 150);
    }

}