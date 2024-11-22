import UtxosFeeContext from '$btc/components/fee/UtxosFeeContext.svelte';
import * as btcSendApi from '$btc/services/btc-send.services';
import {
	UTXOS_FEE_CONTEXT_KEY,
	utxosFeeStore,
	type UtxosFeeStore
} from '$btc/stores/utxos-fee.store';
import { BTC_MAINNET_NETWORK_ID, ICP_NETWORK_ID } from '$env/networks.env';
import * as authStore from '$lib/derived/auth.derived';
import * as authServices from '$lib/services/auth.services';
import { mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import type { Identity } from '@dfinity/agent';
import { render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('UtxosFeeContext', () => {
	const amount = 10;
	const networkId = BTC_MAINNET_NETWORK_ID;
	const mockContext = (store: UtxosFeeStore) => new Map([[UTXOS_FEE_CONTEXT_KEY, { store }]]);
	const mockBtcSendApi = () =>
		vi.spyOn(btcSendApi, 'selectUtxosFee').mockResolvedValue(mockUtxosFee);
	const mockAuthStore = (value: Identity | null = mockIdentity) =>
		vi.spyOn(authStore, 'authIdentity', 'get').mockImplementation(() => readable(value));

	const props = {
		amount,
		networkId
	};

	beforeEach(() => {
		mockPage.reset();
		utxosFeeStore.reset();
	});

	it('should call selectUtxosFee with proper params', async () => {
		const setUtxosFeeSpy = vi.spyOn(utxosFeeStore, 'setUtxosFee');
		const selectUtxosFeeSpy = mockBtcSendApi();

		mockAuthStore();

		render(UtxosFeeContext, {
			props,
			context: mockContext(utxosFeeStore)
		});

		await waitFor(() => {
			expect(selectUtxosFeeSpy).toHaveBeenCalledOnce();
			expect(selectUtxosFeeSpy).toBeCalledWith({
				amount,
				network: 'mainnet',
				identity: mockIdentity
			});
			expect(setUtxosFeeSpy).toHaveBeenCalledOnce();
			expect(setUtxosFeeSpy).toHaveBeenCalledWith({ utxosFee: mockUtxosFee, amount });
		});
	});

	it('should not call selectUtxosFee if no authIdentity available', async () => {
		const selectUtxosFeeSpy = vi.spyOn(authServices, 'nullishSignOut').mockResolvedValue();

		mockAuthStore(null);

		render(UtxosFeeContext, {
			props,
			context: mockContext(utxosFeeStore)
		});

		await waitFor(() => {
			expect(selectUtxosFeeSpy).toHaveBeenCalledOnce();
		});
	});

	it('should not call selectUtxosFee if no networkId provided', async () => {
		const resetSpy = vi.spyOn(utxosFeeStore, 'reset');
		const selectUtxosFeeSpy = mockBtcSendApi();
		const { networkId: _, ...newProps } = props;

		mockAuthStore();

		render(UtxosFeeContext, {
			props: newProps,
			context: mockContext(utxosFeeStore)
		});

		await waitFor(() => {
			expect(resetSpy).toHaveBeenCalledOnce();
			expect(selectUtxosFeeSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call selectUtxosFee if amountError is true', async () => {
		const resetSpy = vi.spyOn(utxosFeeStore, 'reset');
		const selectUtxosFeeSpy = mockBtcSendApi();

		mockAuthStore();

		render(UtxosFeeContext, {
			props: {
				...props,
				amountError: true
			},
			context: mockContext(utxosFeeStore)
		});

		await waitFor(() => {
			expect(resetSpy).toHaveBeenCalledOnce();
			expect(selectUtxosFeeSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call selectUtxosFee if no amount provided', async () => {
		const resetSpy = vi.spyOn(utxosFeeStore, 'reset');
		const selectUtxosFeeSpy = mockBtcSendApi();
		const { amount: _, ...newProps } = props;

		mockAuthStore();

		render(UtxosFeeContext, {
			props: newProps,
			context: mockContext(utxosFeeStore)
		});

		await waitFor(() => {
			expect(resetSpy).toHaveBeenCalledOnce();
			expect(selectUtxosFeeSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call selectUtxosFee if provided amount is 0', async () => {
		const resetSpy = vi.spyOn(utxosFeeStore, 'reset');
		const selectUtxosFeeSpy = mockBtcSendApi();

		mockAuthStore();

		render(UtxosFeeContext, {
			props: { ...props, amount: 0 },
			context: mockContext(utxosFeeStore)
		});

		await waitFor(() => {
			expect(resetSpy).toHaveBeenCalledOnce();
			expect(selectUtxosFeeSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call selectUtxosFee if provided networkId is not BTC', async () => {
		const resetSpy = vi.spyOn(utxosFeeStore, 'reset');
		const selectUtxosFeeSpy = mockBtcSendApi();

		mockAuthStore();

		render(UtxosFeeContext, {
			props: { ...props, networkId: ICP_NETWORK_ID },
			context: mockContext(utxosFeeStore)
		});

		await waitFor(() => {
			expect(resetSpy).toHaveBeenCalledOnce();
			expect(selectUtxosFeeSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call selectUtxosFee if provided amount has not changed since last request', async () => {
		const selectUtxosFeeSpy = mockBtcSendApi();

		mockAuthStore();

		utxosFeeStore.setUtxosFee({ utxosFee: mockUtxosFee, amount });

		render(UtxosFeeContext, {
			props,
			context: mockContext(utxosFeeStore)
		});

		await waitFor(() => {
			expect(selectUtxosFeeSpy).not.toHaveBeenCalled();
		});
	});

	it('should call selectUtxosFee if provided amount has changed since last request', async () => {
		const selectUtxosFeeSpy = mockBtcSendApi();

		mockAuthStore();

		utxosFeeStore.setUtxosFee({ utxosFee: mockUtxosFee, amount });

		render(UtxosFeeContext, {
			props: {
				...props,
				amount: amount + 1
			},
			context: mockContext(utxosFeeStore)
		});

		await waitFor(() => {
			expect(selectUtxosFeeSpy).toHaveBeenCalled();
		});
	});
});
