import { Plugin } from 'obsidian';
import { EpubView, EPUB_VIEW_TYPE } from "./epub-view";

export default class EpubReaderPlugin extends Plugin {

    async onload() {
        console.log("Loading EPUB Reader Plugin");

        // 1. Register the View for the .epub file extension
        this.registerView(
            EPUB_VIEW_TYPE,
            (leaf) => new EpubView(leaf)
        );

        // 2. Register the extension so Obsidian knows our plugin can handle it
        this.registerExtensions(["epub"], EPUB_VIEW_TYPE);
    }

    onunload() {
        console.log("Unloading EPUB Reader Plugin");
    }
}