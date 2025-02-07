import { ETHEREUM_NETWORK } from '$env/networks/networks.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthSendForm from '$eth/components/send/EthSendForm.svelte';
import { FEE_CONTEXT_KEY, initFeeContext, initFeeStore } from '$eth/stores/fee.store';
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
		sourceNetwork: ETHEREUM_NETWORK,
		nativeEthereumToken: ETHEREUM_TOKEN
	};

	const destinationSelector = 'input[data-tid="destination-input"]';
	const amountSelector = 'input[data-tid="amount-input"]';
	const sourceSelector = 'div[id="source"]';
	const balanceSelector = 'div[id="balance"]';
	const maxFeeEthSelector = 'div[id="max-fee-eth"]';
	const sendInfoMessageBoxSelector = 'div[data-tid="send-info-message-box"]';
	const toolbarSelector = 'div[data-tid="toolbar"]';

	it('should render all fields', () => {
		const { container } = render(EthSendForm, {
			props,
			context: mockContext
		});

		const destination: HTMLInputElement | null = container.querySelector(destinationSelector);
		expect(destination).not.toBeNull();

		const amount: HTMLInputElement | null = container.querySelector(amountSelector);
		expect(amount).not.toBeNull();

		const source: HTMLDivElement | null = container.querySelector(sourceSelector);
		expect(source).not.toBeNull();

		const balance: HTMLDivElement | null = container.querySelector(balanceSelector);
		expect(balance).not.toBeNull();

		const maxFeeEth: HTMLDivElement | null = container.querySelector(maxFeeEthSelector);
		expect(maxFeeEth).not.toBeNull();

		const sendInfoMessageBox: HTMLDivElement | null = container.querySelector(
			sendInfoMessageBoxSelector
		);
		expect(sendInfoMessageBox).not.toBeNull();

		const toolbar: HTMLDivElement | null = container.querySelector(toolbarSelector);
		expect(toolbar).not.toBeNull();
	});

	it('should not render source field', () => {
		const { container } = render(EthSendForm, {
			props: { ...props, simplifiedForm: true },
			context: mockContext
		});

		const destination: HTMLInputElement | null = container.querySelector(destinationSelector);
		expect(destination).not.toBeNull();

		const amount: HTMLInputElement | null = container.querySelector(amountSelector);
		expect(amount).not.toBeNull();

		const source: HTMLDivElement | null = container.querySelector(sourceSelector);
		expect(source).toBeNull();

		const balance: HTMLDivElement | null = container.querySelector(balanceSelector);
		expect(balance).not.toBeNull();

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
