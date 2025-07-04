// src/epubPositionManager.ts

import { TFile, Notice } from "obsidian";
import MyEpubPlugin from "../main";

export class EpubPositionManager {
    private plugin: MyEpubPlugin;
    private rendition: any;
    private companionFile: TFile;
    private currentCfi: string | null = null;
    private isRestoringPosition: boolean = false;
    private isResizing: boolean = false;
    private resizeTimeout: NodeJS.Timeout | null = null;

    constructor(plugin: MyEpubPlugin, rendition: any, companionFile: TFile) {
        this.plugin = plugin;
        this.rendition = rendition;
        this.companionFile = companionFile;
    }

    /**
     * Set up position tracking and restoration
     */
    setupPositionTracking(epubContainer: HTMLElement) {
        // Listen for page changes to save progress
        this.rendition.on('relocated', (location: any) => {
            console.debug("Page relocated to:", location.start.cfi);
            const cfi = location.start.cfi;
            
            // Don't save if we're in the middle of restoring position or resizing
            if (!this.isRestoringPosition && !this.isResizing) {
                this.currentCfi = cfi;
                this.saveProgress();
            }
        });

        // Listen for resize events to restore position
        this.rendition.on('resized', () => {
            console.debug("Rendition resized, restoring position to:", this.currentCfi);
            this.handleResize();
        });

        // Use ResizeObserver to detect container size changes
        const resizeObserver = new ResizeObserver(() => {
            console.debug("Container resized, restoring position");
            this.handleResize();
        });
        resizeObserver.observe(epubContainer);

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
    }

    /**
     * Load and display saved reading position
     */
    async loadSavedPosition(app: any): Promise<void> {
        const progressCache = app.metadataCache.getFileCache(this.companionFile);
        const savedCfi = progressCache?.frontmatter?.[this.plugin.settings.progressPropertyName];

        if (savedCfi) {
            console.debug(`Found saved progress: ${savedCfi}. Attempting to display.`);
            try {
                await this.rendition.display(savedCfi);
                this.currentCfi = savedCfi;
            } catch (error) {
                console.error("Failed to display saved CFI:", savedCfi, error);
                new Notice("Could not restore last reading position.");
            }
        } else {
            await this.rendition.display();
        }
    }

    /**
     * Save current reading progress
     */
    private saveProgress() {
        if (this.companionFile && this.currentCfi) {
            this.plugin.saveReadingProgress(this.companionFile, this.currentCfi);
        }
    }

    /**
     * Handle resize events
     */
    private handleResize() {
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

    /**
     * Restore position after resize or view change
     */
    private restorePosition() {
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

    /**
     * Get current CFI position
     */
    getCurrentCfi(): string | null {
        return this.currentCfi;
    }

    /**
     * Clean up timers and resources
     */
    cleanup() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
    }
}
