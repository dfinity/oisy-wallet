import BtcUtxosFee from '$btc/components/send/BtcUtxosFee.svelte';
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
});
