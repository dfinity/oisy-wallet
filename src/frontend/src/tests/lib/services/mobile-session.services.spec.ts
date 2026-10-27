import { requestMobileWallet } from '$lib/services/mobile-host.services';
import { createMobileIdentity } from '$lib/services/mobile-session.services';
import { DelegationChain, Ed25519KeyIdentity, Ed25519PublicKey } from '@icp-sdk/core/identity';
import * as z from 'zod';
vi.mock('$lib/services/mobile-host.services', () => ({ requestMobileWallet: vi.fn() }));

describe('mobile session', () => {
	const root = Ed25519KeyIdentity.generate();
	const native = Ed25519KeyIdentity.generate();
	const postMessage = vi.mocked(requestMobileWallet);
	const nativeGrant = async (message: Record<string, string>) => {
		const { publicKey } = z.object({ publicKey: z.string() }).parse(message);
		const expiresAt = Date.now() + 300_000;
		const previous = await DelegationChain.create(
			root,
			native.getPublicKey(),
			new Date(Date.now() + 600_000)
		);
		const chain = await DelegationChain.create(
			native,
			Ed25519PublicKey.fromDer(Buffer.from(publicKey, 'base64')),
			new Date(expiresAt),
			{ previous }
		);
		return JSON.stringify({
			id: '82ef3353-9d37-45d2-8106-af14b19e3195',
			principal: root.getPrincipal().toText(),
			expiresAt,
			chain: {
				publicKey: Buffer.from(chain.publicKey).toString('base64'),
				signerDelegation: chain.delegations.map(({ delegation, signature }) => ({
					delegation: {
						pubkey: Buffer.from(delegation.pubkey).toString('base64'),
						expiration: delegation.expiration.toString()
					},
					signature: Buffer.from(signature).toString('base64')
				}))
			}
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();
		postMessage.mockImplementation(nativeGrant);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it('keeps the original principal and full chain with a fresh web session key', async () => {
		const { identity, expiresAt } = await createMobileIdentity();

		expect(identity.getPrincipal().toText()).toBe(root.getPrincipal().toText());
		expect(identity.getDelegation().delegations).toHaveLength(2);
		expect(expiresAt - Date.now()).toBeLessThanOrEqual(300_000);
		expect(expiresAt - Date.now()).toBeGreaterThan(290_000);
		await expect(identity.sign(new Uint8Array([1, 2, 3]))).resolves.toHaveLength(64);
	});

	it('rejects a response issued for a different public key', async () => {
		postMessage.mockImplementation(() =>
			nativeGrant({ publicKey: Buffer.from(root.getPublicKey().toDer()).toString('base64') })
		);

		await expect(createMobileIdentity()).rejects.toThrow('Invalid mobile delegation');
	});

	it('rejects a different principal, an expired grant and an oversized payload', async () => {
		for (const overrides of [
			{ principal: native.getPrincipal().toText() },
			{ expiresAt: 0 },
			{ expiresAt: Date.now() + 600_000 }
		]) {
			postMessage.mockImplementation(async (request: Record<string, string>) =>
				JSON.stringify({ ...JSON.parse(await nativeGrant(request)), ...overrides })
			);

			await expect(createMobileIdentity()).rejects.toThrow();
		}
		postMessage.mockResolvedValue('a'.repeat(65_537));

		await expect(createMobileIdentity()).rejects.toThrow('Oversized');
	});
});
