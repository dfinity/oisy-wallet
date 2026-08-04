import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { failedAddresses } from '$lib/stores/failed-addresses.store';
import { get } from 'svelte/store';

describe('failed-addresses.store', () => {
	beforeEach(() => {
		failedAddresses.reset();
	});

	it('should start empty, so no chain is treated as failed', () => {
		expect(get(failedAddresses)).toEqual([]);
	});

	it('should record a failed chain as not yet reported', () => {
		failedAddresses.add(ETHEREUM_NETWORK_ID);

		expect(get(failedAddresses)).toEqual([{ networkId: ETHEREUM_NETWORK_ID, reported: false }]);
	});

	it('should keep entries for several chains independently', () => {
		failedAddresses.add(BTC_MAINNET_NETWORK_ID);
		failedAddresses.add(SOLANA_MAINNET_NETWORK_ID);

		expect(get(failedAddresses).map(({ networkId }) => networkId)).toEqual([
			BTC_MAINNET_NETWORK_ID,
			SOLANA_MAINNET_NETWORK_ID
		]);
	});

	// `Loader.svelte` retries a nullish address, so a permanently failing chain is added repeatedly.
	// Preserving the existing entry is what stops it being reported again on every retry.
	it('should not duplicate or un-report a chain that is added again', () => {
		failedAddresses.add(ETHEREUM_NETWORK_ID);
		failedAddresses.markReported([ETHEREUM_NETWORK_ID]);

		failedAddresses.add(ETHEREUM_NETWORK_ID);

		expect(get(failedAddresses)).toEqual([{ networkId: ETHEREUM_NETWORK_ID, reported: true }]);
	});

	it('should mark only the given chains as reported', () => {
		failedAddresses.add(BTC_MAINNET_NETWORK_ID);
		failedAddresses.add(SOLANA_MAINNET_NETWORK_ID);

		failedAddresses.markReported([BTC_MAINNET_NETWORK_ID]);

		expect(get(failedAddresses)).toEqual([
			{ networkId: BTC_MAINNET_NETWORK_ID, reported: true },
			{ networkId: SOLANA_MAINNET_NETWORK_ID, reported: false }
		]);
	});

	// A chain that recovers must stop being treated as failed without needing a reload.
	it('should drop a chain once it is removed', () => {
		failedAddresses.add(ETHEREUM_NETWORK_ID);
		failedAddresses.add(BTC_MAINNET_NETWORK_ID);

		failedAddresses.remove(ETHEREUM_NETWORK_ID);

		expect(get(failedAddresses)).toEqual([{ networkId: BTC_MAINNET_NETWORK_ID, reported: false }]);
	});

	it('should ignore removing a chain that never failed', () => {
		failedAddresses.add(ETHEREUM_NETWORK_ID);

		failedAddresses.remove(SOLANA_MAINNET_NETWORK_ID);

		expect(get(failedAddresses)).toEqual([{ networkId: ETHEREUM_NETWORK_ID, reported: false }]);
	});
});
