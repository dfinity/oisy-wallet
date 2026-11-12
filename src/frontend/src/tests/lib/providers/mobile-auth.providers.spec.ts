import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import { authStore } from '$lib/stores/auth.store';
import { DelegationChain, DelegationIdentity, Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { get } from 'svelte/store';
vi.mock('$lib/constants/mobile.constants', () => ({ MOBILE_SHELL: true }));

describe('mobile shared authentication', () => {
	const provider = AuthClientProvider.getInstance();

	afterEach(() => {
		provider.reset();
		vi.restoreAllMocks();
	});

	it('uses the native-derived identity in the normal auth store without reading or writing an IDB key', async () => {
		const root = Ed25519KeyIdentity.generate();
		const key = Ed25519KeyIdentity.generate();
		const identity = DelegationIdentity.fromDelegation(
			key,
			await DelegationChain.create(root, key.getPublicKey(), new Date(Date.now() + 60_000))
		);
		const read = vi.spyOn(provider.storage, 'get');
		const write = vi.spyOn(provider.storage, 'set');
		const create = vi.spyOn(provider, 'createAuthClient');
		provider.setMobileIdentity(identity);
		await authStore.sync();

		expect(get(authStore).identity).toBe(identity);
		await expect(provider.loadDelegation()).resolves.toBe(identity.getDelegation());

		await authStore.signOut();

		expect(get(authStore).identity).toBeNull();
		await expect(provider.loadIdentity()).resolves.toBeUndefined();
		expect(read).not.toHaveBeenCalled();
		expect(write).not.toHaveBeenCalled();
		expect(create).not.toHaveBeenCalled();
	});

	it('never exposes an expired child identity', async () => {
		const root = Ed25519KeyIdentity.generate();
		const key = Ed25519KeyIdentity.generate();
		provider.setMobileIdentity(
			DelegationIdentity.fromDelegation(
				key,
				await DelegationChain.create(root, key.getPublicKey(), new Date(Date.now() - 1000))
			)
		);

		await expect(provider.loadIdentity()).resolves.toBeUndefined();

		await authStore.sync();

		expect(get(authStore).identity).toBeNull();
	});
});
