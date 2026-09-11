import type { PersonalNoteShareContentEnvelope } from '$lib/types/personal-note-share';
import {
	fromBase64Url,
	randomBase64Url,
	randomBytes,
	toBase64Url
} from '$lib/utils/base64url.utils';

/**
 * Per-share symmetric crypto for note sharing. Each share gets a fresh random
 * AES-GCM-256 key that never leaves the browser — it is embedded only in the
 * link fragment (`#k=…`), which is never sent to the canister. The canister
 * stores the ciphertext under an opaque, independent random token.
 *
 * This deliberately calls WebCrypto {@link SubtleCrypto} directly rather than
 * reusing the per-user vetKeys path (`personal-notes.vetkeys`): a share must be
 * readable by a logged-out recipient who can derive no vetKD key, and the
 * public recipient page must not pull the vetKD machinery into its bundle. The
 * two paths are intentionally independent.
 *
 * Wire format of every ciphertext: `iv (12 bytes) ‖ AES-GCM(ct+tag)`. The
 * random 96-bit IV is generated per encryption and prepended. The share token
 * is bound in as additional authenticated data (AAD, `<token>:note`), so a
 * ciphertext cannot be replayed under a different token.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH_BITS = 256;
const IV_LENGTH_BYTES = 12;
const TOKEN_LENGTH_BYTES = 16;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const encodeUtf8 = (value: string): Uint8Array<ArrayBuffer> =>
	new Uint8Array(textEncoder.encode(value));

/** A fresh, opaque 128-bit token (base64url), unrelated to the note id. */
export const generateShareToken = (): string => randomBase64Url(TOKEN_LENGTH_BYTES);

/**
 * A fresh random AES-GCM-256 key. Extractable so it can be serialized into the
 * link fragment via {@link exportShareKey}; it is used to encrypt on the
 * creator side and never persisted.
 */
export const generateShareKey = (): Promise<CryptoKey> =>
	crypto.subtle.generateKey({ name: ALGORITHM, length: KEY_LENGTH_BITS }, true, [
		'encrypt',
		'decrypt'
	]);

/** Serializes a share key to base64url for the link fragment. */
export const exportShareKey = async (key: CryptoKey): Promise<string> =>
	toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', key)));

/**
 * Imports a share key from its base64url fragment representation. Non-
 * extractable and decrypt-only: the recipient only ever decrypts, and the key
 * should not be re-exportable once loaded from a link.
 */
export const importShareKey = (rawBase64Url: string): Promise<CryptoKey> =>
	crypto.subtle.importKey('raw', fromBase64Url(rawBase64Url), { name: ALGORITHM }, false, [
		'decrypt'
	]);

const contentAad = (token: string): Uint8Array<ArrayBuffer> => encodeUtf8(`${token}:note`);

const encrypt = async ({
	key,
	plaintext,
	aad
}: {
	key: CryptoKey;
	plaintext: Uint8Array<ArrayBuffer>;
	aad: Uint8Array<ArrayBuffer>;
}): Promise<Uint8Array<ArrayBuffer>> => {
	const iv = randomBytes(IV_LENGTH_BYTES);
	const ciphertext = new Uint8Array(
		await crypto.subtle.encrypt({ name: ALGORITHM, iv, additionalData: aad }, key, plaintext)
	);
	const output = new Uint8Array(iv.length + ciphertext.length);
	output.set(iv);
	output.set(ciphertext, iv.length);
	return output;
};

const decrypt = async ({
	key,
	data,
	aad
}: {
	key: CryptoKey;
	data: Uint8Array<ArrayBuffer>;
	aad: Uint8Array<ArrayBuffer>;
}): Promise<Uint8Array<ArrayBuffer>> => {
	const iv = data.slice(0, IV_LENGTH_BYTES);
	const ciphertext = data.slice(IV_LENGTH_BYTES);
	return new Uint8Array(
		await crypto.subtle.decrypt({ name: ALGORITHM, iv, additionalData: aad }, key, ciphertext)
	);
};

export const encryptShareContent = ({
	key,
	content,
	token
}: {
	key: CryptoKey;
	content: PersonalNoteShareContentEnvelope;
	token: string;
}): Promise<Uint8Array<ArrayBuffer>> =>
	encrypt({ key, plaintext: encodeUtf8(JSON.stringify(content)), aad: contentAad(token) });

export const decryptShareContent = async ({
	key,
	ciphertext,
	token
}: {
	key: CryptoKey;
	ciphertext: Uint8Array;
	token: string;
}): Promise<PersonalNoteShareContentEnvelope> => {
	const bytes = await decrypt({ key, data: new Uint8Array(ciphertext), aad: contentAad(token) });
	return JSON.parse(textDecoder.decode(bytes)) as PersonalNoteShareContentEnvelope;
};
