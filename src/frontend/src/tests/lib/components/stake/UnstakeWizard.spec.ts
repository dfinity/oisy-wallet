import { BAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_usdc.env';
import UnstakeWizard from '$lib/components/stake/UnstakeWizard.svelte';
import { WizardStepsUnstake } from '$lib/enums/wizard-steps';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { Vault } from '$lib/types/vaults';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

vi.mock('$eth/services/eth-listener.services', () => ({
	initMinedTransactionsListener: vi.fn(() => ({
		disconnect: vi.fn()
	}))
}));

describe('UnstakeWizard', () => {
	const mockContext = () =>
		new Map<symbol, SendContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: BAUTOPILOT_USDC_TOKEN })]
		]);

	const mockVault: Vault = {
		token: { ...BAUTOPILOT_USDC_TOKEN, enabled: true },
		apy: '5.5'
	};

	const props = {
		amount: 0.001,
		unstakeProgressStep: 'test',
		currentStep: {
			name: WizardStepsUnstake.UNSTAKE,
			title: 'test'
		},
		onClose: () => {},
		onBack: () => {},
		onNext: () => {}
	};

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('renders unsupported staking message', () => {
		const { container } = render(UnstakeWizard, {
			props
		});

		expect(container).toHaveTextContent(en.stake.text.unsupported_token_staking);
	});

	it('renders HarvestUnstakeWizard when vault is harvest autopilot', () => {
		const { container } = render(UnstakeWizard, {
			props: { ...props, vault: mockVault },
			context: mockContext()
		});

		expect(container).not.toHaveTextContent(en.stake.text.unsupported_token_staking);
		expect(container).toHaveTextContent(en.send.text.review);
	});

	it('renders unsupported message when vault token is not harvest autopilot', () => {
		const { container } = render(UnstakeWizard, {
			props: { ...props, vault: { token: mockValidIcrcToken, apy: '1.0' } }
		});

		expect(container).toHaveTextContent(en.stake.text.unsupported_token_staking);
	});
});
