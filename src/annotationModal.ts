// src/annotationModal.ts

import { App, Modal, Setting } from 'obsidian';

export class AnnotationNoteModal extends Modal {
    private text: string;
    private onSubmit: (note: string) => void;
    private noteInput: string = '';

    constructor(app: App, text: string, onSubmit: (note: string) => void) {
        super(app);
        this.text = text;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        console.log('Opening Annotation Note Modal');
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Add Note to Highlight' });
        
        contentEl.createEl('p', { 
            text: `Selected text: "${this.text.length > 100 ? this.text.substring(0, 100) + '...' : this.text}"` 
        });

        new Setting(contentEl)
            .setName('Note (optional)')
            .setDesc('Add a personal note to this highlight')
            .addTextArea(text => {
                text.setPlaceholder('Enter your note here...')
                    .setValue(this.noteInput)
                    .onChange((value) => {
                        this.noteInput = value;
                    });
                
                return text;
            });

        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;';

        const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelButton.onclick = () => this.close();

        const saveButton = buttonContainer.createEl('button', { text: 'Save Highlight' });
        saveButton.classList.add('mod-cta');
        saveButton.onclick = () => {
            this.onSubmit(this.noteInput);
            this.close();
        };
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
