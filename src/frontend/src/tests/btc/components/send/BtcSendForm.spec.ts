import BtcSendForm from '$btc/components/send/BtcSendForm.svelte';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import {
	SEND_DESTINATION_SECTION,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { render } from '@testing-library/svelte';

describe('BtcSendForm', () => {
	const mockContext = new Map([]);
	mockContext.set(
		SEND_CONTEXT_KEY,
		initSendContext({
			token: BTC_MAINNET_TOKEN
		})
	);

	const props = {
		destination: mockBtcAddress,
		amount: 22_000_000,
		networkId: BTC_MAINNET_NETWORK_ID,
		source: '0xF2777205439a8c7be0425cbb21D8DB7426Df5DE9'
	};

	const amountSelector = `input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`;
	const toolbarSelector = 'div[data-tid="toolbar"]';

	it('should render all fields', () => {
		const { container, getByTestId } = render(BtcSendForm, {
			props,
			context: mockContext
		});

		const amount: HTMLInputElement | null = container.querySelector(amountSelector);

		expect(amount).not.toBeNull();

		expect(getByTestId(SEND_DESTINATION_SECTION)).toBeInTheDocument();

		const toolbar: HTMLDivElement | null = container.querySelector(toolbarSelector);

		expect(toolbar).not.toBeNull();
	});
});
