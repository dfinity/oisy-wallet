import type { MarkdownBlockType } from '$lib/types/markdown';
import { isNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
import type { marked as markedTypes, Renderer } from 'marked';

type Marked = typeof markedTypes;

export const getMarkdownBlocks = ({
	markdown,
	headingDesignator
}: {
	markdown: string;
	headingDesignator: string;
}): MarkdownBlockType[] =>
	markdown.split('\n\n').map((line: string) => {
		if (line.startsWith(headingDesignator)) {
			const title = line.slice(headingDesignator.length).trim();
			const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
			return { type: 'header', text: title, id };
		}
		return { type: 'default', text: line };
	});

// eslint-disable-next-line local-rules/prefer-object-params
export const targetBlankLinkRenderer = (
	href: Nullish<string>,
	title: Nullish<string>,
	text: string
): string =>
	`<a${
		href === null || href === undefined
			? ''
			: ` target="_blank" rel="noopener noreferrer" href="${href}"`
	}${title === null || title === undefined ? '' : ` title="${title}"`}>${
		text.length === 0 ? (href ?? title) : text
	}</a>`;

/**
 * Based on https://github.com/markedjs/marked/blob/master/src/Renderer.js#L186
 * @returns <a> tag to image
 */
// eslint-disable-next-line local-rules/prefer-object-params
export const imageToLinkRenderer = (
	src: Nullish<string>,
	title: Nullish<string>,
	alt: string
): string => {
	if (src === undefined || src === null || src?.length === 0) {
		return alt;
	}
	const fileExtension = src.includes('.') ? (src.split('.').pop() as string) : '';
	// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-type
	const typeProp = fileExtension === '' ? undefined : ` type="image/${fileExtension}"`;
	const titleDefined = title !== undefined && title !== null;
	const titleProp = titleDefined ? ` title="${title}"` : undefined;
	const text = alt === '' ? (titleDefined ? title : src) : alt;

	return `<a href="${src}" target="_blank" rel="noopener noreferrer"${typeProp ?? ''}${
		titleProp ?? ''
	}>${text}</a>`;
};

const escapeHtml = (html: string): string => html.replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeSvgs = (html: string): string => {
	// Early exit if no SVGs to process
	if (!/<svg\b[^>]*>/i.test(html)) {
		return html;
	}
	// Early exit if no code blocks - just escape all SVGs
	if (!/```[\s\S]*?```|`[^`\n]+`/g.test(html)) {
		return html.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, escapeHtml);
	}

	// Find all code blocks (both inline and fenced) and their positions
	const codeBlocks: Array<{ start: number; end: number }> = [];

	// Match fenced code blocks (```...```)
	const fencedCodeRegex = /```[\s\S]*?```/g;
	let match: RegExpExecArray | null;
	while ((match = fencedCodeRegex.exec(html)) !== null) {
		codeBlocks.push({ start: match.index, end: match.index + match[0].length });
	}

	// Match inline code (`...`)
	const inlineCodeRegex = /`[^`\n]+`/g;
	while ((match = inlineCodeRegex.exec(html)) !== null) {
		codeBlocks.push({ start: match.index, end: match.index + match[0].length });
	}

	// Helper function to check if a position is inside any code block
	const isInsideCodeBlock = (position: number): boolean =>
		codeBlocks.some((block) => position >= block.start && position < block.end);

	// Replace SVGs that are NOT inside code blocks
	return html.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, (svgMatch, offset) =>
		isInsideCodeBlock(offset) ? svgMatch : escapeHtml(svgMatch)
	);
};

/**
 * Escape <img> tags or convert them to links
 */
const transformImg = (img: string): string => {
	const src = img.match(/src="([^"]+)"/)?.[1];
	const alt = img.match(/alt="([^"]+)"/)?.[1] ?? 'img';
	const title = img.match(/title="([^"]+)"/)?.[1];
	const shouldEscape = isNullish(src) || src.startsWith('data:image');
	const imageHtml = shouldEscape ? escapeHtml(img) : imageToLinkRenderer(src, title, alt);

	return imageHtml;
};

/**
 * Avoid <img> tags; instead, apply the same logic as for markdown images by either escaping them or
 * converting them to links. Only the <img> tags themselves are transformed, so any surrounding HTML
 * in the same block — and additional <img> tags — are preserved and handled individually.
 */
export const htmlRenderer = (html: string): string =>
	html.replace(/<img\s+[^>]*>/gi, (imgTag) => transformImg(imgTag));

/**
 * Marked.js renderer for proposal summary.
 * Customized renderers
 * - targetBlankLinkRenderer
 * - imageToLinkRenderer
 * - htmlRenderer
 *
 * @param marked
 */
const proposalSummaryRenderer = (marked: Marked): Renderer => {
	const renderer = new marked.Renderer();

	renderer.link = targetBlankLinkRenderer;
	renderer.image = imageToLinkRenderer;
	renderer.html = htmlRenderer;

	return renderer;
};

/**
 * Uses markedjs.
 * Escape or transform to links some raw HTML tags (img, svg)
 * @see {@link https://github.com/markedjs/marked}
 */
export const markdownToHTML = async (text: string): Promise<string> => {
	// Replace the SVG elements in the HTML with their escaped versions to improve security.
	// It's not possible to do it with html renderer because the svg consists of multiple tags.
	const escapedText = escapeSvgs(text);

	const { marked }: { marked: Marked } = await import('marked');

	return marked(escapedText, {
		renderer: proposalSummaryRenderer(marked)
	});
};
