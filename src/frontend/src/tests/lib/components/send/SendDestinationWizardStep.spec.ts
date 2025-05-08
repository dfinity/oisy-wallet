import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { SOLANA_DEVNET_TOKEN } from '$env/tokens/tokens.sol.env';
import SendDestinationWizardStep from '$lib/components/send/SendDestinationWizardStep.svelte';
import { SEND_DESTINATION_WIZARD_STEP } from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { Token } from '$lib/types/token';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

describe('SendDestinationWizardStep', () => {
	const props = {
		destination: mockEthAddress
	};

	const mockContext = (sendToken: Token) =>
		new Map<symbol, SendContext>([
			[
				SEND_CONTEXT_KEY,
				initSendContext({
					token: sendToken
				})
			]
		]);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should display BTC send destination components if sendToken network is BTC', () => {
		const { getByTestId } = render(SendDestinationWizardStep, {
			props,
			context: mockContext(BTC_MAINNET_TOKEN)
		});

		expect(
			getByTestId(`${SEND_DESTINATION_WIZARD_STEP}-${BTC_MAINNET_TOKEN.network.name}`)
		).toBeInTheDocument();
	});

	it('should display ETH send destination components if sendToken network is ETH', () => {
		const { getByTestId } = render(SendDestinationWizardStep, {
			props,
			context: mockContext(SEPOLIA_TOKEN)
		});

		expect(
			getByTestId(`${SEND_DESTINATION_WIZARD_STEP}-${SEPOLIA_TOKEN.network.name}`)
		).toBeInTheDocument();
	});

	it('should display IC send destination components if sendToken network is IC', () => {
		const { getByTestId } = render(SendDestinationWizardStep, {
			props,
			context: mockContext(mockValidIcCkToken)
		});

		expect(
			getByTestId(`${SEND_DESTINATION_WIZARD_STEP}-${mockValidIcCkToken.network.name}`)
		).toBeInTheDocument();
	});

	it('should display SOL send destination components if sendToken network is SOL', () => {
		const { getByTestId } = render(SendDestinationWizardStep, {
			props,
			context: mockContext(SOLANA_DEVNET_TOKEN)
		});

		expect(
			getByTestId(`${SEND_DESTINATION_WIZARD_STEP}-${SOLANA_DEVNET_TOKEN.network.name}`)
		).toBeInTheDocument();
	});

	it('should display ETH send destination components if sendToken network is EVM', () => {
		const { getByTestId } = render(SendDestinationWizardStep, {
			props,
			context: mockContext(BASE_ETH_TOKEN)
		});

		expect(
			getByTestId(`${SEND_DESTINATION_WIZARD_STEP}-${BASE_ETH_TOKEN.network.name}`)
		).toBeInTheDocument();
	});
});
