import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { recordFailedAddress } from '$lib/services/failed-addresses.services';
import { failedAddresses } from '$lib/stores/failed-addresses.store';
import { toastsStore } from '$lib/stores/toasts.store';
import en from '$tests/mocks/i18n.mock';
import { get } from 'svelte/store';

describe('failed-addresses.services', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		failedAddresses.reset();
		toastsStore.reset();
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
		expect(toasts[0].text).toContain(`${BTC_MAINNET_NETWORK_ID.description}`);
		expect(toasts[0].text).toContain(`${SOLANA_MAINNET_NETWORK_ID.description}`);
	});

	it('should use the unavailability copy rather than a load-error message', async () => {
		recordFailedAddress(ETHEREUM_NETWORK_ID);

		await flush();

		const [prefix] = en.init.error.addresses_unavailable.split('$networks');

		expect(get(toastsStore)[0].text).toContain(prefix.trim());
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
		expect(toasts[1].text).toContain(`${SOLANA_MAINNET_NETWORK_ID.description}`);
		expect(toasts[1].text).not.toContain(`${ETHEREUM_NETWORK_ID.description}`);
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
