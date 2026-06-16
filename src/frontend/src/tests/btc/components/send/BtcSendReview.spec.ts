import BtcSendReview from '$btc/components/send/BtcSendReview.svelte';
import { initUtxosFeeStore } from '$btc/stores/utxos-fee.store';
import type { UtxosFee } from '$btc/types/btc-send';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { REVIEW_FORM_SEND_BUTTON } from '$lib/constants/test-ids.constants';
import { mockBtcAddress, mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { mockUtxosFeeContextEntry } from '$tests/utils/fee.context.test-utils';
import { mockSendContextEntry } from '$tests/utils/send.context.test-utils';
import { render } from '@testing-library/svelte';

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

		return mockContextMap([
			mockSendContextEntry({ token: BTC_MAINNET_TOKEN, customSendBalance: balance }),
			mockUtxosFeeContextEntry(utxosFeeStore)
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
