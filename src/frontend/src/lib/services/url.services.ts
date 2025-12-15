import { browser } from '$app/environment';
import { isEmptyString, isNullish, nonNullish } from '@dfinity/utils';

const toAbsUrl = (src: string): string | undefined => {
	const v = src.trim();

	if (isEmptyString(v)) {
		return;
	}

	// Ignore data URIs and fragments-only references
	if (v.startsWith('data:') || v.startsWith('#')) {
		return;
	}

	try {
		return new URL(v).toString();
	} catch (_: unknown) {
		// We do not really care to analyze the error at this point
	}
};

const unique = (xs: string[]): string[] => Array.from(new Set(xs));

const isProbablySvg = ({ contentType, url }: { contentType: string; url: string }): boolean =>
	contentType.toLowerCase().includes('image/svg+xml') ||
	new URL(url).pathname.toLowerCase().endsWith('.svg');

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
