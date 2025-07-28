import UtxosFeeContext from '$btc/components/fee/UtxosFeeContext.svelte';
import {
	BTC_AMOUNT_FOR_UTXOS_FEE_UPDATE_PROPORTION,
	DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE
} from '$btc/constants/btc.constants';
import * as btcUtxosApi from '$btc/services/btc-utxos.service';
import {
	UTXOS_FEE_CONTEXT_KEY,
	initUtxosFeeStore,
	type UtxosFeeStore
} from '$btc/stores/utxos-fee.store';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import * as authServices from '$lib/services/auth.services';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('UtxosFeeContext', () => {
	const amount = 10;
	const networkId = BTC_MAINNET_NETWORK_ID;
	const source = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
	const mockContext = (store: UtxosFeeStore) => new Map([[UTXOS_FEE_CONTEXT_KEY, { store }]]);

	const mockBtcReviewResult = {
		feeSatoshis: 700n,
		utxos: []
	};

	const mockBtcUtxosService = () =>
		vi.spyOn(btcUtxosApi, 'prepareBtcSend').mockResolvedValue(mockBtcReviewResult);
	let store: UtxosFeeStore;

	const props = {
		source,
		amount,
		networkId
	};

	beforeEach(() => {
		mockPage.reset();
		store = initUtxosFeeStore();
		store.reset();
	});

	it('should call prepareBtcSend with proper params', async () => {
		const setUtxosFeeSpy = vi.spyOn(store, 'setUtxosFee');
		const prepareBtcSendSpy = mockBtcUtxosService();

		mockAuthStore();

		render(UtxosFeeContext, {
			props,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).toHaveBeenCalledOnce();
			expect(prepareBtcSendSpy).toHaveBeenCalledWith({
				amount,
				network: 'mainnet',
				identity: mockIdentity,
				source
			});
			expect(setUtxosFeeSpy).toHaveBeenCalledOnce();
			expect(setUtxosFeeSpy).toHaveBeenCalledWith({
				utxosFee: {
					feeSatoshis: mockBtcReviewResult.feeSatoshis,
					utxos: mockBtcReviewResult.utxos
				},
				amountForFee: amount
			});
		});
	});

	it('should not call prepareBtcSend if no authIdentity available', async () => {
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

	it('should not call prepareBtcSend if no networkId provided', async () => {
		const prepareBtcSendSpy = mockBtcUtxosService();
		const { networkId: _, ...newProps } = props;

		mockAuthStore();

		render(UtxosFeeContext, {
			props: newProps,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call prepareBtcSend if amountError is true', async () => {
		const prepareBtcSendSpy = mockBtcUtxosService();

		mockAuthStore();

		render(UtxosFeeContext, {
			props: {
				...props,
				amountError: true
			},
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});

	it('should call prepareBtcSend with default value if no amount provided', async () => {
		const prepareBtcSendSpy = mockBtcUtxosService();
		const { amount: _, ...newProps } = props;

		mockAuthStore();

		render(UtxosFeeContext, {
			props: newProps,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).toHaveBeenCalled();
			expect(prepareBtcSendSpy).toHaveBeenCalledWith({
				amount: Number(DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE),
				network: 'mainnet',
				identity: mockIdentity,
				source
			});
		});
	});

	it('should call prepareBtcSend with default value if provided amount is 0', async () => {
		const prepareBtcSendSpy = mockBtcUtxosService();

		mockAuthStore();

		render(UtxosFeeContext, {
			props: { ...props, amount: 0 },
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).toHaveBeenCalled();
			expect(prepareBtcSendSpy).toHaveBeenCalledWith({
				amount: Number(DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE),
				network: 'mainnet',
				identity: mockIdentity,
				source
			});
		});
	});

	it('should not call prepareBtcSend if provided amount is 0 or undefined and the fee is already known', async () => {
		const prepareBtcSendSpy = mockBtcUtxosService();

		mockAuthStore();

		const { rerender } = render(UtxosFeeContext, {
			props,
			context: mockContext(store)
		});

		await rerender({ ...props, amount: 0 });
		await rerender({ ...props, amount: undefined });

		await waitFor(() => {
			expect(prepareBtcSendSpy).toHaveBeenCalledOnce();
		});
	});

	it('should not call prepareBtcSend if invalid networkId is provided', async () => {
		const prepareBtcSendSpy = mockBtcUtxosService();

		mockAuthStore();

		render(UtxosFeeContext, {
			props: { ...props, networkId: ICP_NETWORK_ID },
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call prepareBtcSend if the same amount is already in the store', async () => {
		const prepareBtcSendSpy = mockBtcUtxosService();
		mockAuthStore();

		store.setUtxosFee({
			utxosFee: {
				feeSatoshis: 100n,
				utxos: []
			},
			amountForFee: amount
		});

		render(UtxosFeeContext, {
			props,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});

	it('should reset the store and call prepareBtcSend if the new amount is greater than the proportion', async () => {
		const prepareBtcSendSpy = mockBtcUtxosService();
		const resetSpy = vi.spyOn(store, 'reset');
		mockAuthStore();

		store.setUtxosFee({
			utxosFee: {
				feeSatoshis: 100n,
				utxos: []
			},
			amountForFee: 1
		});

		render(UtxosFeeContext, {
			props: { ...props, amount: 1 * BTC_AMOUNT_FOR_UTXOS_FEE_UPDATE_PROPORTION },
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(resetSpy).toHaveBeenCalledOnce();
			expect(prepareBtcSendSpy).toHaveBeenCalledOnce();
		});
	});

	it('should not call prepareBtcSend if source is empty', async () => {
		const prepareBtcSendSpy = mockBtcUtxosService();

		mockAuthStore();

		render(UtxosFeeContext, {
			props: { ...props, source: '' },
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(prepareBtcSendSpy).not.toHaveBeenCalled();
		});
	});
});
