// src/epubHighlightManager.ts

import { App, TFile, Notice } from "obsidian";
import { EpubAnnotation } from "./annotations";
import { AnnotationNoteModal } from "./annotationModal";
import MyEpubPlugin from "../main";

export class EpubHighlightManager {
    private app: App;
    private plugin: MyEpubPlugin;
    private rendition: any;
    private companionFile: TFile;
    private currentAnnotations: EpubAnnotation[] = [];
    private selectedColor: string;

    constructor(app: App, plugin: MyEpubPlugin, rendition: any, companionFile: TFile) {
        this.app = app;
        this.plugin = plugin;
        this.rendition = rendition;
        this.companionFile = companionFile;
        this.selectedColor = plugin.settings.colorMappings[0]?.color || '#ffeb3b';
    }

    /**
     * Set up highlighting functionality
     */
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

    /**
     * Handle text selection and create highlights
     */
    private async handleTextSelection(cfiRange: string, contents: any) {
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
                this.addHighlightToRendition(cfiRange, this.selectedColor);

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

    /**
     * Add highlight to the rendition
     */
    private addHighlightToRendition(cfiRange: string, color: string) {
        this.rendition.annotations.add('highlight', cfiRange, {}, undefined, undefined, {
            fill: color,
            'fill-opacity': '0.3',
            'mix-blend-mode': 'multiply'
        });
    }

    /**
     * Display existing highlights from annotations
     */
    displayExistingHighlights() {
        if (!this.rendition || !this.currentAnnotations.length) return;

        this.currentAnnotations.forEach(annotation => {
            try {
                this.addHighlightToRendition(annotation.cfi, annotation.color);
            } catch (error) {
                console.debug("Could not display highlight:", annotation.id, error);
            }
        });
    }

    /**
     * Save annotation to the companion note file
     */
    private async saveAnnotationToNote(annotation: EpubAnnotation) {
        try {
            const content = await this.app.vault.read(this.companionFile);
            const colorMapping = this.plugin.settings.colorMappings.find(m => m.color === annotation.color);
            const sectionTitle = colorMapping?.sectionTitle || '## Highlights';
            
            // Check if section exists
            const sectionRegex = new RegExp(`^${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm');
            const hasSection = sectionRegex.test(content);
            
            // Import annotationToMarkdown function
            const { annotationToMarkdown } = await import('./annotations');
            const annotationLine = annotationToMarkdown(annotation, colorMapping?.template, this.companionFile.path);
            
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

    /**
     * Set the selected color for new highlights
     */
    setSelectedColor(color: string) {
        this.selectedColor = color;
    }

    /**
     * Get the currently selected color
     */
    getSelectedColor(): string {
        return this.selectedColor;
    }

    /**
     * Set current annotations
     */
    setAnnotations(annotations: EpubAnnotation[]) {
        this.currentAnnotations = annotations;
    }

    /**
     * Get current annotations
     */
    getAnnotations(): EpubAnnotation[] {
        return this.currentAnnotations;
    }
}
