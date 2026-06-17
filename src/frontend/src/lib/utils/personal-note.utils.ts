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
 * The list-row preview: bidi-neutralized, with line breaks and whitespace runs
 * collapsed to a single space so a multi-line note reads as one flowing line
 * (the full note keeps its line breaks in the editor / full view).
 */
export const personalNotePreview = (value: string): string =>
	neutralizePersonalNoteText(value).replace(/\s+/gu, ' ').trim();

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
	const aTs = isPersonalNoteDecryptionFailure(a) ? ZERO : BigInt(a.updated_at_ns);
	const bTs = isPersonalNoteDecryptionFailure(b) ? ZERO : BigInt(b.updated_at_ns);
	return bTs > aTs ? 1 : bTs < aTs ? -1 : 0;
};
