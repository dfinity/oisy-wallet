import {
	MILLISECONDS_IN_DAY,
	NANO_SECONDS_IN_MILLISECOND,
	ZERO
} from '$lib/constants/app.constants';
import type { Languages } from '$lib/enums/languages';
import {
	isPersonalNoteDecryptionFailure,
	type PersonalNoteEntryUi
} from '$lib/types/personal-note';
import {
	formatNanosecondsToShortRelativeTime,
	formatSecondsToNormalizedDate
} from '$lib/utils/format.utils';

/**
 * A stable, opaque note id: a dash-less hex UUID — exactly 32 characters, so it
 * fits the backend's 32-byte `EncryptedMaps` entry key. Generated once when a
 * note is first created and reused across edits.
 */
export const generatePersonalNoteId = (): string => crypto.randomUUID().replaceAll('-', '');

/**
 * Length in Unicode code points (not UTF-16 units), so emoji / CJK / astral
 * characters count as the user sees them — matching the backend's code-point cap.
 */
export const personalNoteLength = (value: string): number => [...value].length;

/**
 * Unicode bidi / control formatting characters (LRE/RLE/PDF/LRO/RLO, the
 * isolates LRI/RLI/FSI/PDI, LRM/RLM/ALM). Note text is untrusted user input
 * rendered back into the DOM, so these are stripped on display so a note cannot
 * reorder or impersonate the surrounding UI (a spoofing surface that escaping
 * alone does not cover). See spec Decision 15.
 */
const BIDI_CONTROL_CHARACTERS = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/gu;

/** Neutralize bidi/control characters before a note is rendered as plain text. */
export const neutralizePersonalNoteText = (value: string): string =>
	value.replace(BIDI_CONTROL_CHARACTERS, '');

/**
 * A short single-line snippet of a note for the delete-confirmation prompt:
 * bidi-neutralized, whitespace-collapsed, and truncated to `max` Unicode code
 * points with an ellipsis (so the user can recognise which note they're deleting).
 */
export const personalNoteSnippet = ({
	value,
	max = 15
}: {
	value: string;
	max?: number;
}): string => {
	const text = neutralizePersonalNoteText(value).replace(/\s+/gu, ' ').trim();
	const codePoints = [...text];
	return codePoints.length > max ? `${codePoints.slice(0, max).join('')}…` : text;
};

/**
 * The list-row preview, split for display: the note's **first line** is the
 * de-facto `title` (shown bold), the **remaining lines** become the `body`
 * (whitespace-collapsed to a single line). Both are bidi-neutralized. A note
 * with no leading line (only blank lines) falls back to its first non-empty
 * content as the title. There is no stored title — this is display only.
 */
export const personalNotePreviewParts = (value: string): { title: string; body: string } => {
	const text = neutralizePersonalNoteText(value);
	const lines = text.split('\n');

	const firstNonEmptyIndex = lines.findIndex((line) => line.trim() !== '');
	if (firstNonEmptyIndex === -1) {
		return { title: '', body: '' };
	}

	const title = lines[firstNonEmptyIndex].trim();
	const body = lines
		.slice(firstNonEmptyIndex + 1)
		.join('\n')
		.replace(/\s+/gu, ' ')
		.trim();

	return { title, body };
};

/** A run of a note for display: plain `text`, or a link when `href` is set. */
export interface PersonalNoteTextSegment {
	text: string;
	href?: string;
}

// Only `http`/`https` URLs are auto-linked — never `javascript:` / `data:` / other
// schemes. The `href` therefore always comes from a matched http(s) URL.
const HTTP_URL_REGEX = /https?:\/\/[^\s]+/gu;

/**
 * Splits note text into plain-text and link segments for the read-only view
 * (Decision 16). The text is bidi-neutralized; only `http`/`https` URLs become
 * links, and each segment's `text` is rendered with Svelte's auto-escaping (never
 * `{@html}`), so the href is always a vetted scheme and nothing is injected.
 */
export const linkifyPersonalNote = (value: string): PersonalNoteTextSegment[] => {
	const text = neutralizePersonalNoteText(value);
	const segments: PersonalNoteTextSegment[] = [];
	let last = 0;

	for (const match of text.matchAll(HTTP_URL_REGEX)) {
		const start = match.index ?? 0;
		const [raw] = match;
		// Keep trailing sentence punctuation out of the link.
		const url = raw.replace(/[.,;:!?)\]}'"]+$/u, '');

		if (start > last) {
			segments.push({ text: text.slice(last, start) });
		}
		segments.push({ text: url, href: url });
		if (url.length < raw.length) {
			segments.push({ text: raw.slice(url.length) });
		}
		last = start + raw.length;
	}

	if (last < text.length) {
		segments.push({ text: text.slice(last) });
	}

	return segments;
};

/**
 * Formats a note's UTC epoch-nanoseconds timestamp (a decimal string) for
 * display in the user's local timezone, reusing OISY's date helpers: a short
 * relative time for the last two days ("5m ago", "3h ago", "1d ago"), an
 * absolute date otherwise (month + day, plus the year when it differs).
 */
export const formatPersonalNoteTimestamp = ({
	ns,
	language,
	currentDate
}: {
	ns: string;
	language?: Languages;
	currentDate?: Date;
}): string => {
	const nanoseconds = BigInt(ns);
	const milliseconds = Number(nanoseconds / NANO_SECONDS_IN_MILLISECOND);
	const now = currentDate ?? new Date();

	if (now.getTime() - milliseconds < MILLISECONDS_IN_DAY * 2) {
		return formatNanosecondsToShortRelativeTime({ nanoseconds, language, currentDate: now });
	}

	return formatSecondsToNormalizedDate({
		seconds: Math.floor(milliseconds / 1000),
		language,
		currentDate: now
	});
};

/** Sort decrypted notes newest-first by `updated_at_ns` (descending). */
export const comparePersonalNotesByUpdatedDesc = ({
	a,
	b
}: {
	a: PersonalNoteEntryUi;
	b: PersonalNoteEntryUi;
}): number => {
	// Failed-to-decrypt entries have no timestamp; keep them at the bottom.
	const toTimestamp = (entry: PersonalNoteEntryUi): bigint => {
		if (isPersonalNoteDecryptionFailure(entry)) {
			return ZERO;
		}
		try {
			return BigInt(entry.updated_at_ns);
		} catch {
			return ZERO;
		}
	};
	const aTs = toTimestamp(a);
	const bTs = toTimestamp(b);
	return bTs > aTs ? 1 : bTs < aTs ? -1 : 0;
};
