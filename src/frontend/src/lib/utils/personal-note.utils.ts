import { ZERO } from '$lib/constants/app.constants';
import {
	isPersonalNoteDecryptionFailure,
	type PersonalNoteEntryUi
} from '$lib/types/personal-note';

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
