import { BTC_MAINNET_NETWORK, BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK, ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK, SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { recordFailedAddress } from '$lib/services/failed-addresses.services';
import { failedAddresses } from '$lib/stores/failed-addresses.store';
import { toastsStore } from '$lib/stores/toasts.store';
import en from '$tests/mocks/i18n.mock';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { get } from 'svelte/store';

describe('failed-addresses.services', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		failedAddresses.reset();
		toastsStore.reset();

		setupUserNetworksStore('allEnabled');
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const flush = async () => {
		await vi.runAllTimersAsync();
	};

	it('should record the chain immediately, before any toast', () => {
		recordFailedAddress(ETHEREUM_NETWORK_ID);

		expect(get(failedAddresses)).toEqual([{ networkId: ETHEREUM_NETWORK_ID, reported: false }]);
		expect(get(toastsStore)).toHaveLength(0);
	});

	// The three chains load concurrently, so firing per chain would stack up to three toasts for
	// what is one event to the user.
	it('should show a single toast naming every chain that failed', async () => {
		recordFailedAddress(BTC_MAINNET_NETWORK_ID);
		recordFailedAddress(SOLANA_MAINNET_NETWORK_ID);

		await flush();

		const toasts = get(toastsStore);

		expect(toasts).toHaveLength(1);
		expect(toasts[0].text).toContain(BTC_MAINNET_NETWORK.name);
		expect(toasts[0].text).toContain(SOLANA_MAINNET_NETWORK.name);
		// Names, not ticker symbols — a user reads "Bitcoin", not "BTC".
		expect(toasts[0].text).not.toContain(`: ${BTC_MAINNET_NETWORK_ID.description},`);
	});

	it('should lead with the problem rather than a list', async () => {
		recordFailedAddress(SOLANA_MAINNET_NETWORK_ID);

		await flush();

		const [prefix] = en.init.error.address_unavailable.split('$networks');

		expect(get(toastsStore)[0].text).toContain(prefix.trim());
		expect(get(toastsStore)[0].text).toContain('Other functionality and networks work normally');
	});

	it('should use the singular wording when only one network is affected', async () => {
		recordFailedAddress(SOLANA_MAINNET_NETWORK_ID);

		await flush();

		expect(get(toastsStore)[0].text).toBe(
			en.init.error.address_unavailable.replace('$networks', SOLANA_MAINNET_NETWORK.name)
		);
	});

	// One derived address serves every EVM network, so naming only Ethereum would leave a user with
	// Base assets wondering why those broke too.
	it('should name every EVM network affected by the Ethereum address', async () => {
		recordFailedAddress(ETHEREUM_NETWORK_ID);

		await flush();

		const [{ text }] = get(toastsStore);

		expect(text).toContain(ETHEREUM_NETWORK.name);
		expect(text).toContain('Base');
		expect(text).toContain('Polygon');
		// Singular, deliberately: this is *one* address covering five networks, so "your addresses"
		// would claim five addresses where there is one.
		expect(text).toContain('your address for');
		expect(text).not.toContain('your addresses for');
	});

	// ICP's address comes from the principal, not from derivation, so it must never be listed.
	it('should never name ICP', async () => {
		recordFailedAddress(BTC_MAINNET_NETWORK_ID);
		recordFailedAddress(ETHEREUM_NETWORK_ID);
		recordFailedAddress(SOLANA_MAINNET_NETWORK_ID);

		await flush();

		expect(get(toastsStore)[0].text).not.toContain('Internet Computer');
	});

	// `Loader.svelte` retries a nullish address, so without the dedupe a permanently failing chain
	// would re-toast on every retry.
	it('should not toast again for a chain already reported', async () => {
		recordFailedAddress(ETHEREUM_NETWORK_ID);
		await flush();

		recordFailedAddress(ETHEREUM_NETWORK_ID);
		await flush();

		expect(get(toastsStore)).toHaveLength(1);
	});

	it('should toast again for a newly failing chain only', async () => {
		recordFailedAddress(ETHEREUM_NETWORK_ID);
		await flush();

		recordFailedAddress(SOLANA_MAINNET_NETWORK_ID);
		await flush();

		const toasts = get(toastsStore);

		expect(toasts).toHaveLength(2);
		expect(toasts[1].text).toContain(SOLANA_MAINNET_NETWORK.name);
		expect(toasts[1].text).not.toContain(ETHEREUM_NETWORK.name);
	});

	it('should mark the reported chains so a later flush is a no-op', async () => {
		recordFailedAddress(ETHEREUM_NETWORK_ID);

		await flush();

		expect(get(failedAddresses)).toEqual([{ networkId: ETHEREUM_NETWORK_ID, reported: true }]);

		await flush();

		expect(get(toastsStore)).toHaveLength(1);
	});

	// Nothing the user can do changes a deterministic local derivation failure, so the copy must not
	// invite them to try again.
	it('should not offer a retry', async () => {
		recordFailedAddress(ETHEREUM_NETWORK_ID);

		await flush();

		expect(get(toastsStore)[0].text.toLowerCase()).not.toContain('try again');
		expect(get(toastsStore)[0].text.toLowerCase()).not.toContain('retry');
	});
});
