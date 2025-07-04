// src/settingsTab.ts

import { App, PluginSettingTab, Setting } from 'obsidian';
import MyEpubPlugin from '../main'; // Adjust path if needed

export class EpubReaderSettingsTab extends PluginSettingTab {
    plugin: MyEpubPlugin;

    constructor(app: App, plugin: MyEpubPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        // Clear the settings tab to prevent duplicate elements
        containerEl.empty();

        containerEl.createEl('h2', { text: 'EPUB Annotator Settings' });

        new Setting(containerEl)
           .setName('EPUB Link Property')
           .setDesc('The frontmatter property name to use for linking an EPUB file to this note.')
           .addText(text => text
               .setPlaceholder('e.g., epub-file')
               .setValue(this.plugin.settings.epubLinkPropertyName)
               .onChange(async (value) => {
                    // Update the setting value
                    this.plugin.settings.epubLinkPropertyName = value;
                    // Save the settings
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('Progress Property')
            .setDesc('The frontmatter property name for storing reading progress (CFI).')
            .addText(text => text
                .setPlaceholder('e.g., epub-progress')
                .setValue(this.plugin.settings.progressPropertyName)
                .onChange(async (value) => {
                        this.plugin.settings.progressPropertyName = value;
                        await this.plugin.saveSettings();
                    }));

        new Setting(containerEl)
            .setName('Annotations Property')
            .setDesc('The frontmatter property name for storing annotation metadata.')
            .addText(text => text
                .setPlaceholder('e.g., epub-annotations')
                .setValue(this.plugin.settings.annotationsPropertyName)
                .onChange(async (value) => {
                        this.plugin.settings.annotationsPropertyName = value;
                        await this.plugin.saveSettings();
                    }));

        containerEl.createEl('h3', { text: 'Highlight Color Mappings' });
        containerEl.createEl('p', { 
            text: 'Configure which colors map to which sections in your notes.' 
        });
        containerEl.createEl('p', { 
            text: 'Template variables: {{text}} (highlighted text), {{note}} (user note)' 
        });
        const exampleEl = containerEl.createEl('details');
        exampleEl.createEl('summary', { text: 'Template Examples' });
        const exampleList = exampleEl.createEl('ul');
        exampleList.createEl('li').innerHTML = '<code>- {{text}} - {{note}}</code> → Standard bullet list';
        exampleList.createEl('li').innerHTML = '<code>> {{text}}<br/>><br/>> Note: {{note}}</code> → Block quote format';
        exampleList.createEl('li').innerHTML = '<code>**{{text}}** ({{note}})</code> → Bold text with note in parentheses';

        this.plugin.settings.colorMappings.forEach((mapping, index) => {
            this.createColorMappingSetting(containerEl, mapping, index);
        });

        new Setting(containerEl)
            .addButton(button => button
                .setButtonText('Add Color Mapping')
                .setCta()
                .onClick(() => {
                    this.plugin.settings.colorMappings.push({
                        color: '#ffffff',
                        sectionTitle: '## New Section',
                        template: '- {{text}} - {{note}}'
                    });
                    this.plugin.saveSettings();
                    this.display(); // Refresh the display
                }));
    }

    createColorMappingSetting(containerEl: HTMLElement, mapping: any, index: number) {
        const setting = new Setting(containerEl)
            .setName(`Color ${index + 1}`)
            .addColorPicker(color => color
                .setValue(mapping.color)
                .onChange(async (value) => {
                    this.plugin.settings.colorMappings[index].color = value;
                    await this.plugin.saveSettings();
                }))
            .addText(text => text
                .setPlaceholder('## Section Title')
                .setValue(mapping.sectionTitle)
                .onChange(async (value) => {
                    this.plugin.settings.colorMappings[index].sectionTitle = value;
                    await this.plugin.saveSettings();
                }))
            .addButton(button => button
                .setIcon('trash')
                .setTooltip('Remove this color mapping')
                .onClick(async () => {
                    this.plugin.settings.colorMappings.splice(index, 1);
                    await this.plugin.saveSettings();
                    this.display(); // Refresh the display
                }));

        // Add template setting as a separate setting below
        new Setting(containerEl)
            .setName('Template')
            .setDesc('Template for this highlight color. Use {{text}} for highlighted text and {{note}} for user notes.')
            .addTextArea(textArea => textArea
                .setPlaceholder('- {{text}} - {{note}}')
                .setValue(mapping.template || '- {{text}} - {{note}}')
                .onChange(async (value) => {
                    this.plugin.settings.colorMappings[index].template = value;
                    await this.plugin.saveSettings();
                }));
    }
}