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
    }
}