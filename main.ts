import { Plugin } from 'obsidian';
import { EpubReaderSettings, DEFAULT_SETTINGS } from './src/settings';
import { EpubReaderSettingsTab } from './src/settingsTab'; // Import the settings tab
import { EpubView, EPUB_VIEW_TYPE } from './src/epubView';
import { TFile, WorkspaceLeaf } from 'obsidian';


export default class EpubReaderPlugin extends Plugin {
	settings: EpubReaderSettings;

// main.ts

//... (keep all your existing imports at the top)

//... (keep the `export default class MyEpubPlugin extends Plugin {...` part)

    async onload() {
        console.log("Loading EPUB Reader Plugin..."); // To confirm the plugin starts loading

        await this.loadSettings();
        this.addSettingTab(new EpubReaderSettingsTab(this.app, this));

        this.registerView(
            EPUB_VIEW_TYPE,
            (leaf: WorkspaceLeaf) => new EpubView(leaf, this)
        );

        // This adds a command to the command palette
        this.addCommand({
            id: 'open-associated-epub',
            name: 'Open associated EPUB',
            checkCallback: (checking: boolean) => {
                // This log helps confirm the command is being checked
                console.log(`Command 'open-associated-epub' check. Is it just checking? ${checking}`);

                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    return false;
                }

                const fileCache = this.app.metadataCache.getFileCache(activeFile);
                const epubPath = fileCache?.frontmatter?.[this.settings.epubLinkPropertyName];

                if (!epubPath) {
                    return false; // No epub link property, so the command is not available
                }

                // If we are just checking, we return true to enable the command.
                if (checking) {
                    return true;
                }

                // If we are not just checking, the user has executed the command.
                console.log(`Executing 'open-associated-epub' for: ${activeFile.path}`);
                this.openEpubView(activeFile);
                return true;
            },
        });

        // This registers an event listener for the file menu (right-click menu)
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                // This log helps confirm the event handler is firing
                console.log(`File menu event triggered for: ${file.path}`);

                // --- BUG FIX IS HERE ---
                // The check must be `instanceof TFile` and use a logical OR `||`.
                if (!(file instanceof TFile) || file.extension!== 'md') {
                    return; // Exit if it's not a markdown file
                }

                const fileCache = this.app.metadataCache.getFileCache(file);
                const epubPath = fileCache?.frontmatter?.[this.settings.epubLinkPropertyName];

                if (epubPath) {
                    console.log(`Found EPUB link in ${file.path}. Adding menu item.`);
                    menu.addItem((item) => {
                        item
                          .setTitle('Open associated EPUB')
                          .setIcon('book-open')
                          .onClick(() => {
                                console.log(`Menu item clicked for: ${file.path}`);
                                this.openEpubView(file);
                            });
                    });
                }
            })
        );

        console.log("EPUB Reader Plugin loaded successfully.");
    }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
        await this.saveData(this.settings);
    }


	async openEpubView(companionFile: TFile) {

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			return false;
		}

		const fileCache = this.app.metadataCache.getFileCache(activeFile);
		const epubPath = fileCache?.frontmatter?.[this.settings.epubLinkPropertyName];
		console.log(`Opening EPUB view for companion file: ${companionFile.path}`);
		console.log(`EPUB path from frontmatter: ${epubPath}`);

		// Get a new leaf (tab) to display our view in
		const leaf = this.app.workspace.getLeaf(true);

		// Set the state of the leaf to our custom view
		await leaf.setViewState({
			type: EPUB_VIEW_TYPE,
			state: {
				// This is where we pass the path of the markdown note to the view
				companionFile: activeFile,
				settings: this.settings
			},
		});

		// Make sure our new leaf is the active one
		this.app.workspace.revealLeaf(leaf);
	}


    onunload() {
        console.log("Unloading EPUB Reader Plugin");
    }
}