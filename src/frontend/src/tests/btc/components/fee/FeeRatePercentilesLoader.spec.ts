import FeeRatePercentilesLoader from '$btc/components/fee/FeeRatePercentilesLoader.svelte';
import * as btcUtxosService from '$btc/services/btc-utxos.service';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('FeeRatePercentilesLoader', () => {
	const networkId = BTC_MAINNET_NETWORK_ID;
	const mockFeeRateFromPercentiles = 5000n;

	const mockGetFeeRateFromPercentiles = () =>
		vi
			.spyOn(btcUtxosService, 'getFeeRateFromPercentiles')
			.mockResolvedValue(mockFeeRateFromPercentiles);

	const props = {
		networkId,
		children: mockSnippet
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();
		feeRatePercentilesStore.reset();
	});

	it('should call getFeeRateFromPercentiles and set store with proper params', async () => {
		const getFeeRateFromPercentilesSpy = mockGetFeeRateFromPercentiles();

		mockAuthStore();

		render(FeeRatePercentilesLoader, { props });

		await waitFor(() => {
			expect(getFeeRateFromPercentilesSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				network: 'mainnet'
			});
			expect(get(feeRatePercentilesStore)?.feeRateFromPercentiles).toEqual(
				mockFeeRateFromPercentiles
			);
		});
	});

	it('should not call getFeeRateFromPercentiles if no networkId provided', async () => {
		const getFeeRateFromPercentilesSpy = mockGetFeeRateFromPercentiles();
		const { networkId: _, ...newProps } = props;

		mockAuthStore();

		render(FeeRatePercentilesLoader, { props: newProps });

		await waitFor(() => {
			expect(getFeeRateFromPercentilesSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call getFeeRateFromPercentiles if invalid networkId is provided', async () => {
		const getFeeRateFromPercentilesSpy = mockGetFeeRateFromPercentiles();

		mockAuthStore();

		render(FeeRatePercentilesLoader, {
			props: { ...props, networkId: ICP_NETWORK_ID }
		});

		await waitFor(() => {
			expect(getFeeRateFromPercentilesSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call getFeeRateFromPercentiles if no authIdentity available', async () => {
		const getFeeRateFromPercentilesSpy = mockGetFeeRateFromPercentiles();

		mockAuthStore(null);

		render(FeeRatePercentilesLoader, { props });

		await waitFor(() => {
			expect(getFeeRateFromPercentilesSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call getFeeRateFromPercentiles if store already has data', async () => {
		feeRatePercentilesStore.setFeeRateFromPercentiles({
			feeRateFromPercentiles: mockFeeRateFromPercentiles
		});

		const getFeeRateFromPercentilesSpy = mockGetFeeRateFromPercentiles();

		mockAuthStore();

		render(FeeRatePercentilesLoader, { props });

		await waitFor(() => {
			expect(getFeeRateFromPercentilesSpy).not.toHaveBeenCalled();
		});
	});
});
