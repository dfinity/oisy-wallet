import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import HarvestUnstakeWizard from '$eth/components/stake/harvest-autopilot/HarvestUnstakeWizard.svelte';
import { WizardStepsUnstake } from '$lib/enums/wizard-steps';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import type { Vault } from '$lib/types/vaults';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

vi.mock('$eth/derived/tokens.derived', () => ({
	enabledEthereumTokens: {
		subscribe: vi.fn((callback) => {
			callback([ETHEREUM_TOKEN]);
			return () => {};
		})
	}
}));

vi.mock('$evm/derived/tokens.derived', () => ({
	enabledEvmTokens: {
		subscribe: vi.fn((callback) => {
			callback([]);
			return () => {};
		})
	}
}));

vi.mock('$lib/derived/exchange.derived', () => ({
	exchanges: {
		subscribe: vi.fn((callback) => {
			callback({});
			return () => {};
		})
	}
}));

vi.mock('$eth/services/eth-listener.services', () => ({
	initMinedTransactionsListener: vi.fn(() => ({
		disconnect: vi.fn()
	}))
}));

describe('HarvestUnstakeWizard', () => {
	const mockVaultToken = {
		...mockValidErc4626Token,
		network: ETHEREUM_NETWORK,
		enabled: true
	};

	const mockVault: Vault = {
		token: mockVaultToken,
		apy: '5.5'
	};

	const buildContext = () => {
		const context = new Map([]);
		context.set(SEND_CONTEXT_KEY, initSendContext({ token: mockVaultToken }));
		return context;
	};

	const baseProps = {
		amount: 0.01,
		unstakeProgressStep: 'initialization',
		vault: mockVault,
		onClose: vi.fn(),
		onBack: vi.fn(),
		onNext: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render HarvestUnstakeForm when current step is UNSTAKE', () => {
		const { container } = render(HarvestUnstakeWizard, {
			props: {
				...baseProps,
				currentStep: { name: WizardStepsUnstake.UNSTAKE, title: 'Unstake' }
			},
			context: buildContext()
		});

		expect(container).toHaveTextContent(en.send.text.review);
	});

	it('should render HarvestUnstakeReview when current step is REVIEW', () => {
		const { container } = render(HarvestUnstakeWizard, {
			props: {
				...baseProps,
				currentStep: { name: WizardStepsUnstake.REVIEW, title: 'Review' }
			},
			context: buildContext()
		});

		expect(container).toHaveTextContent(en.stake.text.unstake_now);
	});

	it('should render UnstakeProgress when current step is UNSTAKING', () => {
		const { container } = render(HarvestUnstakeWizard, {
			props: {
				...baseProps,
				currentStep: { name: WizardStepsUnstake.UNSTAKING, title: 'Unstaking' }
			},
			context: buildContext()
		});

		expect(container).toHaveTextContent(en.send.text.initializing);
	});

	it('should not render form or review content when current step is undefined', () => {
		const { container } = render(HarvestUnstakeWizard, {
			props: {
				...baseProps,
				currentStep: undefined
			},
			context: buildContext()
		});

		expect(container).not.toHaveTextContent(en.send.text.review);
		expect(container).not.toHaveTextContent(en.stake.text.unstake_now);
		expect(container).not.toHaveTextContent(en.send.text.initializing);
	});
});
