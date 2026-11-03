import { getTipEncryptedVetkey, getTipVetkeyPublicKey } from '$lib/api/backend.api';
import {
	decryptClaimCodeWithKey,
	deriveTipKeyMaterial,
	encryptClaimCodeWithKey,
	resetTipKeyCache
} from '$lib/services/tip.vetkeys';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { DerivedKeyMaterial } from '@dfinity/vetkeys';

vi.mock('$lib/api/backend.api', () => ({
	getTipEncryptedVetkey: vi.fn(),
	getTipVetkeyPublicKey: vi.fn()
}));

// Most of this file drives a derivation that fails to verify, which is what the
// junk bytes below are for. One describe needs the opposite — a derivation that
// succeeds, so the session cache has something to hold — and `vi.mock` is
// hoisted above the imports, so the switch has to be hoisted with it.
const vetkd = vi.hoisted(() => ({ verifies: false }));

// The real `DerivedKeyMaterial` is kept, so the AES-GCM path stays real; only
// the three vetKD transport primitives are stubbed, since there is no vetKD
// round-trip to be had here.
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
				decryptAndVerify: () => {
					if (!vetkd.verifies) {
						throw new Error('the vetKey did not verify');
					}

					return { asDerivedKeyMaterial: derivedKeyMaterial };
				}
			})
		}
	} as unknown as typeof actual;
});

const VERIFICATION_KEY_STORAGE_KEY = 'oisy-tip-vetkey-verification-key';

describe('tip.vetkeys', () => {
	const claimCode = 'Q12pPcMkDKCfkNOiyX8Hnw';
	const tipId = 'sDoU-DCZnzBeUoVICN_o2A';

	// A DerivedKeyMaterial from a known HKDF key — the shape
	// `VetKey.asDerivedKeyMaterial` produces — so the real AES-GCM path runs
	// without a vetKD round-trip.
	const buildKeyMaterial = async (seed: number): Promise<DerivedKeyMaterial> => {
		const raw = new Uint8Array(32).fill(seed);
		const key = await globalThis.crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey']);
		return DerivedKeyMaterial.fromCryptoKey(key);
	};

	it('round-trips a claim code through encrypt → decrypt', async () => {
		const keyMaterial = await buildKeyMaterial(1);

		const encrypted = await encryptClaimCodeWithKey({ keyMaterial, claimCode, tipId });

		expect(encrypted).toBeInstanceOf(Uint8Array);
		// The point of the whole exercise: the ciphertext must not carry the code.
		expect(new TextDecoder().decode(encrypted)).not.toContain(claimCode);

		await expect(decryptClaimCodeWithKey({ keyMaterial, encrypted, tipId })).resolves.toBe(
			claimCode
		);
	});

	it('will not decrypt under another tip id', async () => {
		// The tip id is the domain separator. Without it, ciphertext lifted from
		// one entry of the sender's own map would decrypt under another — so a
		// mixed-up row could hand out the wrong tip's link.
		const keyMaterial = await buildKeyMaterial(1);
		const encrypted = await encryptClaimCodeWithKey({ keyMaterial, claimCode, tipId });

		await expect(
			decryptClaimCodeWithKey({ keyMaterial, encrypted, tipId: 'a-different-tip-id' })
		).rejects.toThrow();
	});

	it('will not decrypt under another principal key', async () => {
		// Two users derive different key material, so one sender's ciphertext is
		// undecryptable by another even if they somehow obtained the bytes.
		const encrypted = await encryptClaimCodeWithKey({
			keyMaterial: await buildKeyMaterial(1),
			claimCode,
			tipId
		});

		await expect(
			decryptClaimCodeWithKey({ keyMaterial: await buildKeyMaterial(2), encrypted, tipId })
		).rejects.toThrow();
	});

	// What the "start the derivation before the approve" trade-off rests on. The
	// derivation is metered — five a minute and ten an hour per caller, a hundred
	// an hour across everyone — and starting it earlier means a reservation that
	// is later refused has spent one. It matters a great deal whether that is one
	// per session or one per attempt.
	describe('the per-session derivation cache', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			resetTipKeyCache();
			sessionStorage.clear();

			vetkd.verifies = true;
			vi.mocked(getTipEncryptedVetkey).mockResolvedValue(new Uint8Array(32).fill(7));
			vi.mocked(getTipVetkeyPublicKey).mockResolvedValue(new Uint8Array(48).fill(9));
		});

		afterEach(() => {
			vetkd.verifies = false;
		});

		it('derives once however many times a session asks', async () => {
			// So a sender who is refused three times and succeeds on the fourth has
			// spent one derivation, not four. Without this the earlier start would
			// turn a run of failed reservations into a rate-limit lockout.
			const first = await deriveTipKeyMaterial({ identity: mockIdentity });

			await deriveTipKeyMaterial({ identity: mockIdentity });

			const last = await deriveTipKeyMaterial({ identity: mockIdentity });

			expect(getTipEncryptedVetkey).toHaveBeenCalledOnce();
			expect(last).toBe(first);
		});

		it('serves callers that arrive together from one derivation', async () => {
			// They share the cached promise rather than each starting their own, so
			// the count holds even when nothing has resolved yet.
			const [first, second] = await Promise.all([
				deriveTipKeyMaterial({ identity: mockIdentity }),
				deriveTipKeyMaterial({ identity: mockIdentity })
			]);

			expect(getTipEncryptedVetkey).toHaveBeenCalledOnce();
			expect(second).toBe(first);
		});
	});

	// The verification key is a canister-wide public constant, so it is cached in
	// `sessionStorage` to stop a page reload spending an update call — and a
	// derivation's rate-limit budget — on bytes we already had.
	describe('cached verification key', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			resetTipKeyCache();
			sessionStorage.clear();

			// Junk on purpose: these tests are about which calls are made and what
			// the cache holds afterwards, so the derivation is expected to reject.
			vi.mocked(getTipEncryptedVetkey).mockResolvedValue(new Uint8Array(32).fill(7));
			vi.mocked(getTipVetkeyPublicKey).mockResolvedValue(new Uint8Array(48).fill(9));
		});

		it('does not refetch the constant when it is already cached', async () => {
			sessionStorage.setItem(VERIFICATION_KEY_STORAGE_KEY, 'CQkJCQkJCQkJCQkJ');

			await expect(deriveTipKeyMaterial({ identity: mockIdentity })).rejects.toThrow();

			expect(getTipVetkeyPublicKey).not.toHaveBeenCalled();
			// The paid derivation is still fetched: it is per-caller and per-session.
			expect(getTipEncryptedVetkey).toHaveBeenCalledOnce();
		});

		it('caches the constant after fetching it once', async () => {
			await expect(deriveTipKeyMaterial({ identity: mockIdentity })).rejects.toThrow();

			expect(getTipVetkeyPublicKey).toHaveBeenCalledOnce();
		});

		it('forgets a cached constant a derivation could not verify against', async () => {
			// Otherwise one corrupt value is permanent: the derivation rejects, the
			// session cache evicts the rejected promise so the next call retries, and
			// that retry reads the same bad bytes straight back out of storage.
			sessionStorage.setItem(VERIFICATION_KEY_STORAGE_KEY, 'CQkJCQkJCQkJCQkJ');

			await expect(deriveTipKeyMaterial({ identity: mockIdentity })).rejects.toThrow();

			expect(sessionStorage.getItem(VERIFICATION_KEY_STORAGE_KEY)).toBeNull();
		});
	});
});
