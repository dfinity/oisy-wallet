import {
	deletePersonalNote as deletePersonalNoteApi,
	getPersonalNotes,
	getPersonalNotesCount,
	setPersonalNote as setPersonalNoteApi
} from '$lib/api/backend.api';
import {
	decryptPersonalNoteWithKey,
	deriveKeyMaterial,
	encryptPersonalNote,
	resetPersonalNotesKeyCache
} from '$lib/services/personal-notes.vetkeys';
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

const ownerPrincipal = (identity: Identity): string => identity.getPrincipal().toText();

const assertPersonalNotesOwner = (owner: string): void => {
	if (get(personalNotesStore).ownerPrincipal !== owner) {
		throw new Error('Personal notes cache does not belong to the current identity.');
	}
};

export const resetPersonalNotesSession = (): void => {
	personalNotesStore.reset();
	resetPersonalNotesKeyCache();
};

const refreshCount = async (identity: Identity, owner: string): Promise<void> => {
	const count = await getPersonalNotesCount({ identity });
	personalNotesStore.setCount({ ownerPrincipal: owner, count: Number(count) });
};

/**
 * Fetches and decrypts all of the caller's notes and the count, populating the
 * store. A single note that fails to decrypt becomes a failure entry rather than
 * blanking the whole list (per-note isolation).
 */
export const loadPersonalNotes = async (identity: Identity): Promise<void> => {
	const owner = ownerPrincipal(identity);
	personalNotesStore.beginLoad({ ownerPrincipal: owner });

	const [entries, count] = await Promise.all([
		getPersonalNotes({ identity }),
		getPersonalNotesCount({ identity })
	]);

	// Derive the key once up-front so a systemic vetKD/derivation failure rejects
	// the load (surfacing a real error) instead of every note decoding as a
	// per-note failure. Skip it when there are no notes so an empty list still
	// loads without a needless round-trip.
	let decrypted: PersonalNoteEntryUi[] = [];
	if (entries.length > 0) {
		const keyMaterial = await deriveKeyMaterial({ identity });
		decrypted = await Promise.all(
			entries.map(async ({ note_id, encrypted_note }) => {
				try {
					const envelope = await decryptPersonalNoteWithKey({
						keyMaterial,
						encrypted: toUint8Array(encrypted_note),
						noteId: note_id
					});
					return { id: note_id, ...envelope };
				} catch {
					return { id: note_id, decryptionFailed: true };
				}
			})
		);
	}

	personalNotesStore.setLoaded({ ownerPrincipal: owner, entries: decrypted, count: Number(count) });
};

const lookupCreatedAtNs = ({ id, owner }: { id: string; owner: string }): string | undefined => {
	assertPersonalNotesOwner(owner);

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
	const owner = ownerPrincipal(identity);
	assertPersonalNotesOwner(owner);

	const noteId = id ?? generatePersonalNoteId();
	const now = nowNs();
	const envelope: PersonalNoteEnvelope = {
		note,
		created_at_ns: id !== undefined ? (lookupCreatedAtNs({ id, owner }) ?? now) : now,
		updated_at_ns: now
	};

	const encrypted = await encryptPersonalNote({ envelope, noteId, identity });
	await setPersonalNoteApi({ identity, note_id: noteId, encrypted_note: encrypted });

	const entry: PersonalNoteUi = { id: noteId, ...envelope };
	personalNotesStore.upsert({ ownerPrincipal: owner, entry });
	await refreshCount(identity, owner);
	return entry;
};

export const deletePersonalNote = async ({
	identity,
	id
}: {
	identity: Identity;
	id: string;
}): Promise<void> => {
	const owner = ownerPrincipal(identity);
	assertPersonalNotesOwner(owner);

	await deletePersonalNoteApi({ identity, note_id: id });
	personalNotesStore.remove({ ownerPrincipal: owner, id });
	await refreshCount(identity, owner);
};
