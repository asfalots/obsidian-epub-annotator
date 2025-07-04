// src/epubUIComponents.ts

import { Component } from "obsidian";
import MyEpubPlugin from "../main";

export class EpubUIComponents {
    private plugin: MyEpubPlugin;
    private containerEl: HTMLElement;
    private selectedColor: string;

    constructor(plugin: MyEpubPlugin, containerEl: HTMLElement) {
        this.plugin = plugin;
        this.containerEl = containerEl;
        this.selectedColor = plugin.settings.colorMappings[0]?.color || '#ffeb3b';
    }

    /**
     * Add navigation action buttons to the view
     */
    addNavigationActions(view: any, onPrev: () => void, onNext: () => void) {
        view.addAction('chevron-left', 'Previous Page', onPrev);
        view.addAction('chevron-right', 'Next Page', onNext);
    }

    /**
     * Create and add color picker UI
     */
    addColorPicker(onColorChange: (color: string) => void): HTMLElement {
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
                onColorChange(mapping.color);
            };
        });

        return colorContainer;
    }

    /**
     * Update color button selection visual state
     */
    private updateColorButtonSelection(container: HTMLElement) {
        const buttons = container.querySelectorAll('button');
        buttons.forEach((button, index) => {
            const mapping = this.plugin.settings.colorMappings[index];
            if (mapping) {
                button.style.border = this.selectedColor === mapping.color ? '2px solid #000' : '2px solid transparent';
            }
        });
    }

    /**
     * Get currently selected color
     */
    getSelectedColor(): string {
        return this.selectedColor;
    }

    /**
     * Set selected color
     */
    setSelectedColor(color: string) {
        this.selectedColor = color;
    }
}
