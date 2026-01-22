import UtxosFeeLoader from '$btc/components/fee/UtxosFeeLoader.svelte';
import { DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE } from '$btc/constants/btc.constants';
import * as btcUtxosService from '$btc/services/btc-utxos.service';
import {
	ALL_UTXOS_CONTEXT_KEY,
	initAllUtxosStore,
	type AllUtxosStore
} from '$btc/stores/all-utxos.store';
import {
	FEE_RATE_PERCENTILES_CONTEXT_KEY,
	initFeeRatePercentilesStore,
	type FeeRatePercentilesStore
} from '$btc/stores/fee-rate-percentiles.store';
import {
	UTXOS_FEE_CONTEXT_KEY,
	initUtxosFeeStore,
	type UtxosFeeStore
} from '$btc/stores/utxos-fee.store';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import * as bitcoinApi from '$icp/api/bitcoin.api';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress, mockUtxo } from '$tests/mocks/btc.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('UtxosFeeLoader', () => {
	const amount = 10;
	const networkId = BTC_MAINNET_NETWORK_ID;
	const source = mockBtcAddress;
	const mockAllUtxos = [mockUtxo];
	const mockFeeRateFromPercentiles = 5000n;

	const mockContext = ({
		utxosFeeStore,
		allUtxosStore,
		feeRatePercentilesStore
	}: {
		utxosFeeStore: UtxosFeeStore;
		allUtxosStore: AllUtxosStore;
		feeRatePercentilesStore: FeeRatePercentilesStore;
	}) =>
		new Map([
			[UTXOS_FEE_CONTEXT_KEY, { store: utxosFeeStore }],
			[ALL_UTXOS_CONTEXT_KEY, { store: allUtxosStore }],
			[FEE_RATE_PERCENTILES_CONTEXT_KEY, { store: feeRatePercentilesStore }]
		]);

	const mockBtcReviewResult = {
		feeSatoshis: 700n,
		utxos: []
	};

	const mockPrepareBtcSend = () =>
		vi.spyOn(btcUtxosService, 'prepareBtcSend').mockReturnValue(mockBtcReviewResult);

	const mockGetUtxosQuery = () =>
		vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue({
			utxos: mockAllUtxos,
			tip_block_hash: new Uint8Array(),
			tip_height: 100,
			next_page: []
		});

	const mockGetFeeRateFromPercentiles = () =>
		vi
			.spyOn(btcUtxosService, 'getFeeRateFromPercentiles')
			.mockResolvedValue(mockFeeRateFromPercentiles);

	let utxosFeeStore: UtxosFeeStore;
	let allUtxosStore: AllUtxosStore;
	let feeRatePercentilesStore: FeeRatePercentilesStore;

	const props = {
		source,
		amount,
		networkId,
		children: mockSnippet
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();
		utxosFeeStore = initUtxosFeeStore();
		allUtxosStore = initAllUtxosStore();
		feeRatePercentilesStore = initFeeRatePercentilesStore();

		mockGetUtxosQuery();
		mockGetFeeRateFromPercentiles();
	});

	it('should call prepareBtcSend with proper params', async () => {
		const setUtxosFeeSpy = vi.spyOn(utxosFeeStore, 'setUtxosFee');
		const prepareBtcSendSpy = mockPrepareBtcSend();

		mockAuthStore();

		render(UtxosFeeLoader, {
			props,
			context: mockContext({ utxosFeeStore, allUtxosStore, feeRatePercentilesStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).toHaveBeenCalledExactlyOnceWith({
				amount,
				source,
				allUtxos: mockAllUtxos,
				feeRateMiliSatoshisPerVByte: mockFeeRateFromPercentiles
			});
			expect(setUtxosFeeSpy).toHaveBeenCalledExactlyOnceWith({
				utxosFee: {
					feeSatoshis: mockBtcReviewResult.feeSatoshis,
					utxos: mockBtcReviewResult.utxos
				},
				amountForFee: amount
			});
		});
	});

	it('should not call prepareBtcSend if no authIdentity available', async () => {
		const prepareBtcSendSpy = mockPrepareBtcSend();

		mockAuthStore(null);

		render(UtxosFeeLoader, {
			props,
			context: mockContext({ utxosFeeStore, allUtxosStore, feeRatePercentilesStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call prepareBtcSend if no networkId provided', async () => {
		const prepareBtcSendSpy = mockPrepareBtcSend();
		const { networkId: _, ...newProps } = props;

		mockAuthStore();

		render(UtxosFeeLoader, {
			props: newProps,
			context: mockContext({ utxosFeeStore, allUtxosStore, feeRatePercentilesStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call prepareBtcSend if amountError is true', async () => {
		const prepareBtcSendSpy = mockPrepareBtcSend();

		mockAuthStore();

		render(UtxosFeeLoader, {
			props: {
				...props,
				amountError: true
			},
			context: mockContext({ utxosFeeStore, allUtxosStore, feeRatePercentilesStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});

	it('should call prepareBtcSend with default value if no amount provided', async () => {
		const prepareBtcSendSpy = mockPrepareBtcSend();
		const { amount: _, ...newProps } = props;

		mockAuthStore();

		render(UtxosFeeLoader, {
			props: newProps,
			context: mockContext({ utxosFeeStore, allUtxosStore, feeRatePercentilesStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).toHaveBeenCalled();
			expect(prepareBtcSendSpy).toHaveBeenCalledWith({
				amount: Number(DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE),
				source,
				allUtxos: mockAllUtxos,
				feeRateMiliSatoshisPerVByte: mockFeeRateFromPercentiles
			});
		});
	});

	it('should call prepareBtcSend with default value if provided amount is 0', async () => {
		const prepareBtcSendSpy = mockPrepareBtcSend();

		mockAuthStore();

		render(UtxosFeeLoader, {
			props: { ...props, amount: 0 },
			context: mockContext({ utxosFeeStore, allUtxosStore, feeRatePercentilesStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).toHaveBeenCalled();
			expect(prepareBtcSendSpy).toHaveBeenCalledWith({
				amount: Number(DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE),
				source,
				allUtxos: mockAllUtxos,
				feeRateMiliSatoshisPerVByte: mockFeeRateFromPercentiles
			});
		});
	});

	it('should not call prepareBtcSend if provided amount is 0 or undefined and the fee is already known', async () => {
		const prepareBtcSendSpy = mockPrepareBtcSend();

		mockAuthStore();

		const { rerender } = render(UtxosFeeLoader, {
			props,
			context: mockContext({ utxosFeeStore, allUtxosStore, feeRatePercentilesStore })
		});

		await rerender({ ...props, amount: 0 });
		await rerender({ ...props, amount: undefined });

		await waitFor(() => {
			expect(prepareBtcSendSpy).toHaveBeenCalledOnce();
		});
	});

	it('should not call prepareBtcSend if the same amount is already in the store', async () => {
		const prepareBtcSendSpy = mockPrepareBtcSend();
		mockAuthStore();

		utxosFeeStore.setUtxosFee({
			utxosFee: {
				feeSatoshis: 100n,
				utxos: []
			},
			amountForFee: amount
		});

		render(UtxosFeeLoader, {
			props,
			context: mockContext({ utxosFeeStore, allUtxosStore, feeRatePercentilesStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});

	it('should reset the store and call prepareBtcSend if amount has changed', async () => {
		const prepareBtcSendSpy = mockPrepareBtcSend();
		const resetSpy = vi.spyOn(utxosFeeStore, 'reset');
		mockAuthStore();

		utxosFeeStore.setUtxosFee({
			utxosFee: {
				feeSatoshis: 100n,
				utxos: []
			},
			amountForFee: 1
		});

		render(UtxosFeeLoader, {
			props: { ...props, amount: 5 },
			context: mockContext({ utxosFeeStore, allUtxosStore, feeRatePercentilesStore })
		});

		await waitFor(() => {
			expect(resetSpy).toHaveBeenCalledOnce();
			expect(prepareBtcSendSpy).toHaveBeenCalledOnce();
		});
	});

	it('should not call prepareBtcSend if source is empty', async () => {
		const prepareBtcSendSpy = mockPrepareBtcSend();

		mockAuthStore();

		render(UtxosFeeLoader, {
			props: { ...props, source: '' },
			context: mockContext({ utxosFeeStore, allUtxosStore, feeRatePercentilesStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call prepareBtcSend if allUtxos is not available', async () => {
		vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue({
			utxos: [],
			tip_block_hash: new Uint8Array(),
			tip_height: 100,
			next_page: []
		});

		vi.spyOn(allUtxosStore, 'setAllUtxos').mockImplementation(() => {});

		const prepareBtcSendSpy = mockPrepareBtcSend();

		mockAuthStore();

		render(UtxosFeeLoader, {
			props,
			context: mockContext({ utxosFeeStore, allUtxosStore, feeRatePercentilesStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call prepareBtcSend if feeRateFromPercentiles is not available', async () => {
		vi.spyOn(feeRatePercentilesStore, 'setFeeRateFromPercentiles').mockImplementation(() => {});

		const prepareBtcSendSpy = mockPrepareBtcSend();

		mockAuthStore();

		render(UtxosFeeLoader, {
			props,
			context: mockContext({ utxosFeeStore, allUtxosStore, feeRatePercentilesStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});
});
