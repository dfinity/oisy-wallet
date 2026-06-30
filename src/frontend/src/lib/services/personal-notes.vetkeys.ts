import {
	getPersonalNotesEncryptedVetkey,
	getPersonalNotesVetkeyPublicKey
} from '$lib/api/backend.api';
import type { PersonalNoteEnvelope } from '$lib/types/personal-note';
import { nonNullish } from '@dfinity/utils';
import {
	DerivedKeyMaterial,
	DerivedPublicKey,
	EncryptedVetKey,
	TransportSecretKey
} from '@dfinity/vetkeys';
import type { Identity } from '@icp-sdk/core/agent';
import type { Principal } from '@icp-sdk/core/principal';
import { get, set } from 'idb-keyval';

// These MUST match the backend (`personal_notes::PERSONAL_NOTES_DOMAIN_SEPARATOR`
// and `PERSONAL_NOTES_MAP_NAME`). They are bound into the vetKD key derivation,
// so any drift would make every stored note permanently undecryptable.
const PERSONAL_NOTES_MAP_NAME = 'personal_notes';
const MAP_NAME_BYTE_LENGTH = 32;

const mapNameBytes = (): Uint8Array => {
	const encoded = new TextEncoder().encode(PERSONAL_NOTES_MAP_NAME);
	if (encoded.length > MAP_NAME_BYTE_LENGTH) {
		throw new Error(`PERSONAL_NOTES_MAP_NAME exceeds ${MAP_NAME_BYTE_LENGTH} bytes`);
	}
	const bytes = new Uint8Array(MAP_NAME_BYTE_LENGTH);
	bytes.set(encoded);
	return bytes;
};

// Mirrors the backend's `key_id_to_vetkd_input`: a length-prefixed principal
// followed by the 32-byte map name. The verification key already carries the
// domain separator, so it is not repeated here.
const vetkdInput = (principal: Principal): Uint8Array => {
	const principalBytes = principal.toUint8Array();
	const name = mapNameBytes();
	const input = new Uint8Array(1 + principalBytes.length + name.length);
	input[0] = principalBytes.length;
	input.set(principalBytes, 1);
	input.set(name, 1 + principalBytes.length);
	return input;
};

const idbCacheKey = (principal: Principal): string => `personal-notes-vetkey-${principal.toText()}`;

// Per-session, per-principal cache of the derived key material so repeated
// encrypt/decrypt calls don't hit IndexedDB each time.
const sessionCache = new Map<string, Promise<DerivedKeyMaterial>>();

const toUint8Array = (value: Uint8Array | number[]): Uint8Array =>
	value instanceof Uint8Array ? value : Uint8Array.from(value);

/**
 * Derives (or loads) the caller's per-user symmetric key material. The
 * non-extractable `CryptoKey` is cached in IndexedDB so the vetKD round-trip
 * happens at most once per device, and in memory for the session.
 */
const deriveKeyMaterial = ({ identity }: { identity: Identity }): Promise<DerivedKeyMaterial> => {
	const principal = identity.getPrincipal();
	const cacheKey = principal.toText();

	const cached = sessionCache.get(cacheKey);
	if (nonNullish(cached)) {
		return cached;
	}

	const promise = (async (): Promise<DerivedKeyMaterial> => {
		const storedCryptoKey = await get<CryptoKey>(idbCacheKey(principal));
		if (nonNullish(storedCryptoKey)) {
			return DerivedKeyMaterial.fromCryptoKey(storedCryptoKey);
		}

		const transportSecretKey = TransportSecretKey.random();
		const [encryptedVetkey, verificationKey] = await Promise.all([
			getPersonalNotesEncryptedVetkey({
				identity,
				transportPublicKey: transportSecretKey.publicKeyBytes()
			}),
			getPersonalNotesVetkeyPublicKey({ identity })
		]);

		const vetKey = EncryptedVetKey.deserialize(toUint8Array(encryptedVetkey)).decryptAndVerify(
			transportSecretKey,
			DerivedPublicKey.deserialize(toUint8Array(verificationKey)),
			vetkdInput(principal)
		);

		const derivedKeyMaterial = await vetKey.asDerivedKeyMaterial();
		await set(idbCacheKey(principal), derivedKeyMaterial.getCryptoKey());
		return derivedKeyMaterial;
	})();

	sessionCache.set(cacheKey, promise);

	// Don't keep a rejected derivation cached — allow the next call to retry.
	return promise.catch((err: unknown) => {
		sessionCache.delete(cacheKey);
		throw err;
	});
};

// The note id is used as the AES-GCM domain separator, binding each ciphertext
// to its entry. The lower-level *WithKey helpers are exported for unit tests
// that inject a known key (no vetKD round-trip needed).

export const encryptPersonalNoteWithKey = ({
	keyMaterial,
	envelope,
	noteId
}: {
	keyMaterial: DerivedKeyMaterial;
	envelope: PersonalNoteEnvelope;
	noteId: string;
}): Promise<Uint8Array> => keyMaterial.encryptMessage(JSON.stringify(envelope), noteId);

export const decryptPersonalNoteWithKey = async ({
	keyMaterial,
	encrypted,
	noteId
}: {
	keyMaterial: DerivedKeyMaterial;
	encrypted: Uint8Array;
	noteId: string;
}): Promise<PersonalNoteEnvelope> => {
	const bytes = await keyMaterial.decryptMessage(encrypted, noteId);
	return JSON.parse(new TextDecoder().decode(bytes)) as PersonalNoteEnvelope;
};

export const encryptPersonalNote = async ({
	envelope,
	noteId,
	identity
}: {
	envelope: PersonalNoteEnvelope;
	noteId: string;
	identity: Identity;
}): Promise<Uint8Array> => {
	const keyMaterial = await deriveKeyMaterial({ identity });
	return encryptPersonalNoteWithKey({ keyMaterial, envelope, noteId });
};

export const decryptPersonalNote = async ({
	encrypted,
	noteId,
	identity
}: {
	encrypted: Uint8Array;
	noteId: string;
	identity: Identity;
}): Promise<PersonalNoteEnvelope> => {
	const keyMaterial = await deriveKeyMaterial({ identity });
	return decryptPersonalNoteWithKey({ keyMaterial, encrypted, noteId });
};

/** Clears the in-memory key cache (e.g. on sign-out). */
export const resetPersonalNotesKeyCache = (): void => sessionCache.clear();
