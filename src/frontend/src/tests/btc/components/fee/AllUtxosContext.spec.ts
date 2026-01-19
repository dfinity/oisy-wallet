import AllUtxosContext from '$btc/components/fee/AllUtxosContext.svelte';
import { CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS } from '$btc/constants/btc.constants';
import {
	ALL_UTXOS_CONTEXT_KEY,
	initAllUtxosStore,
	type AllUtxosStore
} from '$btc/stores/all-utxos.store';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { BITCOIN_CANISTER_IDS, IC_CKBTC_MINTER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import * as bitcoinApi from '$icp/api/bitcoin.api';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress, mockUtxo } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('AllUtxosContext', () => {
	const networkId = BTC_MAINNET_NETWORK_ID;
	const source = mockBtcAddress;
	const mockAllUtxos = [mockUtxo];

	const mockContext = (store: AllUtxosStore) => new Map([[ALL_UTXOS_CONTEXT_KEY, { store }]]);

	const mockGetUtxosQuery = () =>
		vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue({
			utxos: mockAllUtxos,
			tip_block_hash: new Uint8Array(),
			tip_height: 100,
			next_page: []
		});

	let store: AllUtxosStore;

	const props = {
		source,
		networkId,
		children: mockSnippet
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();
		store = initAllUtxosStore();
	});

	it('should call getUtxosQuery and set store with proper params', async () => {
		const setAllUtxosSpy = vi.spyOn(store, 'setAllUtxos');
		const getUtxosQuerySpy = mockGetUtxosQuery();

		mockAuthStore();

		render(AllUtxosContext, {
			props,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(getUtxosQuerySpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				address: source,
				network: 'mainnet',
				bitcoinCanisterId: BITCOIN_CANISTER_IDS[IC_CKBTC_MINTER_CANISTER_ID],
				minConfirmations: CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
			});
			expect(setAllUtxosSpy).toHaveBeenCalledExactlyOnceWith({
				allUtxos: mockAllUtxos
			});
		});
	});

	it('should not call getUtxosQuery if no networkId provided', async () => {
		const getUtxosQuerySpy = mockGetUtxosQuery();
		const { networkId: _, ...newProps } = props;

		mockAuthStore();

		render(AllUtxosContext, {
			props: newProps,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(getUtxosQuerySpy).not.toHaveBeenCalled();
		});
	});

	it('should not call getUtxosQuery if invalid networkId is provided', async () => {
		const getUtxosQuerySpy = mockGetUtxosQuery();

		mockAuthStore();

		render(AllUtxosContext, {
			props: { ...props, networkId: ICP_NETWORK_ID },
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(getUtxosQuerySpy).not.toHaveBeenCalled();
		});
	});
});
