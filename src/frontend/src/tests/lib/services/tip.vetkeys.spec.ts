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
