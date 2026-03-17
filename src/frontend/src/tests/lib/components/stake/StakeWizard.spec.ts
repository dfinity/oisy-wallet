import { BAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_usdc.env';
import StakeWizard from '$lib/components/stake/StakeWizard.svelte';
import { WizardStepsStake } from '$lib/enums/wizard-steps';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { Vault } from '$lib/types/vaults';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

describe('StakeWizard', () => {
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
		stakeProgressStep: 'test',
		currentStep: {
			name: WizardStepsStake.STAKE,
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
		const { container } = render(StakeWizard, {
			props
		});

		expect(container).toHaveTextContent(en.stake.text.unsupported_token_staking);
	});

	it('renders HarvestStakeWizard when vault is harvest autopilot', () => {
		const { container } = render(StakeWizard, {
			props: { ...props, vault: mockVault },
			context: mockContext()
		});

		expect(container).not.toHaveTextContent(en.stake.text.unsupported_token_staking);
	});

	it('renders unsupported message when vault token is not harvest autopilot', () => {
		const { container } = render(StakeWizard, {
			props: { ...props, vault: { token: mockValidIcrcToken, apy: '1.0' } as unknown as Vault }
		});

		expect(container).toHaveTextContent(en.stake.text.unsupported_token_staking);
	});
});
