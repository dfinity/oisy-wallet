import { BAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_usdc.env';
import StakeModal from '$lib/components/stake/StakeModal.svelte';
import * as stakeConfig from '$lib/config/stake.config';
import { PLAUSIBLE_EVENT_RESULT_STATUSES, PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
import { WizardStepsStake } from '$lib/enums/wizard-steps';
import * as analytics from '$lib/services/analytics.services';
import type { Token } from '$lib/types/token';
import type { Vault } from '$lib/types/vaults';
import StakeWizardStub from '$tests/lib/components/stake/StakeWizardStub.svelte';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render, type RenderResult } from '@testing-library/svelte';

vi.mock('$eth/services/eth-listener.services', () => ({
	initMinedTransactionsListener: vi.fn(() => ({
		disconnect: vi.fn()
	}))
}));

describe('StakeModal', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should display unsupported staking message', () => {
		const { container } = render(StakeModal, {
			props: {
				token: mockValidIcrcToken as Token
			}
		});

		expect(container).toHaveTextContent(en.stake.text.unsupported_token_staking);
	});

	it('should not display unsupported message when vault is harvest autopilot', () => {
		const mockVault: Vault = {
			token: { ...BAUTOPILOT_USDC_TOKEN, enabled: true },
			apy: '5.5'
		};

		const { container } = render(StakeModal, {
			props: {
				token: BAUTOPILOT_USDC_TOKEN as Token,
				vault: mockVault
			}
		});

		expect(container).not.toHaveTextContent(en.stake.text.unsupported_token_staking);
	});

	describe('cancellation tracking', () => {
		const vault: Vault = {
			token: { ...BAUTOPILOT_USDC_TOKEN, enabled: true },
			apy: '5.5'
		};

		const cancellation = expect.objectContaining({
			name: PLAUSIBLE_EVENTS.STAKE,
			metadata: expect.objectContaining({
				result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.CANCEL
			})
		});

		beforeEach(() => {
			vi.useFakeTimers();

			vi.spyOn(stakeConfig, 'getStakeWizardComponent').mockReturnValue(StakeWizardStub);
			vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const steps = [WizardStepsStake.STAKE, WizardStepsStake.REVIEW, WizardStepsStake.STAKING];

		const renderOnStep = async (step: WizardStepsStake) => {
			const result = render(StakeModal, {
				props: { token: BAUTOPILOT_USDC_TOKEN as Token, vault }
			});

			for (let i = 0; i < steps.indexOf(step); i++) {
				await fireEvent.click(result.getByTestId('stake-wizard-stub-next'));
			}

			expect(result.getByTestId('stake-wizard-stub-step')).toHaveTextContent(step);

			return result;
		};

		const closeFromWizard = async ({ getByTestId }: RenderResult<typeof StakeModal>) => {
			await fireEvent.click(getByTestId('stake-wizard-stub-close'));

			// The modal tracks once its closing animation is over.
			await vi.runAllTimersAsync();
		};

		it('should track a cancellation when the dialog closes on the review step', async () => {
			await closeFromWizard(await renderOnStep(WizardStepsStake.REVIEW));

			expect(analytics.trackEvent).toHaveBeenCalledExactlyOnceWith(cancellation);
		});

		// The staking step leaves the user no way to close the dialog: a close there is the wizard
		// ending a send whose outcome it tracks itself.
		it('should not track a cancellation when the wizard closes the dialog on the staking step', async () => {
			await closeFromWizard(await renderOnStep(WizardStepsStake.STAKING));

			expect(analytics.trackEvent).not.toHaveBeenCalled();
		});
	});
});
