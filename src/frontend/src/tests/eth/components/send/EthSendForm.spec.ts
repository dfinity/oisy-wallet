import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SEND_TRANSACTION_PRIORITY_ENABLED } from '$env/send-transaction-priority.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthSendForm from '$eth/components/send/EthSendForm.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import {
	SEND_DESTINATION_SECTION,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('EthSendForm', () => {
	const mockContext = new Map([]);
	mockContext.set(
		SEND_CONTEXT_KEY,
		initSendContext({
			token: ETHEREUM_TOKEN
		})
	);
	mockContext.set(
		ETH_FEE_CONTEXT_KEY,
		initEthFeeContext({
			feeStore: initEthFeeStore(),
			feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
			feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
			feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
		})
	);

	const props = {
		destination: '0xF2777205439a8c7be0425cbb21D8DB7426Df5DE9',
		amount: '22000000',
		network: ETHEREUM_NETWORK,
		nativeEthereumToken: ETHEREUM_TOKEN,
		onBack: vi.fn(),
		onNext: vi.fn(),
		onTokensList: vi.fn(),
		cancel: mockSnippet
	};

	const amountSelector = `input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`;
	const toolbarSelector = 'div[data-tid="toolbar"]';

	it('should render all fields', () => {
		const { container, getByTestId, getByText } = render(EthSendForm, {
			props,
			context: mockContext
		});

		const amount: HTMLInputElement | null = container.querySelector(amountSelector);

		expect(amount).not.toBeNull();

		expect(getByTestId(SEND_DESTINATION_SECTION)).toBeInTheDocument();

		// The label follows the feature flag: the estimate only replaces the ceiling where the
		// priority work is enabled.
		expect(
			getByText(
				SEND_TRANSACTION_PRIORITY_ENABLED
					? en.fee.text.estimated_fee_eth
					: // max_fee_eth contains HTML, so match the leading plain-text fragment only
						'Max fee'
			)
		).toBeInTheDocument();

		const toolbar: HTMLDivElement | null = container.querySelector(toolbarSelector);

		expect(toolbar).not.toBeNull();
	});
});
