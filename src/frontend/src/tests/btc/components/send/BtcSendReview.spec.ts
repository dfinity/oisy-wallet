import BtcSendReview from '$btc/components/send/BtcSendReview.svelte';
import { initUtxosFeeStore, UTXOS_FEE_CONTEXT_KEY } from '$btc/stores/utxos-fee.store';
import type { UtxosFee } from '$btc/types/btc-send';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { REVIEW_FORM_SEND_BUTTON } from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import { mockBtcAddress, mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('BtcSendReview', () => {
	const defaultBalance = 1000000n;
	const mockContext = ({
		balance = defaultBalance,
		utxosFee
	}: {
		balance?: bigint;
		utxosFee?: UtxosFee;
	} = {}) => {
		const utxosFeeStore = initUtxosFeeStore();
		utxosFeeStore.setUtxosFee({ utxosFee });

		return new Map([
			[
				SEND_CONTEXT_KEY,
				{
					sendToken: readable(BTC_MAINNET_TOKEN),
					sendTokenDecimals: readable(BTC_MAINNET_TOKEN.decimals),
					sendTokenId: readable(BTC_MAINNET_TOKEN.id),
					sendTokenStandard: readable(BTC_MAINNET_TOKEN.standard),
					sendTokenSymbol: readable(BTC_MAINNET_TOKEN.symbol),
					sendTokenNetworkId: readable(BTC_MAINNET_TOKEN.network.id),
					sendTokenExchangeRate: readable(),
					sendBalance: readable(balance)
				}
			],
			[UTXOS_FEE_CONTEXT_KEY, { store: utxosFeeStore }]
		]);
	};
	const props = {
		destination: mockBtcAddress,
		source: mockBtcAddress,
		amount: 0.0001,
		onBack: vi.fn(),
		onSend: vi.fn()
	};

	const buttonTestId = REVIEW_FORM_SEND_BUTTON;

	beforeEach(() => {
		mockPage.reset();
	});

	it('should keep the next button enabled', () => {
		const { getByTestId } = render(BtcSendReview, {
			props,
			context: mockContext({ utxosFee: mockUtxosFee })
		});

		expect(getByTestId(buttonTestId)).not.toHaveAttribute('disabled');
	});
});
