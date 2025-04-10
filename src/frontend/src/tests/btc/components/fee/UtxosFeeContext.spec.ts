import UtxosFeeContext from '$btc/components/fee/UtxosFeeContext.svelte';
import {
	BTC_AMOUNT_FOR_UTXOS_FEE_UPDATE_PROPORTION,
	DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE
} from '$btc/constants/btc.constants';
import * as btcSendApi from '$btc/services/btc-send.services';
import {
	UTXOS_FEE_CONTEXT_KEY,
	initUtxosFeeStore,
	type UtxosFeeStore
} from '$btc/stores/utxos-fee.store';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import * as authServices from '$lib/services/auth.services';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('UtxosFeeContext', () => {
	const amount = 10;
	const networkId = BTC_MAINNET_NETWORK_ID;
	const mockContext = (store: UtxosFeeStore) => new Map([[UTXOS_FEE_CONTEXT_KEY, { store }]]);
	const mockBtcSendApi = () =>
		vi.spyOn(btcSendApi, 'selectUtxosFee').mockResolvedValue(mockUtxosFee);
	let store: UtxosFeeStore;

	const props = {
		amount,
		networkId
	};

	beforeEach(() => {
		mockPage.reset();
		store = initUtxosFeeStore();
		store.reset();
	});

	it('should call selectUtxosFee with proper params', async () => {
		const setUtxosFeeSpy = vi.spyOn(store, 'setUtxosFee');
		const selectUtxosFeeSpy = mockBtcSendApi();

		mockAuthStore();

		render(UtxosFeeContext, {
			props,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(selectUtxosFeeSpy).toHaveBeenCalledOnce();
			expect(selectUtxosFeeSpy).toBeCalledWith({
				amount,
				network: 'mainnet',
				identity: mockIdentity
			});
			expect(setUtxosFeeSpy).toHaveBeenCalledOnce();
			expect(setUtxosFeeSpy).toHaveBeenCalledWith({ utxosFee: mockUtxosFee, amountForFee: amount });
		});
	});

	it('should not call selectUtxosFee if no authIdentity available', async () => {
		const selectUtxosFeeSpy = vi.spyOn(authServices, 'nullishSignOut').mockResolvedValue();

		mockAuthStore(null);

		render(UtxosFeeContext, {
			props,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(selectUtxosFeeSpy).toHaveBeenCalledOnce();
		});
	});

	it('should not call selectUtxosFee if no networkId provided', async () => {
		const selectUtxosFeeSpy = mockBtcSendApi();
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
		const selectUtxosFeeSpy = mockBtcSendApi();

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
		const selectUtxosFeeSpy = mockBtcSendApi();
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
				identity: mockIdentity
			});
		});
	});

	it('should call selectUtxosFee with default value if provided amount is 0', async () => {
		const selectUtxosFeeSpy = mockBtcSendApi();

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
				identity: mockIdentity
			});
		});
	});

	it('should not call selectUtxosFee if provided amount is 0 or undefined and the fee is already known', async () => {
		const selectUtxosFeeSpy = mockBtcSendApi();

		mockAuthStore();

		const { rerender } = render(UtxosFeeContext, {
			props,
			context: mockContext(store)
		});

		await rerender({ amount: 0 });
		await rerender({ amount: undefined });

		await waitFor(() => {
			expect(selectUtxosFeeSpy).toHaveBeenCalledOnce();
		});
	});

	it('should not call selectUtxosFee if provided networkId is not BTC', async () => {
		const resetSpy = vi.spyOn(store, 'reset');
		const selectUtxosFeeSpy = mockBtcSendApi();

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
		const selectUtxosFeeSpy = mockBtcSendApi();
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
		const selectUtxosFeeSpy = mockBtcSendApi();
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
		const selectUtxosFeeSpy = mockBtcSendApi();
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
