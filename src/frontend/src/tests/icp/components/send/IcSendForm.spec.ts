import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import IcSendForm from '$icp/components/send/IcSendForm.svelte';
import { BITCOIN_FEE_CONTEXT_KEY, initBitcoinFeeStore } from '$icp/stores/bitcoin-fee.store';
import { ETHEREUM_FEE_CONTEXT_KEY, initEthereumFeeStore } from '$icp/stores/ethereum-fee.store';
import { TOKEN_INPUT_CURRENCY_TOKEN } from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import { render } from '@testing-library/svelte';

describe('IcSendForm', () => {
	const ethereumFeeStore = initEthereumFeeStore();
	ethereumFeeStore.setFee({ maxTransactionFee: 300n });

	const mockContext = new Map([]);
	mockContext.set(
		SEND_CONTEXT_KEY,
		initSendContext({
			sendPurpose: 'convert-cketh-to-eth',
			token: ETHEREUM_TOKEN
		})
	);
	mockContext.set(ETHEREUM_FEE_CONTEXT_KEY, {
		store: ethereumFeeStore
	});
	mockContext.set(BITCOIN_FEE_CONTEXT_KEY, {
		store: initBitcoinFeeStore()
	});

	const props = {
		destination: '0xF2777205439a8c7be0425cbb21D8DB7426Df5DE9',
		amount: 22_000_000,
		networkId: ETHEREUM_NETWORK_ID,
		source: '0xF2777205439a8c7be0425cbb21D8DB7426Df5DE9'
	};

	const amountSelector = `input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`;
	const destinationSelector = 'input[data-tid="destination-input"]';
	const networkSelector = 'div[id="network"]';
	const feeSelector = 'p[id="fee"]';
	const ethereumEstimatedFeeSelector = 'p[id="kyt-fee"]';
	const toolbarSelector = 'div[data-tid="toolbar"]';

	it('should render all fields', () => {
		const { container } = render(IcSendForm, {
			props,
			context: mockContext
		});

		const amount: HTMLInputElement | null = container.querySelector(amountSelector);
		expect(amount).not.toBeNull();

		const destination: HTMLInputElement | null = container.querySelector(destinationSelector);
		expect(destination).not.toBeNull();

		const network: HTMLDivElement | null = container.querySelector(networkSelector);
		expect(network).not.toBeNull();

		const fee: HTMLParagraphElement | null = container.querySelector(feeSelector);
		expect(fee).not.toBeNull();

		const ethereumEstimatedFee: HTMLParagraphElement | null = container.querySelector(
			ethereumEstimatedFeeSelector
		);
		expect(ethereumEstimatedFee).not.toBeNull();

		const toolbar: HTMLDivElement | null = container.querySelector(toolbarSelector);
		expect(toolbar).not.toBeNull();
	});

	it('should not render destination field', () => {
		const { container } = render(IcSendForm, {
			props: { ...props, simplifiedForm: true },
			context: mockContext
		});

		const amount: HTMLInputElement | null = container.querySelector(amountSelector);
		expect(amount).not.toBeNull();

		const destination: HTMLInputElement | null = container.querySelector(destinationSelector);
		expect(destination).toBeNull();

		const network: HTMLDivElement | null = container.querySelector(networkSelector);
		expect(network).not.toBeNull();

		const fee: HTMLParagraphElement | null = container.querySelector(feeSelector);
		expect(fee).not.toBeNull();

		const ethereumEstimatedFee: HTMLParagraphElement | null = container.querySelector(
			ethereumEstimatedFeeSelector
		);
		expect(ethereumEstimatedFee).not.toBeNull();

		const toolbar: HTMLDivElement | null = container.querySelector(toolbarSelector);
		expect(toolbar).not.toBeNull();
	});
});
