import { consoleError } from '$lib/utils/console.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import DOMPurify, { type Config } from 'dompurify';

let domPurify: typeof DOMPurify | undefined = undefined;

/**
 * Markup a text authored by a third party is allowed to produce.
 *
 * It covers what Markdown can render and nothing else. Notably, form controls are excluded so that
 * such a text can never contribute a control to one of our flows, and `style` is excluded - both as
 * a tag and as an attribute - so that it can never hide or repaint what we display next to it.
 */
const UNTRUSTED_CONFIG: Config = {
	ALLOWED_TAGS: [
		'a',
		'b',
		'blockquote',
		'br',
		'code',
		'del',
		'em',
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6',
		'hr',
		'i',
		'li',
		'ol',
		'p',
		'pre',
		's',
		'strong',
		'sub',
		'sup',
		'table',
		'tbody',
		'td',
		'th',
		'thead',
		'tr',
		'ul'
	],
	ALLOWED_ATTR: ['align', 'colspan', 'href', 'lang', 'rowspan', 'title']
};

/**
 * A workaround to preserve target="_blank" attribute from sanitizer.
 * Utilizes data-target flag (set by flagTargetAttributeHook).
 *
 * Inspired by https://github.com/cure53/DOMPurify/issues/317#issuecomment-912474068
 */
const restoreTargetAttributeHook = (node: Element) => {
	if (node.getAttribute('data-target') === 'blank') {
		// Use provided "rel" value if it contains "noopener" or "noreferrer" (https://web.dev/external-anchors-use-rel-noopener/)
		// otherwise fall back to the pair we require on external links everywhere else.
		// `sanitizeUntrusted` drops "rel" as an unlisted attribute, so a third-party link always
		// lands on that fallback rather than on a value its author picked.
		// split() to avoid invalid values (e.g. "noopenernoreferrer")
		const originRel = node.getAttribute('rel') ?? '';
		const parts = originRel.split(/\s+/);
		const rel =
			parts.includes('noopener') || parts.includes('noreferrer')
				? originRel
				: 'noopener noreferrer';

		node.setAttribute('target', '_blank');
		node.setAttribute('rel', rel);

		// remove the flag
		node.removeAttribute('data-target');
	}
};

/**
 * Add the data attribute because "target" will be removed by sanitizer
 */
const flagTargetAttributeHook = (node: Element) => {
	if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
		node.setAttribute('data-target', 'blank');
	}
	return node;
};

const sanitizeWithConfig = ({ text, config }: { text: string; config?: Config }): string => {
	try {
		// DOMPurify initialization
		if (isNullish(domPurify)) {
			domPurify = DOMPurify;

			// Preserve target="_blank" (flagged via data-target) across sanitization
			domPurify.addHook('beforeSanitizeAttributes', flagTargetAttributeHook);
			domPurify.addHook('afterSanitizeAttributes', restoreTargetAttributeHook);
		}

		return nonNullish(config) ? domPurify.sanitize(text, config) : domPurify.sanitize(text);
	} catch (err: unknown) {
		consoleError('Failed to sanitize HTML content', err);
	}

	return '';
};

/**
 * Sanitize a text with DOMPurify.
 *
 * For a text we do not author ourselves - e.g. anything derived from data a third party supplies -
 * use `sanitizeUntrusted` instead.
 */
export const sanitize = (text: string): string => sanitizeWithConfig({ text });

/**
 * Sanitize a text authored by a third party, keeping only the markup listed in `UNTRUSTED_CONFIG`.
 */
export const sanitizeUntrusted = (text: string): string =>
	sanitizeWithConfig({ text, config: UNTRUSTED_CONFIG });

let elementsCounters: Record<string, number> = {};

export const nextElementId = (prefix: string): string => {
	elementsCounters = {
		...elementsCounters,
		[prefix]: (elementsCounters[prefix] ?? 0) + 1
	};

	return `${prefix}${elementsCounters[prefix]}`;
};
