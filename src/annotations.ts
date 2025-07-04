// src/annotations.ts

export interface EpubAnnotation {
    id: string;
    cfi: string;
    text: string;
    color: string;
    note?: string;
    timestamp: number;
}

export interface AnnotationSection {
    title: string;
    color: string;
    annotations: EpubAnnotation[];
}

/**
 * Parse annotations from markdown content
 */
export function parseAnnotationsFromMarkdown(content: string): EpubAnnotation[] {
    const annotations: EpubAnnotation[] = [];
    const annotationRegex = /<!--\s*EPUB_ANNOTATION:\s*({.*?})\s*-->/g;
    
    let match;
    while ((match = annotationRegex.exec(content)) !== null) {
        try {
            const annotation = JSON.parse(match[1]) as EpubAnnotation;
            annotations.push(annotation);
        } catch (error) {
            console.error("Failed to parse annotation:", error);
        }
    }
    
    return annotations;
}

/**
 * Convert annotation to markdown format with hidden metadata
 */
export function annotationToMarkdown(annotation: EpubAnnotation): string {
    const noteText = annotation.note ? ` - ${annotation.note}` : '';
    return `- ${annotation.text}${noteText}\n<!-- EPUB_ANNOTATION: ${JSON.stringify(annotation)} -->\n`;
}

/**
 * Generate section content for a specific color
 */
export function generateSectionContent(annotations: EpubAnnotation[], color: string): string {
    const colorAnnotations = annotations.filter(a => a.color === color);
    return colorAnnotations.map(a => annotationToMarkdown(a)).join('\n');
}
