import FeeRatePercentilesContext from '$btc/components/fee/FeeRatePercentilesContext.svelte';
import * as btcUtxosService from '$btc/services/btc-utxos.service';
import {
	FEE_RATE_PERCENTILES_CONTEXT_KEY,
	initFeeRatePercentilesStore,
	type FeeRatePercentilesStore
} from '$btc/stores/fee-rate-percentiles.store';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('FeeRatePercentilesContext', () => {
	const networkId = BTC_MAINNET_NETWORK_ID;
	const mockFeeRateFromPercentiles = 5000n;

	const mockContext = (store: FeeRatePercentilesStore) =>
		new Map([[FEE_RATE_PERCENTILES_CONTEXT_KEY, { store }]]);

	const mockGetFeeRateFromPercentiles = () =>
		vi
			.spyOn(btcUtxosService, 'getFeeRateFromPercentiles')
			.mockResolvedValue(mockFeeRateFromPercentiles);

	let store: FeeRatePercentilesStore;

	const props = {
		networkId,
		children: mockSnippet
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();
		store = initFeeRatePercentilesStore();
	});

	it('should call getFeeRateFromPercentiles and set store with proper params', async () => {
		const setFeeRateFromPercentilesSpy = vi.spyOn(store, 'setFeeRateFromPercentiles');
		const getFeeRateFromPercentilesSpy = mockGetFeeRateFromPercentiles();

		mockAuthStore();

		render(FeeRatePercentilesContext, {
			props,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(getFeeRateFromPercentilesSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				network: 'mainnet'
			});
			expect(setFeeRateFromPercentilesSpy).toHaveBeenCalledExactlyOnceWith({
				feeRateFromPercentiles: mockFeeRateFromPercentiles
			});
		});
	});

	it('should not call getFeeRateFromPercentiles if no networkId provided', async () => {
		const getFeeRateFromPercentilesSpy = mockGetFeeRateFromPercentiles();
		const { networkId: _, ...newProps } = props;

		mockAuthStore();

		render(FeeRatePercentilesContext, {
			props: newProps,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(getFeeRateFromPercentilesSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call getFeeRateFromPercentiles if invalid networkId is provided', async () => {
		const getFeeRateFromPercentilesSpy = mockGetFeeRateFromPercentiles();

		mockAuthStore();

		render(FeeRatePercentilesContext, {
			props: { ...props, networkId: ICP_NETWORK_ID },
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(getFeeRateFromPercentilesSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call getFeeRateFromPercentiles if no authIdentity available', async () => {
		const getFeeRateFromPercentilesSpy = mockGetFeeRateFromPercentiles();

		mockAuthStore(null);

		render(FeeRatePercentilesContext, {
			props,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(getFeeRateFromPercentilesSpy).not.toHaveBeenCalled();
		});
	});
});
