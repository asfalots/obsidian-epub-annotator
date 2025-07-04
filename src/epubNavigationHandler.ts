// src/epubNavigationHandler.ts

export class EpubNavigationHandler {
    private rendition: any;
    private book: any;

    constructor(book: any, rendition: any) {
        this.book = book;
        this.rendition = rendition;
    }

    /**
     * Set up keyboard navigation for the EPUB reader
     */
    setupKeyboardNavigation(container: HTMLElement, onKeyPress: (event: KeyboardEvent) => void) {
        // Make container focusable for keyboard events only
        container.tabIndex = -1;
        
        // Add keydown listener to container (not passive)
        container.addEventListener('keydown', onKeyPress, { passive: false });
    }

    /**
     * Handle keyboard navigation events
     */
    handleKeyPress(event: KeyboardEvent): boolean {
        // If there's no book or rendition, do nothing
        if (!this.book || !this.rendition) return false;

        const isRtl = this.book.package.metadata.direction === 'rtl';
        let nextPage = isRtl ? () => this.rendition.prev() : () => this.rendition.next();
        let prevPage = isRtl ? () => this.rendition.next() : () => this.rendition.prev();

        switch (event.key) {
            case 'ArrowLeft':
                prevPage();
                event.preventDefault();
                event.stopPropagation();
                console.debug("Left arrow pressed, going to previous page.");
                return true;
            case 'ArrowRight':
                nextPage();
                event.preventDefault();
                event.stopPropagation();
                console.debug("Right arrow pressed, going to next page.");
                return true;
            default:
                return false;
        }
    }

    /**
     * Navigate to next page
     */
    nextPage() {
        if (!this.rendition) return;
        this.rendition.next();
    }

    /**
     * Navigate to previous page
     */
    prevPage() {
        if (!this.rendition) return;
        this.rendition.prev();
    }
}
