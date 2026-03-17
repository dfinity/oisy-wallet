import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import HarvestStakeWizard from '$eth/components/stake/harvest-autopilot/HarvestStakeWizard.svelte';
import { WizardStepsStake } from '$lib/enums/wizard-steps';
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

describe('HarvestStakeWizard', () => {
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
		stakeProgressStep: 'initialization',
		vault: mockVault,
		onClose: vi.fn(),
		onBack: vi.fn(),
		onNext: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render HarvestStakeForm when current step is STAKE', () => {
		const { container } = render(HarvestStakeWizard, {
			props: {
				...baseProps,
				currentStep: { name: WizardStepsStake.STAKE, title: 'Stake' }
			},
			context: buildContext()
		});

		expect(container).toHaveTextContent(en.send.text.review);
	});

	it('should render HarvestStakeReview when current step is REVIEW', () => {
		const { container } = render(HarvestStakeWizard, {
			props: {
				...baseProps,
				currentStep: { name: WizardStepsStake.REVIEW, title: 'Review' }
			},
			context: buildContext()
		});

		expect(container).toHaveTextContent(en.stake.text.stake_now);
	});

	it('should render StakeProgress when current step is STAKING', () => {
		const { container } = render(HarvestStakeWizard, {
			props: {
				...baseProps,
				currentStep: { name: WizardStepsStake.STAKING, title: 'Staking' }
			},
			context: buildContext()
		});

		expect(container).toHaveTextContent(en.send.text.initializing);
	});

	it('should not render form or review content when current step is undefined', () => {
		const { container } = render(HarvestStakeWizard, {
			props: {
				...baseProps,
				currentStep: undefined
			},
			context: buildContext()
		});

		expect(container).not.toHaveTextContent(en.send.text.review);
		expect(container).not.toHaveTextContent(en.stake.text.stake_now);
		expect(container).not.toHaveTextContent(en.send.text.initializing);
	});
});
