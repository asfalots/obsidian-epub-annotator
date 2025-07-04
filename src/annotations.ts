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
 * Convert annotation to markdown format with template and hidden metadata
 */
export function annotationToMarkdown(annotation: EpubAnnotation, template?: string, companionFilePath?: string): string {
    if (template) {
        const renderedContent = renderTemplate(template, annotation, companionFilePath);
        return `${renderedContent}\n<!-- EPUB_ANNOTATION: ${JSON.stringify(annotation)} -->\n`;
    }
    
    // Fallback to default format
    const noteText = annotation.note ? ` - ${annotation.note}` : '';
    return `- ${annotation.text}${noteText}\n<!-- EPUB_ANNOTATION: ${JSON.stringify(annotation)} -->\n`;
}

/**
 * Generate section content for a specific color with template
 */
export function generateSectionContent(annotations: EpubAnnotation[], color: string, template?: string, companionFilePath?: string): string {
    const colorAnnotations = annotations.filter(a => a.color === color);
    return colorAnnotations.map(a => annotationToMarkdown(a, template, companionFilePath)).join('\n');
}

/**
 * Render template with annotation data
 */
export function renderTemplate(template: string, annotation: EpubAnnotation, companionFilePath?: string): string {
    let rendered = template;
    
    // Replace {{text}} with annotation text
    rendered = rendered.replace(/\{\{text\}\}/g, annotation.text);
    
    // Replace {{note}} with annotation note
    rendered = rendered.replace(/\{\{note\}\}/g, annotation.note || '');
    
    // Replace {{link}} with Obsidian URI to open EPUB at specific location
    if (companionFilePath) {
        const obsidianUri = `obsidian://epub-annotator?file=${encodeURIComponent(companionFilePath)}&cfi=${encodeURIComponent(annotation.cfi)}`;
        rendered = rendered.replace(/\{\{link\}\}/g, obsidianUri);
    } else {
        rendered = rendered.replace(/\{\{link\}\}/g, '');
    }
    
    return rendered;
}
