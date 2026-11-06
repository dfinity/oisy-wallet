import UtxosFeeLoader from '$btc/components/fee/UtxosFeeLoader.svelte';
import { DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE } from '$btc/constants/btc.constants';
import * as btcPendingSentTransactionsServices from '$btc/services/btc-pending-sent-transactions.services';
import * as btcUtxosService from '$btc/services/btc-utxos.service';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import { initUtxosFeeStore, type UtxosFeeStore } from '$btc/stores/utxos-fee.store';
import { BtcPrepareSendError } from '$btc/types/btc-send';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import * as bitcoinApi from '$icp/api/bitcoin.api';
import * as backendApi from '$lib/api/backend.api';
import { ZERO } from '$lib/constants/app.constants';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress, mockUtxo } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { btcSendViaBackend } from '$tests/utils/btc-env.test-utils';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { mockUtxosFeeContextEntry } from '$tests/utils/fee.context.test-utils';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('UtxosFeeLoader', () => {
	const amount = 10;
	const networkId = BTC_MAINNET_NETWORK_ID;
	const source = mockBtcAddress;
	const mockAllUtxos = [mockUtxo];
	const mockFeeRateFromPercentiles = 5000n;

	const mockContext = ({ utxosFeeStore }: { utxosFeeStore: UtxosFeeStore }) =>
		mockContextMap([mockUtxosFeeContextEntry(utxosFeeStore)]);

	const mockBtcReviewResult = {
		feeSatoshis: 700n,
		feeRateMiliSatoshisPerVByte: 4000n,
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

	const mockLoadBtcPendingSentTransactions = () =>
		vi
			.spyOn(btcPendingSentTransactionsServices, 'loadBtcPendingSentTransactions')
			.mockResolvedValue({ success: true });

	let utxosFeeStore: UtxosFeeStore;

	const props = {
		source,
		amount,
		networkId,
		children: mockSnippet
	};

	const setupStoresWithData = () => {
		allUtxosStore.setAllUtxos({ allUtxos: mockAllUtxos });
		feeRatePercentilesStore.setFeeRateFromPercentiles({
			feeRateFromPercentiles: mockFeeRateFromPercentiles
		});
		btcPendingSentTransactionsStore.setPendingTransactions({
			address: source,
			pendingTransactions: []
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();
		utxosFeeStore = initUtxosFeeStore();

		allUtxosStore.reset();
		feeRatePercentilesStore.reset();
		btcPendingSentTransactionsStore.reset();

		mockGetUtxosQuery();
		mockGetFeeRateFromPercentiles();
		mockLoadBtcPendingSentTransactions();
	});

	describe('with BTC_SEND_VIA_BACKEND_ENABLED', () => {
		beforeEach(() => {
			btcSendViaBackend.enabled = true;

			// The real pending loader and `prepareBtcSend`, with no mock left by an earlier test. That
			// also undoes the console mute of `vitest.setup.ts`, which a failed load needs.
			vi.restoreAllMocks();
			vi.spyOn(console, 'error').mockImplementation(() => {});
			vi.spyOn(console, 'debug').mockImplementation(() => {});
			mockGetFeeRateFromPercentiles();
		});

		it('should price the fee from the UTXOs of one backend call', async () => {
			const getUtxosQuerySpy = mockGetUtxosQuery();
			const getPendingBtcTransactionsSpy = vi.spyOn(backendApi, 'getPendingBtcTransactions');
			const getSpendableBtcUtxosSpy = vi
				.spyOn(backendApi, 'getSpendableBtcUtxos')
				.mockResolvedValue({ utxos: mockAllUtxos, pending_transactions: [] });
			const prepareBtcSendSpy = mockPrepareBtcSend();

			mockAuthStore();

			render(UtxosFeeLoader, {
				props,
				context: mockContext({ utxosFeeStore })
			});

			await waitFor(() => {
				expect(prepareBtcSendSpy).toHaveBeenCalledExactlyOnceWith({
					amount,
					source,
					allUtxos: mockAllUtxos,
					feeRateMiliSatoshisPerVByte: mockFeeRateFromPercentiles
				});
			});

			expect(getSpendableBtcUtxosSpy).toHaveBeenCalledOnce();
			expect(getUtxosQuerySpy).not.toHaveBeenCalled();
			expect(getPendingBtcTransactionsSpy).not.toHaveBeenCalled();
		});

		// As when Convert's own load at mount and the loader's race and the first one fails: the fee
		// priced from the failure must not outlive it, though the amount is the same.
		it('should price the fee again once a failed load is followed by one that succeeds', async () => {
			const fundedUtxos = [{ ...mockUtxo, value: 2_000_000_000n }];

			vi.spyOn(backendApi, 'getSpendableBtcUtxos')
				.mockRejectedValueOnce(new Error('test'))
				.mockResolvedValue({ utxos: fundedUtxos, pending_transactions: [] });

			mockAuthStore();

			render(UtxosFeeLoader, {
				props,
				context: mockContext({ utxosFeeStore })
			});

			await waitFor(() => {
				expect(get(utxosFeeStore)?.utxosFee?.error).toBe(
					BtcPrepareSendError.PendingTransactionsNotAvailable
				);
			});

			await btcPendingSentTransactionsServices.loadBtcPendingSentTransactions({
				identity: mockIdentity,
				networkId,
				address: source
			});

			await waitFor(() => {
				expect(get(utxosFeeStore)?.utxosFee?.utxos).toEqual(fundedUtxos);
			});

			expect(get(utxosFeeStore)?.utxosFee?.error).toBeUndefined();
		});
	});

	it('should call prepareBtcSend with proper params', async () => {
		const setUtxosFeeSpy = vi.spyOn(utxosFeeStore, 'setUtxosFee');
		const prepareBtcSendSpy = mockPrepareBtcSend();

		mockAuthStore();
		setupStoresWithData();

		render(UtxosFeeLoader, {
			props,
			context: mockContext({ utxosFeeStore })
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
					feeRateMiliSatoshisPerVByte: 4000n,
					utxos: mockBtcReviewResult.utxos
				},
				amountForFee: amount
			});
		});
	});

	it('should not call prepareBtcSend if no authIdentity available', async () => {
		const prepareBtcSendSpy = mockPrepareBtcSend();

		mockAuthStore(null);
		setupStoresWithData();

		render(UtxosFeeLoader, {
			props,
			context: mockContext({ utxosFeeStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call prepareBtcSend if no networkId provided', async () => {
		const prepareBtcSendSpy = mockPrepareBtcSend();
		const { networkId: _, ...newProps } = props;

		mockAuthStore();
		setupStoresWithData();

		render(UtxosFeeLoader, {
			props: newProps,
			context: mockContext({ utxosFeeStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call prepareBtcSend if amountError is true', async () => {
		const prepareBtcSendSpy = mockPrepareBtcSend();

		mockAuthStore();
		setupStoresWithData();

		render(UtxosFeeLoader, {
			props: {
				...props,
				amountError: true
			},
			context: mockContext({ utxosFeeStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});

	it('should call prepareBtcSend with default value if no amount provided', async () => {
		const prepareBtcSendSpy = mockPrepareBtcSend();
		const { amount: _, ...newProps } = props;

		mockAuthStore();
		setupStoresWithData();

		render(UtxosFeeLoader, {
			props: newProps,
			context: mockContext({ utxosFeeStore })
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
		setupStoresWithData();

		render(UtxosFeeLoader, {
			props: { ...props, amount: 0 },
			context: mockContext({ utxosFeeStore })
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
		setupStoresWithData();

		const { rerender } = render(UtxosFeeLoader, {
			props,
			context: mockContext({ utxosFeeStore })
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
		setupStoresWithData();

		utxosFeeStore.setUtxosFee({
			utxosFee: {
				feeSatoshis: 100n,
				feeRateMiliSatoshisPerVByte: 4000n,
				utxos: []
			},
			amountForFee: amount
		});

		render(UtxosFeeLoader, {
			props,
			context: mockContext({ utxosFeeStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});

	it.each([
		{ label: 'the same amount', amount },
		{ label: 'no amount', amount: undefined }
	])('should price a failed fee again for $label', async ({ amount: amountProp }) => {
		const prepareBtcSendSpy = mockPrepareBtcSend();
		mockAuthStore();
		setupStoresWithData();

		utxosFeeStore.setUtxosFee({
			utxosFee: {
				feeSatoshis: ZERO,
				feeRateMiliSatoshisPerVByte: 4000n,
				utxos: [],
				error: BtcPrepareSendError.PendingTransactionsNotAvailable
			},
			amountForFee: amountProp ?? DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE
		});

		render(UtxosFeeLoader, {
			props: { ...props, amount: amountProp },
			context: mockContext({ utxosFeeStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).toHaveBeenCalledOnce();
		});
	});

	it('should reset the store and call prepareBtcSend if amount has changed', async () => {
		const prepareBtcSendSpy = mockPrepareBtcSend();
		const resetSpy = vi.spyOn(utxosFeeStore, 'reset');
		mockAuthStore();
		setupStoresWithData();

		utxosFeeStore.setUtxosFee({
			utxosFee: {
				feeSatoshis: 100n,
				feeRateMiliSatoshisPerVByte: 4000n,
				utxos: []
			},
			amountForFee: 1
		});

		render(UtxosFeeLoader, {
			props: { ...props, amount: 5 },
			context: mockContext({ utxosFeeStore })
		});

		await waitFor(() => {
			expect(resetSpy).toHaveBeenCalledOnce();
			expect(prepareBtcSendSpy).toHaveBeenCalledOnce();
		});
	});

	it('should not call prepareBtcSend if source is empty', async () => {
		const prepareBtcSendSpy = mockPrepareBtcSend();

		mockAuthStore();
		setupStoresWithData();

		render(UtxosFeeLoader, {
			props: { ...props, source: '' },
			context: mockContext({ utxosFeeStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call prepareBtcSend if allUtxos is not available', async () => {
		const prepareBtcSendSpy = mockPrepareBtcSend();

		mockAuthStore();

		feeRatePercentilesStore.setFeeRateFromPercentiles({
			feeRateFromPercentiles: mockFeeRateFromPercentiles
		});
		btcPendingSentTransactionsStore.setPendingTransactions({
			address: source,
			pendingTransactions: []
		});
		allUtxosStore.setAllUtxos({ allUtxos: undefined });

		render(UtxosFeeLoader, {
			props,
			context: mockContext({ utxosFeeStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call prepareBtcSend if feeRateFromPercentiles is not available', async () => {
		const prepareBtcSendSpy = mockPrepareBtcSend();

		mockAuthStore();

		allUtxosStore.setAllUtxos({ allUtxos: mockAllUtxos });
		btcPendingSentTransactionsStore.setPendingTransactions({
			address: source,
			pendingTransactions: []
		});
		feeRatePercentilesStore.setFeeRateFromPercentiles({ feeRateFromPercentiles: undefined });

		render(UtxosFeeLoader, {
			props,
			context: mockContext({ utxosFeeStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call prepareBtcSend if btcPendingSentTransactions is not available for source', async () => {
		const prepareBtcSendSpy = mockPrepareBtcSend();

		mockAuthStore();

		allUtxosStore.setAllUtxos({ allUtxos: mockAllUtxos });
		feeRatePercentilesStore.setFeeRateFromPercentiles({
			feeRateFromPercentiles: mockFeeRateFromPercentiles
		});

		render(UtxosFeeLoader, {
			props,
			context: mockContext({ utxosFeeStore })
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});
});
