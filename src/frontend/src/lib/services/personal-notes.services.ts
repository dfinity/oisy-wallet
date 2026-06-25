import {
	deletePersonalNote as deletePersonalNoteApi,
	getPersonalNotes,
	getPersonalNotesCount,
	setPersonalNote as setPersonalNoteApi
} from '$lib/api/backend.api';
import { decryptPersonalNote, encryptPersonalNote } from '$lib/services/personal-notes.vetkeys';
import { personalNotesStore } from '$lib/stores/personal-notes.store';
import {
	isPersonalNoteDecryptionFailure,
	type PersonalNoteEntryUi,
	type PersonalNoteEnvelope,
	type PersonalNoteUi
} from '$lib/types/personal-note';
import { generatePersonalNoteId } from '$lib/utils/personal-note.utils';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

const nowNs = (): string => (BigInt(Date.now()) * 1_000_000n).toString();

const toUint8Array = (value: Uint8Array | number[]): Uint8Array =>
	value instanceof Uint8Array ? value : Uint8Array.from(value);

const refreshCount = async (identity: Identity): Promise<void> => {
	const count = await getPersonalNotesCount({ identity });
	personalNotesStore.setCount(Number(count));
};

/**
 * Fetches and decrypts all of the caller's notes and the count, populating the
 * store. A single note that fails to decrypt becomes a failure entry rather than
 * blanking the whole list (per-note isolation).
 */
export const loadPersonalNotes = async (identity: Identity): Promise<void> => {
	const [entries, count] = await Promise.all([
		getPersonalNotes({ identity }),
		getPersonalNotesCount({ identity })
	]);

	const decrypted: PersonalNoteEntryUi[] = await Promise.all(
		entries.map(async ({ note_id, encrypted_note }) => {
			try {
				const envelope = await decryptPersonalNote({
					encrypted: toUint8Array(encrypted_note),
					noteId: note_id,
					identity
				});
				return { id: note_id, ...envelope };
			} catch {
				return { id: note_id, decryptionFailed: true };
			}
		})
	);

	personalNotesStore.setLoaded({ entries: decrypted, count: Number(count) });
};

const lookupCreatedAtNs = (id: string): string | undefined => {
	const entry = get(personalNotesStore).entries?.[id];
	return entry === undefined || isPersonalNoteDecryptionFailure(entry)
		? undefined
		: entry.created_at_ns;
};

/**
 * Adds a new note (no `id`) or edits an existing one (same `id`). Editing keeps
 * the original `created_at_ns` and bumps `updated_at_ns`.
 */
export const savePersonalNote = async ({
	identity,
	id,
	note
}: {
	identity: Identity;
	id?: string;
	note: string;
}): Promise<PersonalNoteUi> => {
	const noteId = id ?? generatePersonalNoteId();
	const now = nowNs();
	const envelope: PersonalNoteEnvelope = {
		note,
		created_at_ns: id !== undefined ? (lookupCreatedAtNs(id) ?? now) : now,
		updated_at_ns: now
	};

	const encrypted = await encryptPersonalNote({ envelope, noteId, identity });
	await setPersonalNoteApi({ identity, note_id: noteId, encrypted_note: encrypted });

	const entry: PersonalNoteUi = { id: noteId, ...envelope };
	personalNotesStore.upsert(entry);
	await refreshCount(identity);
	return entry;
};

export const deletePersonalNote = async ({
	identity,
	id
}: {
	identity: Identity;
	id: string;
}): Promise<void> => {
	await deletePersonalNoteApi({ identity, note_id: id });
	personalNotesStore.remove(id);
	await refreshCount(identity);
};
