import { ItemView, WorkspaceLeaf, TFile, ViewStateResult } from "obsidian";
import ePub, { Book, Rendition } from "epubjs";

export const EPUB_VIEW_TYPE = "epub-view";

export class EpubView extends ItemView {
    book: Book;
    rendition: Rendition;
    currentFile: TFile;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return EPUB_VIEW_TYPE;
    }

    getDisplayText(): string {
        return this.currentFile?.basename || "EPUB Reader";
    }

    getIcon(): string {
        return "book-open";
    }

    async onOpen() {
        console.log("onOpen triggered.");
        // Set up a MutationObserver to watch for the iframe creation
        this.setupiframeSandboxObserver();
        this.showLoading();
    }
    
    showLoading() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h2", { text: "Opening EPUB..." });
    }

    async setState(state: any, result: ViewStateResult) {
        console.log("setState triggered.");
        const filePath = state.file;
        if (!filePath) {
            this.showError("No file path found in state object.");
            return;
        }

        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (!(file instanceof TFile)) {
            this.showError(`File not found: ${filePath}`);
            return;
        }

        this.currentFile = file;
        await this.draw();
        
        super.setState(state, result);
    }

    async draw() {
        try {
            const container = this.containerEl.children[1];
            container.empty();

            const arrayBuffer = await this.app.vault.adapter.readBinary(this.currentFile.path);
            this.book = ePub(arrayBuffer);

            const epubContainer = container.createEl("div", {
                attr: { style: "width: 100%; height: 100%;" }
            });

            this.rendition = this.book.renderTo(epubContainer, {
                width: "100%",
                height: "100%"
            });
            
            await this.rendition.display();
            this.addNavigationButtons();

            // When metadata is loaded, update the tab title
            this.book.loaded.metadata.then(metadata => {
                // FIX 1: Call setDisplayText on the leaf, not the view
                
                this.leaf.setDisplayText(metadata.title || this.currentFile.basename);
            });

        } catch (error) {
            console.error("Error in draw() method:", error);
            this.showError(error);
        }
    }

    // FIX 2: This method sets up the observer to modify the iframe sandbox
    setupiframeSandboxObserver() {
        const container = this.containerEl.children[1];
        
        const observer = new MutationObserver((mutationsList, observer) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeName.toLowerCase() === 'iframe') {
                            const iframe = node as HTMLIFrameElement;
                            // Allow scripts and same-origin access for epub.js functionality
                            iframe.sandbox.add('allow-scripts', 'allow-same-origin');
                            console.log("iframe sandboxed permissions updated.");
                            // We found the iframe, we can stop observing now.
                            observer.disconnect();
                        }
                    });
                }
            }
        });

        observer.observe(container, { childList: true, subtree: true });
    }
    
    showError(error: any) {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h3", { text: "Error loading EPUB" });
        const errorText = error instanceof Error ? error.message : String(error);
        container.createEl("pre", { text: errorText });
    }

    onResize() {
        super.onResize();
        this.debouncedResize();
    }

    debouncedResize = this.debounce(() => {
        if (this.rendition) {
            const container = this.containerEl.children[1];
            if (container.clientWidth > 0 && container.clientHeight > 0) {
                this.rendition.resize(container.clientWidth, container.clientHeight);
            }
        }
    }, 250);

    addNavigationButtons() {
        this.addAction('chevron-left', 'Previous Page', () => this.rendition?.prev());
        this.addAction('chevron-right', 'Next Page', () => this.rendition?.next());
    }

    async onClose() {
        this.book?.destroy();
    }
    
    debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
        let timeout: NodeJS.Timeout;
        return (...args: Parameters<T>) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    }
}