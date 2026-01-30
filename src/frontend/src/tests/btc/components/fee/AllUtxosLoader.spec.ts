import AllUtxosLoader from '$btc/components/fee/AllUtxosLoader.svelte';
import { CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS } from '$btc/constants/btc.constants';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { BITCOIN_CANISTER_IDS } from '$env/networks/networks.icrc.env';
import { IC_CKBTC_MINTER_CANISTER_ID } from '$env/tokens/tokens-icp/tokens.icp.ck.btc.env';
import * as bitcoinApi from '$icp/api/bitcoin.api';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress, mockUtxo } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('AllUtxosLoader', () => {
	const networkId = BTC_MAINNET_NETWORK_ID;
	const source = mockBtcAddress;
	const mockAllUtxos = [mockUtxo];

	const mockGetUtxosQuery = () =>
		vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue({
			utxos: mockAllUtxos,
			tip_block_hash: new Uint8Array(),
			tip_height: 100,
			next_page: []
		});

	const props = {
		source,
		networkId,
		children: mockSnippet
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();

		allUtxosStore.reset();
	});

	it('should call getUtxosQuery and set store with proper params', async () => {
		const getUtxosQuerySpy = mockGetUtxosQuery();

		mockAuthStore();

		render(AllUtxosLoader, { props });

		await waitFor(() => {
			expect(getUtxosQuerySpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				address: source,
				network: 'mainnet',
				bitcoinCanisterId: BITCOIN_CANISTER_IDS[IC_CKBTC_MINTER_CANISTER_ID],
				minConfirmations: CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
			});
			expect(get(allUtxosStore)?.allUtxos).toEqual(mockAllUtxos);
		});
	});

	it('should not call getUtxosQuery if no networkId provided', async () => {
		const getUtxosQuerySpy = mockGetUtxosQuery();
		const { networkId: _, ...newProps } = props;

		mockAuthStore();

		render(AllUtxosLoader, { props: newProps });

		await waitFor(() => {
			expect(getUtxosQuerySpy).not.toHaveBeenCalled();
		});
	});

	it('should not call getUtxosQuery if invalid networkId is provided', async () => {
		const getUtxosQuerySpy = mockGetUtxosQuery();

		mockAuthStore();

		render(AllUtxosLoader, {
			props: { ...props, networkId: ICP_NETWORK_ID }
		});

		await waitFor(() => {
			expect(getUtxosQuerySpy).not.toHaveBeenCalled();
		});
	});

	it('should not call getUtxosQuery if store already has data', async () => {
		allUtxosStore.setAllUtxos({ allUtxos: mockAllUtxos });

		const getUtxosQuerySpy = mockGetUtxosQuery();

		mockAuthStore();

		render(AllUtxosLoader, { props });

		await waitFor(() => {
			expect(getUtxosQuerySpy).not.toHaveBeenCalled();
		});
	});
});
