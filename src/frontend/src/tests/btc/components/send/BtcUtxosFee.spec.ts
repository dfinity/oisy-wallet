import BtcUtxosFee from '$btc/components/send/BtcUtxosFee.svelte';
import { BTC_UTXOS_FEE_UPDATE_INTERVAL } from '$btc/constants/btc.constants';
import * as btcUtxosApi from '$btc/services/btc-utxos.service';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { initSendContext, SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import { formatToken } from '$lib/utils/format.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress, mockUtxosFee } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('BtcUtxosFee', () => {
	const mockContext = new Map([]);
	mockContext.set(
		SEND_CONTEXT_KEY,
		initSendContext({
			token: BTC_MAINNET_TOKEN
		})
	);
	const props = {
		utxosFee: mockUtxosFee,
		amount: 1,
		networkId: BTC_MAINNET_NETWORK_ID,
		source: mockBtcAddress
	};

	it('renders utxos fee if provided', () => {
		const { container } = render(BtcUtxosFee, {
			props,
			context: mockContext
		});

		expect(container).toHaveTextContent(en.fee.text.fee);

		expect(container).toHaveTextContent(
			formatToken({
				value: props.utxosFee.feeSatoshis,
				unitName: BTC_MAINNET_TOKEN.decimals,
				displayDecimals: BTC_MAINNET_TOKEN.decimals
			})
		);
	});

	it('fetches and renders utxos fee if not provided', async () => {
		vi.spyOn(btcUtxosApi, 'prepareBtcSend').mockResolvedValue({
			feeSatoshis: mockUtxosFee.feeSatoshis,
			utxos: mockUtxosFee.utxos
		});
		mockAuthStore();

		const { container } = render(BtcUtxosFee, {
			props: {
				...props,
				utxosFee: undefined
			},
			context: mockContext
		});

		await waitFor(() => {
			expect(container).toHaveTextContent(en.fee.text.fee);

			expect(container).toHaveTextContent(
				formatToken({
					value: mockUtxosFee.feeSatoshis,
					unitName: BTC_MAINNET_TOKEN.decimals,
					displayDecimals: BTC_MAINNET_TOKEN.decimals
				})
			);
		});
	});

	describe('scheduler mechanism', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should call prepareBtcSend periodically using the scheduler', async () => {
			const prepareBtcSendSpy = vi.spyOn(btcUtxosApi, 'prepareBtcSend').mockResolvedValue({
				feeSatoshis: mockUtxosFee.feeSatoshis,
				utxos: mockUtxosFee.utxos
			});

			mockAuthStore();

			render(BtcUtxosFee, {
				props: {
					...props,
					utxosFee: undefined
				},
				context: mockContext
			});

			// Wait for initial call during onMount
			await waitFor(() => {
				expect(prepareBtcSendSpy).toHaveBeenCalledOnce();
			});

			// Advance timer by the interval and verify scheduler calls prepareBtcSend
			await vi.advanceTimersByTimeAsync(BTC_UTXOS_FEE_UPDATE_INTERVAL);

			await waitFor(() => {
				expect(prepareBtcSendSpy).toHaveBeenCalledTimes(2);
			});

			// Advance timer again to verify continuous scheduling
			await vi.advanceTimersByTimeAsync(BTC_UTXOS_FEE_UPDATE_INTERVAL);

			await waitFor(() => {
				expect(prepareBtcSendSpy).toHaveBeenCalledTimes(3);
			});
		});

		it('should stop scheduler when component is destroyed', async () => {
			const prepareBtcSendSpy = vi.spyOn(btcUtxosApi, 'prepareBtcSend').mockResolvedValue({
				feeSatoshis: mockUtxosFee.feeSatoshis,
				utxos: mockUtxosFee.utxos
			});

			mockAuthStore();

			const { unmount } = render(BtcUtxosFee, {
				props: {
					...props,
					utxosFee: undefined
				},
				context: mockContext
			});

			// Wait for initial call
			await waitFor(() => {
				expect(prepareBtcSendSpy).toHaveBeenCalledOnce();
			});

			// Advance timer to verify scheduler is working
			await vi.advanceTimersByTimeAsync(BTC_UTXOS_FEE_UPDATE_INTERVAL);

			await waitFor(() => {
				expect(prepareBtcSendSpy).toHaveBeenCalledTimes(2);
			});

			// Unmount component to trigger onDestroy
			unmount();

			// Advance timer again - should not call prepareBtcSend anymore
			await vi.advanceTimersByTimeAsync(BTC_UTXOS_FEE_UPDATE_INTERVAL);

			// Should still be 2 calls (no additional calls after unmount)
			expect(prepareBtcSendSpy).toHaveBeenCalledTimes(2);
		});
	});
});
