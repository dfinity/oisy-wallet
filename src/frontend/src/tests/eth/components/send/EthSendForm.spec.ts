import { ETHEREUM_NETWORK } from '$env/networks/networks.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthSendForm from '$eth/components/send/EthSendForm.svelte';
import { FEE_CONTEXT_KEY, initFeeContext, initFeeStore } from '$eth/stores/fee.store';
import { TOKEN_INPUT_CURRENCY_TOKEN } from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import { render } from '@testing-library/svelte';
import { BigNumber } from 'alchemy-sdk';
import { writable } from 'svelte/store';

describe('EthSendForm', () => {
	const mockContext = new Map([]);
	mockContext.set(
		SEND_CONTEXT_KEY,
		initSendContext({
			sendPurpose: 'convert-eth-to-cketh',
			token: ETHEREUM_TOKEN
		})
	);
	mockContext.set(
		FEE_CONTEXT_KEY,
		initFeeContext({
			feeStore: initFeeStore(),
			feeSymbolStore: writable(undefined),
			feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
			feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
		})
	);

	const props = {
		destination: '0xF2777205439a8c7be0425cbb21D8DB7426Df5DE9',
		amount: BigNumber.from(22000000),
		network: ETHEREUM_NETWORK,
		nativeEthereumToken: ETHEREUM_TOKEN,
		sourceNetwork: ETHEREUM_NETWORK
	};

	const amountSelector = `input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`;
	const destinationSelector = 'input[data-tid="destination-input"]';
	const networkSelector = 'div[id="network"]';
	const maxFeeEthSelector = 'div[id="max-fee-eth"]';
	const sendInfoMessageBoxSelector = 'div[data-tid="send-info-message-box"]';
	const toolbarSelector = 'div[data-tid="toolbar"]';

	it('should render all fields', () => {
		const { container } = render(EthSendForm, {
			props,
			context: mockContext
		});

		const amount: HTMLInputElement | null = container.querySelector(amountSelector);
		expect(amount).not.toBeNull();

		const destination: HTMLInputElement | null = container.querySelector(destinationSelector);
		expect(destination).not.toBeNull();

		const network: HTMLDivElement | null = container.querySelector(networkSelector);
		expect(network).not.toBeNull();

		const maxFeeEth: HTMLDivElement | null = container.querySelector(maxFeeEthSelector);
		expect(maxFeeEth).not.toBeNull();

		const sendInfoMessageBox: HTMLDivElement | null = container.querySelector(
			sendInfoMessageBoxSelector
		);
		expect(sendInfoMessageBox).not.toBeNull();

		const toolbar: HTMLDivElement | null = container.querySelector(toolbarSelector);
		expect(toolbar).not.toBeNull();
	});

	it('should not render destination field', () => {
		const { container } = render(EthSendForm, {
			props: { ...props, destinationEditable: false },
			context: mockContext
		});

		const amount: HTMLInputElement | null = container.querySelector(amountSelector);
		expect(amount).not.toBeNull();

		const destination: HTMLInputElement | null = container.querySelector(destinationSelector);
		expect(destination).toBeNull();

		const network: HTMLDivElement | null = container.querySelector(networkSelector);
		expect(network).not.toBeNull();

		const maxFeeEth: HTMLDivElement | null = container.querySelector(maxFeeEthSelector);
		expect(maxFeeEth).not.toBeNull();

		const sendInfoMessageBox: HTMLDivElement | null = container.querySelector(
			sendInfoMessageBoxSelector
		);
		expect(sendInfoMessageBox).not.toBeNull();

		const toolbar: HTMLDivElement | null = container.querySelector(toolbarSelector);
		expect(toolbar).not.toBeNull();
	});
});
