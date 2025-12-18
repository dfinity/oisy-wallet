import { browser } from '$app/environment';
import { MediaType } from '$lib/enums/media-type';
import { isEmptyString, isNullish, nonNullish } from '@dfinity/utils';

const toAbsUrl = (src: string): string | undefined => {
	const parsedSrc = src.trim();

	if (isEmptyString(parsedSrc)) {
		return;
	}

	// Ignore data URIs and fragments-only references
	if (parsedSrc.startsWith('data:') || parsedSrc.startsWith('#')) {
		return;
	}

	try {
		return new URL(parsedSrc).toString();
	} catch (_: unknown) {
		// We do not really care to analyze the error at this point
	}
};

const unique = (xs: string[]): string[] => Array.from(new Set(xs));

const isProbablySvg = ({ contentType, url }: { contentType: string; url: string }): boolean => {
	if (contentType.toLowerCase().includes('image/svg+xml')) {
		return true;
	}
	try {
		return new URL(url).pathname.toLowerCase().endsWith('.svg');
	} catch (_: unknown) {
		return false;
	}
};

const extractFromSvgText = (text: string): string[] => {
	const doc = new DOMParser().parseFromString(text, 'text/html');

	const out: string[] = [];

	// SVG 2: href, SVG 1.1: xlink:href
	const nodes = doc.querySelectorAll('image[href], image[xlink\\:href]');

	nodes.forEach((el) => {
		const href = el.getAttribute('href') ?? el.getAttribute('xlink:href');

		if (isNullish(href)) {
			return;
		}

		const abs = toAbsUrl(href);

		if (nonNullish(abs)) {
			out.push(abs);
		}
	});

	return unique(out);
};

const extractFromHtmlText = (text: string): string[] => {
	const doc = new DOMParser().parseFromString(text, 'text/html');

	const out: string[] = [];

	const imgNodes = doc.querySelectorAll('img[src]');

	const videoNodes = doc.querySelectorAll('video source[src]');

	// Direct video src (harmless + often useful)
	const videoDirectNodes = doc.querySelectorAll('video[src]');

	[...imgNodes, ...videoNodes, ...videoDirectNodes].forEach((el) => {
		const src = el.getAttribute('src');

		if (isNullish(src)) {
			return;
		}

		const abs = toAbsUrl(src);

		if (nonNullish(abs)) {
			out.push(abs);
		}
	});

	return unique(out);
};

export const extractMediaUrls = async (url: string): Promise<string[]> => {
	try {
		if (!browser) {
			return [];
		}

		const res = await fetch(url);

		const contentType = res.headers.get('Content-Type');

		if (isNullish(contentType)) {
			return [];
		}

		const text = await res.text();

		return isProbablySvg({ contentType, url })
			? extractFromSvgText(text)
			: extractFromHtmlText(text);
	} catch (_: unknown) {
		// We do not really care to analyze the error at this point
		return [];
	}
};

const getMediaType = (type: string): MediaType => {
	if (type.startsWith('image/') || type.startsWith('.gif')) {
		return MediaType.Img;
	}

	if (type.startsWith('video/')) {
		return MediaType.Video;
	}

	return MediaType.Other;
};

/**
 * Attempts to determine the media type and size of a remote resource by issuing
 * a HEAD request and inspecting response headers.
 *
 * Return value:
 * - `{ type, size }` where:
 *   - `type` is `null` when the media type cannot be determined
 *   - `size` is `null` when the size is unknown or unavailable
 *
 * It is preferable to return `null` instead of `undefined` to explicitly indicate
 * that an attempt to fetch the data was made. This allows consumers to
 * distinguish a failed or unsupported fetch from a not-yet-fetched state,
 * which can be represented separately (for example, using `undefined`).
 *
 * Notes:
 * - `size` is derived from the `Content-Length` header
 * - Network failures, CORS restrictions, DNS errors, or blocked HEAD requests
 *   result in `{ type: null, size: null }`
 * - This logic is best handled server-side to avoid CORS limitations
 *
 * @param url - The absolute URL of the media resource
 */
export const extractMediaTypeAndSize = async (
	url: string
): Promise<{ type: MediaType | null; size: number | null }> => {
	try {
		const parsedUrl = new URL(url);

		const response = await fetch(parsedUrl.href, { method: 'HEAD' });

		const typeHeader = response.headers.get('Content-Type');
		const sizeHeader = response.headers.get('Content-Length');

		const type = nonNullish(typeHeader) ? getMediaType(typeHeader) : null;

		const size =
			isNullish(sizeHeader) || Number.isNaN(Number(sizeHeader)) ? null : Number(sizeHeader);

		return { type, size };
	} catch (_: unknown) {
		// The error here is caused by `fetch`, which can fail for various reasons (network error, CORS, DNS, etc).
		// Empirically, it happens mostly for CORS policy block: we can't be sure that the media is valid or not.
		// Ideally, we should load this data in a backend service to avoid CORS issues.
	}

	return { type: null, size: null };
};
