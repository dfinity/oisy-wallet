import SwapBtcContexts from '$btc/components/swap/SwapBtcContexts.svelte';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import * as addrDerived from '$lib/derived/address.derived';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress, mockUtxo } from '$tests/mocks/btc.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';

// The loaders' whole job is to call out; what is under test is the teardown, not them.
vi.mock('$btc/services/btc-utxos.service', async () => {
	const { ZERO } = await import('$lib/constants/app.constants');
	return {
		getFeeRateFromPercentiles: vi.fn().mockResolvedValue(2_000n),
		prepareBtcSend: vi.fn().mockReturnValue({ feeSatoshis: ZERO, utxos: [] })
	};
});

vi.mock('$icp/api/bitcoin.api', () => ({
	getUtxosQuery: vi.fn().mockResolvedValue({ utxos: [], tip_height: 0, tip_block_hash: [] })
}));

vi.mock('$btc/services/btc-pending-sent-transactions.services', () => ({
	loadBtcPendingSentTransactions: vi.fn().mockResolvedValue(undefined)
}));

describe('SwapBtcContexts', () => {
	const fillStores = () => {
		allUtxosStore.setAllUtxos({ allUtxos: [mockUtxo] });
		feeRatePercentilesStore.setFeeRateFromPercentiles({ feeRateFromPercentiles: 2_000n });
		btcPendingSentTransactionsStore.setPendingTransactions({
			address: mockBtcAddress,
			pendingTransactions: []
		});
	};

	const storesPopulated = () =>
		[
			get(allUtxosStore)?.allUtxos,
			get(feeRatePercentilesStore)?.feeRateFromPercentiles,
			get(btcPendingSentTransactionsStore)[mockBtcAddress]
		].every((value) => value !== undefined && value !== null);

	beforeEach(() => {
		vi.clearAllMocks();
		mockAuthStore();

		allUtxosStore.reset();
		feeRatePercentilesStore.reset();
		btcPendingSentTransactionsStore.reset();

		vi.spyOn(addrDerived, 'btcAddressMainnet', 'get').mockReturnValue(readable(mockBtcAddress));
	});

	// The UTXO set and the reserved-outpoint list have no other invalidation, so leaving them
	// behind would hand the next flow — another swap, or Send, or Convert — inputs this one
	// already committed to an unconfirmed transaction.
	it('clears the Bitcoin data stores when the flow closes', () => {
		const { unmount } = render(SwapBtcContexts, {
			props: {
				load: true,
				amount: '0.01',
				networkId: BTC_MAINNET_NETWORK_ID,
				children: mockSnippet
			}
		});

		fillStores();

		expect(storesPopulated()).toBeTruthy();

		unmount();

		expect(storesPopulated()).toBeFalsy();
	});

	// A swap that never had a Bitcoin source never filled these, so it has no business
	// clearing what another flow may have put there.
	it('leaves the stores alone when no Bitcoin source was ever selected', () => {
		const { unmount } = render(SwapBtcContexts, {
			props: {
				load: false,
				amount: '0.01',
				networkId: BTC_MAINNET_NETWORK_ID,
				children: mockSnippet
			}
		});

		fillStores();

		unmount();

		expect(storesPopulated()).toBeTruthy();
	});
});
