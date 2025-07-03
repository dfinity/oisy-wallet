import UtxosFeeContext from '$btc/components/fee/UtxosFeeContext.svelte';
import {
	BTC_AMOUNT_FOR_UTXOS_FEE_UPDATE_PROPORTION,
	DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE
} from '$btc/constants/btc.constants';
import * as btcReviewApi from '$btc/services/btc-review.services';
import {
	initUtxosFeeStore,
	UTXOS_FEE_CONTEXT_KEY,
	type UtxosFeeStore
} from '$btc/stores/utxos-fee.store';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import * as authServices from '$lib/services/auth.services';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress, mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('UtxosFeeContext', () => {
	const amount = 10;
	const networkId = BTC_MAINNET_NETWORK_ID;
	const source = mockBtcAddress;
	const mockContext = (store: UtxosFeeStore) => new Map([[UTXOS_FEE_CONTEXT_KEY, { store }]]);
	const mockBtcReviewApi = () =>
		vi.spyOn(btcReviewApi, 'selectUtxosFee').mockResolvedValue({
			feeSatoshis: mockUtxosFee.feeSatoshis,
			utxos: mockUtxosFee.utxos,
			totalInputValue: 500000n,
			changeAmount: 400000n
		});
	let store: UtxosFeeStore;

	const props = {
		amount,
		networkId,
		source
	};

	beforeEach(() => {
		mockPage.reset();
		store = initUtxosFeeStore();
		store.reset();
		vi.clearAllMocks();
	});

	it('should call selectUtxosFee with proper params', async () => {
		const setUtxosFeeSpy = vi.spyOn(store, 'setUtxosFee');
		const selectUtxosFeeSpy = mockBtcReviewApi();

		mockAuthStore();

		render(UtxosFeeContext, {
			props,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(selectUtxosFeeSpy).toHaveBeenCalledOnce();
			expect(selectUtxosFeeSpy).toHaveBeenCalledWith({
				amount,
				network: 'mainnet',
				identity: mockIdentity,
				source
			});
			expect(setUtxosFeeSpy).toHaveBeenCalledOnce();
			expect(setUtxosFeeSpy).toHaveBeenCalledWith({
				utxosFee: expect.objectContaining({
					feeSatoshis: mockUtxosFee.feeSatoshis,
					utxos: mockUtxosFee.utxos
				}),
				amountForFee: amount
			});
		});
	});

	it('should not call selectUtxosFee if no authIdentity available', async () => {
		const nullishSignOutSpy = vi.spyOn(authServices, 'nullishSignOut').mockResolvedValue();

		mockAuthStore(null);

		render(UtxosFeeContext, {
			props,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(nullishSignOutSpy).toHaveBeenCalledOnce();
		});
	});

	it('should not call selectUtxosFee if no networkId provided', async () => {
		const selectUtxosFeeSpy = mockBtcReviewApi();
		const { networkId: _, ...newProps } = props;

		mockAuthStore();

		render(UtxosFeeContext, {
			props: newProps,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(selectUtxosFeeSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call selectUtxosFee if amountError is true', async () => {
		const selectUtxosFeeSpy = mockBtcReviewApi();

		mockAuthStore();

		render(UtxosFeeContext, {
			props: {
				...props,
				amountError: true
			},
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(selectUtxosFeeSpy).not.toHaveBeenCalled();
		});
	});

	it('should call selectUtxosFee with default value if no amount provided', async () => {
		const selectUtxosFeeSpy = mockBtcReviewApi();
		const { amount: _, ...newProps } = props;

		mockAuthStore();

		render(UtxosFeeContext, {
			props: newProps,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(selectUtxosFeeSpy).toHaveBeenCalled();
			expect(selectUtxosFeeSpy).toHaveBeenCalledWith({
				amount: Number(DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE),
				network: 'mainnet',
				identity: mockIdentity,
				source
			});
		});
	});

	it('should call selectUtxosFee with default value if provided amount is 0', async () => {
		const selectUtxosFeeSpy = mockBtcReviewApi();

		mockAuthStore();

		render(UtxosFeeContext, {
			props: { ...props, amount: 0 },
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(selectUtxosFeeSpy).toHaveBeenCalled();
			expect(selectUtxosFeeSpy).toHaveBeenCalledWith({
				amount: Number(DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE),
				network: 'mainnet',
				identity: mockIdentity,
				source
			});
		});
	});

	it('should not call selectUtxosFee if provided amount is 0 or undefined and the fee is already known', async () => {
		const selectUtxosFeeSpy = mockBtcReviewApi();

		mockAuthStore();

		const { rerender } = render(UtxosFeeContext, {
			props,
			context: mockContext(store)
		});

		await rerender({ amount: 0, source });
		await rerender({ amount: undefined, source });

		await waitFor(() => {
			expect(selectUtxosFeeSpy).toHaveBeenCalledOnce();
		});
	});

	it('should not call selectUtxosFee if provided networkId is not BTC', async () => {
		const resetSpy = vi.spyOn(store, 'reset');
		const selectUtxosFeeSpy = mockBtcReviewApi();

		mockAuthStore();

		render(UtxosFeeContext, {
			props: { ...props, networkId: ICP_NETWORK_ID },
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(resetSpy).toHaveBeenCalledOnce();
			expect(selectUtxosFeeSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call selectUtxosFee if provided amountForFee has not changed since last request', async () => {
		const selectUtxosFeeSpy = mockBtcReviewApi();
		const resetSpy = vi.spyOn(store, 'reset');

		mockAuthStore();

		store.setUtxosFee({ utxosFee: mockUtxosFee, amountForFee: amount });

		render(UtxosFeeContext, {
			props,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(resetSpy).not.toHaveBeenCalled();
			expect(selectUtxosFeeSpy).not.toHaveBeenCalled();
		});
	});

	it('should call selectUtxosFee if provided amountForFee has changed since last request', async () => {
		const selectUtxosFeeSpy = mockBtcReviewApi();
		const resetSpy = vi.spyOn(store, 'reset');

		mockAuthStore();

		store.setUtxosFee({ utxosFee: mockUtxosFee, amountForFee: amount });

		render(UtxosFeeContext, {
			props: {
				...props,
				amount: amount + 1
			},
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(resetSpy).not.toHaveBeenCalled();
			expect(selectUtxosFeeSpy).toHaveBeenCalled();
		});
	});

	it('should call selectUtxosFee and reset store if new amount is 10x bigger than previous value', async () => {
		const selectUtxosFeeSpy = mockBtcReviewApi();
		const resetSpy = vi.spyOn(store, 'reset');

		mockAuthStore();

		store.setUtxosFee({ utxosFee: mockUtxosFee, amountForFee: amount });

		render(UtxosFeeContext, {
			props: {
				...props,
				amount: amount * BTC_AMOUNT_FOR_UTXOS_FEE_UPDATE_PROPORTION
			},
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(resetSpy).toHaveBeenCalled();
			expect(selectUtxosFeeSpy).toHaveBeenCalled();
		});
	});
});
