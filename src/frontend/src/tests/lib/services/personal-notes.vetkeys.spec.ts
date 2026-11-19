import * as backendApi from '$lib/api/backend.api';
import {
	decryptPersonalNote,
	decryptPersonalNoteWithKey,
	encryptPersonalNote,
	encryptPersonalNoteWithKey,
	purgeLegacyPersonalNotesVetkeyCache,
	resetPersonalNotesKeyCache
} from '$lib/services/personal-notes.vetkeys';
import type { PersonalNoteEnvelope } from '$lib/types/personal-note';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { DerivedKeyMaterial } from '@dfinity/vetkeys';
import * as idbKeyval from 'idb-keyval';

// Keep the real `DerivedKeyMaterial` so the AES-GCM round-trip is exercised for
// real, but stub the vetKD transport / verification primitives so the key
// derivation path can be driven without a live vetKD round-trip.
vi.mock(import('@dfinity/vetkeys'), async (importOriginal) => {
	const actual = await importOriginal();

	const derivedKeyMaterial = async (): Promise<DerivedKeyMaterial> => {
		const raw = new Uint8Array(32).fill(7);
		const key = await globalThis.crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey']);
		return actual.DerivedKeyMaterial.fromCryptoKey(key);
	};

	return {
		...actual,
		TransportSecretKey: {
			random: () => ({ publicKeyBytes: () => new Uint8Array([1, 2, 3]) })
		},
		DerivedPublicKey: { deserialize: () => ({}) },
		EncryptedVetKey: {
			deserialize: () => ({
				decryptAndVerify: () => ({ asDerivedKeyMaterial: derivedKeyMaterial })
			})
		}
	} as unknown as typeof actual;
});

vi.mock('$app/environment', () => ({ browser: true }));

describe('personal-notes.vetkeys', () => {
	const envelope: PersonalNoteEnvelope = {
		note: 'private — 日本語 😀 \n second line',
		created_at_ns: '1750000000000000000',
		updated_at_ns: '1750000000000000000'
	};
	const noteId = '0123456789abcdef0123456789abcdef';

	describe('encrypt/decrypt with an injected key', () => {
		// Build a DerivedKeyMaterial from a known HKDF key — the same shape
		// `VetKey.asDerivedKeyMaterial` produces — so we exercise the real AES-GCM
		// encrypt/decrypt path without a vetKD round-trip.
		const buildKeyMaterial = async (seed: number): Promise<DerivedKeyMaterial> => {
			const raw = new Uint8Array(32).fill(seed);
			const key = await globalThis.crypto.subtle.importKey('raw', raw, 'HKDF', false, [
				'deriveKey'
			]);
			return DerivedKeyMaterial.fromCryptoKey(key);
		};

		it('round-trips an envelope through encrypt → decrypt', async () => {
			const keyMaterial = await buildKeyMaterial(1);

			const encrypted = await encryptPersonalNoteWithKey({ keyMaterial, envelope, noteId });

			expect(encrypted).toBeInstanceOf(Uint8Array);

			const decrypted = await decryptPersonalNoteWithKey({ keyMaterial, encrypted, noteId });

			expect(decrypted).toEqual(envelope);
		});

		it('fails to decrypt with a different note id (domain separator)', async () => {
			const keyMaterial = await buildKeyMaterial(1);
			const encrypted = await encryptPersonalNoteWithKey({ keyMaterial, envelope, noteId });

			await expect(
				decryptPersonalNoteWithKey({ keyMaterial, encrypted, noteId: 'a'.repeat(32) })
			).rejects.toThrow();
		});

		it('fails to decrypt with a different key', async () => {
			const keyMaterial = await buildKeyMaterial(1);
			const otherKey = await buildKeyMaterial(2);
			const encrypted = await encryptPersonalNoteWithKey({ keyMaterial, envelope, noteId });

			await expect(
				decryptPersonalNoteWithKey({ keyMaterial: otherKey, encrypted, noteId })
			).rejects.toThrow();
		});
	});

	describe('key derivation (encrypt/decrypt with vetKD)', () => {
		beforeEach(() => {
			vi.restoreAllMocks();
			resetPersonalNotesKeyCache();
		});

		it('derives the key via vetKD on first use, then round-trips encrypt → decrypt', async () => {
			const publicKeySpy = vi
				.spyOn(backendApi, 'getPersonalNotesVetkeyPublicKey')
				.mockResolvedValue(new Uint8Array([4, 5, 6]));
			// A `number[]` (rather than Uint8Array) reply exercises `toUint8Array`'s
			// array branch.
			const vetkeySpy = vi
				.spyOn(backendApi, 'getPersonalNotesEncryptedVetkey')
				.mockResolvedValue([7, 8, 9]);

			const encrypted = await encryptPersonalNote({ envelope, noteId, identity: mockIdentity });
			const decrypted = await decryptPersonalNote({ encrypted, noteId, identity: mockIdentity });

			expect(decrypted).toEqual(envelope);
			expect(publicKeySpy).toHaveBeenCalledOnce();
			expect(vetkeySpy).toHaveBeenCalledOnce();
		});

		it('reuses the in-session cache without re-deriving', async () => {
			const publicKeySpy = vi
				.spyOn(backendApi, 'getPersonalNotesVetkeyPublicKey')
				.mockResolvedValue(new Uint8Array([4]));
			vi.spyOn(backendApi, 'getPersonalNotesEncryptedVetkey').mockResolvedValue(
				new Uint8Array([7])
			);

			await encryptPersonalNote({ envelope, noteId, identity: mockIdentity });
			await encryptPersonalNote({ envelope, noteId, identity: mockIdentity });

			expect(publicKeySpy).toHaveBeenCalledOnce();
		});

		it('evicts a failed derivation so the next call retries', async () => {
			vi.spyOn(backendApi, 'getPersonalNotesVetkeyPublicKey').mockResolvedValue(
				new Uint8Array([4])
			);
			const vetkeySpy = vi
				.spyOn(backendApi, 'getPersonalNotesEncryptedVetkey')
				.mockRejectedValueOnce(new Error('vetKD unavailable'))
				.mockResolvedValue(new Uint8Array([7]));

			await expect(
				encryptPersonalNote({ envelope, noteId, identity: mockIdentity })
			).rejects.toThrow('vetKD unavailable');

			// The rejected derivation must not stay cached: a retry re-hits the backend.
			const encrypted = await encryptPersonalNote({ envelope, noteId, identity: mockIdentity });

			expect(encrypted).toBeInstanceOf(Uint8Array);
			expect(vetkeySpy).toHaveBeenCalledTimes(2);
		});
	});

	describe('purgeLegacyPersonalNotesVetkeyCache', () => {
		// The test env's `localStorage` is Node's (non-functional) built-in, which
		// shadows jsdom's — stub a minimal in-memory one so the flag round-trips.
		let store: Map<string, string>;

		beforeEach(() => {
			vi.restoreAllMocks();
			store = new Map<string, string>();
			vi.stubGlobal('localStorage', {
				getItem: (key: string): string | null => store.get(key) ?? null,
				setItem: (...[key, value]: [string, string]): void => {
					store.set(key, value);
				}
			});
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('wipes the legacy default store once, then not again (flag remembered)', async () => {
			const clearSpy = vi.spyOn(idbKeyval, 'clear').mockResolvedValue(undefined);

			await purgeLegacyPersonalNotesVetkeyCache();
			await purgeLegacyPersonalNotesVetkeyCache();

			expect(clearSpy).toHaveBeenCalledOnce();
		});
	});
});
