import { Plugin } from 'obsidian';
import { EpubView, EPUB_VIEW_TYPE } from "./epub-view";
import { EpubReaderSettings, DEFAULT_SETTINGS } from './src/settings';
import { EpubReaderSettingsTab } from './src/settingsTab'; // Import the settings tab

export default class EpubReaderPlugin extends Plugin {
	settings: EpubReaderSettings;

    async onload() {
        console.log("Loading EPUB Reader Plugin");
		// Load settings
		await this.loadSettings();

        // 1. Register the View for the .epub file extension
        this.registerView(
            EPUB_VIEW_TYPE,
            (leaf) => new EpubView(leaf)
        );

        // 2. Register the extension so Obsidian knows our plugin can handle it
        this.registerExtensions(["epub"], EPUB_VIEW_TYPE);

        // 3. Add the settings tab
        this.addSettingTab(new EpubReaderSettingsTab(this.app, this));
    }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        console.log("Unloading EPUB Reader Plugin");
    }
}