import { WALLET_CONNECT_UNCHECKED_SIGNING_DURATION_MS } from '$lib/constants/wallet-connect.constants';
import type { WalletConnectUncheckedSigningStore } from '$lib/stores/wallet-connect-unchecked-signing.store';
import { get } from 'svelte/store';

describe('wallet-connect-unchecked-signing.store', () => {
	const key = 'wallet-connect-unchecked-signing';

	const now = 1_700_000_000_000;

	// The store reads the session storage once, when the app loads it, so a reload is a fresh import.
	const load = async (): Promise<WalletConnectUncheckedSigningStore> => {
		vi.resetModules();

		const { walletConnectUncheckedSigningStore } =
			await import('$lib/stores/wallet-connect-unchecked-signing.store');

		return walletConnectUncheckedSigningStore;
	};

	beforeEach(() => {
		vi.useFakeTimers({ now });

		sessionStorage.clear();
		localStorage.clear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should be off until it is turned on', async () => {
		const store = await load();

		expect(get(store)).toBeUndefined();
	});

	it('should hold the moment it turns itself off, 5 minutes from being turned on', async () => {
		const store = await load();

		store.enable();

		expect(get(store)).toBe(now + WALLET_CONNECT_UNCHECKED_SIGNING_DURATION_MS);
	});

	it('should keep it in the session storage of this tab only', async () => {
		const store = await load();

		store.enable();

		expect(sessionStorage.getItem(key)).toBe(
			JSON.stringify(now + WALLET_CONNECT_UNCHECKED_SIGNING_DURATION_MS)
		);
		expect(localStorage.getItem(key)).toBeNull();
	});

	it('should survive a reload', async () => {
		(await load()).enable();

		const reloaded = await load();

		expect(get(reloaded)).toBe(now + WALLET_CONNECT_UNCHECKED_SIGNING_DURATION_MS);
	});

	it('should forget the moment when turned off', async () => {
		const store = await load();

		store.enable();
		store.disable();

		expect(get(store)).toBeUndefined();
		expect(sessionStorage.getItem(key)).toBeNull();
	});

	// Every sign-out path goes through `logout`, which clears the session storage this lives in.
	it('should be off once the session storage is cleared', async () => {
		(await load()).enable();

		sessionStorage.clear();

		expect(get(await load())).toBeUndefined();
	});

	it('should ignore a stored value that is not a moment', async () => {
		sessionStorage.setItem(key, JSON.stringify('soon'));

		expect(get(await load())).toBeUndefined();
	});
});
