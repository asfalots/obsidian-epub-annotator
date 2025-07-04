import { Plugin, Notice } from 'obsidian';
import { EpubReaderSettings, DEFAULT_SETTINGS } from './src/settings';
import { EpubReaderSettingsTab } from './src/settingsTab';
import { EpubView, EPUB_VIEW_TYPE } from './src/epubView';
import { TFile, WorkspaceLeaf } from 'obsidian';
import { EpubAnnotation, parseAnnotationsFromMarkdown, generateSectionContent } from './src/annotations';


export default class EpubReaderPlugin extends Plugin {
	settings: EpubReaderSettings;

// main.ts

//... (keep all your existing imports at the top)

//... (keep the `export default class MyEpubPlugin extends Plugin {...` part)

    async onload() {
        console.info("Loading EPUB Reader Plugin..."); // To confirm the plugin starts loading

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

        // Add command to reorganize annotations by color
        this.addCommand({
            id: 'reorganize-annotations',
            name: 'Reorganize EPUB annotations by color',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile || activeFile.extension !== 'md') {
                    return false;
                }

                if (checking) {
                    return true;
                }

                this.reorganizeAnnotations(activeFile);
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

        // Register protocol handler for EPUB annotation links
        this.registerObsidianProtocolHandler('epub-annotator', (params) => {
            this.handleEpubAnnotatorUri(params);
        });

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
		console.debug(`Opening EPUB view for companion file: ${companionFile.path}`);
		console.debug(`EPUB path from frontmatter: ${epubPath}`);

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


    async saveReadingProgress(file: TFile, cfi: string) {
        try {
            await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
                // Use the property name from our settings
                const propertyName = this.settings.progressPropertyName;
                frontmatter[propertyName] = cfi;
                console.debug(`Saving progress CFI to ${file.path}: ${cfi}`);
            });
        } catch (error) {
            console.error("Error saving reading progress:", error);
        }
    }

    async reorganizeAnnotations(file: TFile) {
        try {
            const content = await this.app.vault.read(file);
            const annotations = parseAnnotationsFromMarkdown(content);
            
            if (annotations.length === 0) {
                new Notice('No annotations found in this note');
                return;
            }

            // Remove existing annotation sections and comments
            let cleanContent = content.replace(/<!--\s*EPUB_ANNOTATION:.*?-->/g, '');
            
            // Remove empty annotation sections
            this.settings.colorMappings.forEach(mapping => {
                const sectionRegex = new RegExp(`\n*${mapping.sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\n*(?:- .*\n)*`, 'gm');
                cleanContent = cleanContent.replace(sectionRegex, '');
            });

            // Add reorganized sections
            let newContent = cleanContent.trim();
            
            this.settings.colorMappings.forEach(mapping => {
                const sectionContent = generateSectionContent(annotations, mapping.color, mapping.template, file.path);
                if (sectionContent.trim()) {
                    newContent += `\n\n${mapping.sectionTitle}\n\n${sectionContent}`;
                }
            });

            await this.app.vault.modify(file, newContent);
            new Notice('Annotations reorganized by color');
        } catch (error) {
            console.error("Error reorganizing annotations:", error);
            new Notice('Failed to reorganize annotations');
        }
    }

    /**
     * Handle custom URI for opening EPUB at specific annotation location
     */
    async handleEpubAnnotatorUri(params: any) {
        const { file: filePath, cfi } = params;
        
        if (!filePath || !cfi) {
            new Notice('Invalid EPUB annotation link');
            return;
        }

        try {
            // Find the companion file
            const companionFile = this.app.vault.getAbstractFileByPath(decodeURIComponent(filePath));
            if (!(companionFile instanceof TFile)) {
                new Notice('Could not find the associated note file');
                return;
            }

            // Open the EPUB view
            await this.openEpubView(companionFile);
            
            // Wait a moment for the view to initialize, then navigate to the CFI
            setTimeout(async () => {
                const epubView = this.getActiveEpubView();
                if (epubView && epubView.rendition) {
                    try {
                        await epubView.rendition.display(decodeURIComponent(cfi));
                        new Notice('Navigated to annotation location');
                    } catch (error) {
                        console.error('Failed to navigate to CFI:', error);
                        new Notice('Could not navigate to annotation location');
                    }
                }
            }, 1000);
        } catch (error) {
            console.error('Error handling EPUB annotation URI:', error);
            new Notice('Failed to open EPUB annotation');
        }
    }

    /**
     * Get the currently active EPUB view if any
     */
    private getActiveEpubView(): any {
        const leaves = this.app.workspace.getLeavesOfType(EPUB_VIEW_TYPE);
        return leaves.length > 0 ? leaves[0].view : null;
    }

    onunload() {
        console.debug("Unloading EPUB Reader Plugin");
    }
}