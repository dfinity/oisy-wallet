import { BAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_usdc.env';
import UnstakeModal from '$lib/components/stake/UnstakeModal.svelte';
import * as stakeConfig from '$lib/config/stake.config';
import { PLAUSIBLE_EVENT_RESULT_STATUSES, PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
import { WizardStepsUnstake } from '$lib/enums/wizard-steps';
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

describe('UnstakeModal', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should display unsupported staking message', () => {
		const { container } = render(UnstakeModal, {
			props: {
				token: mockValidIcrcToken as Token,
				totalStaked: 1000n
			}
		});

		expect(container).toHaveTextContent(en.stake.text.unsupported_token_staking);
	});

	it('should not display unsupported message when vault is harvest autopilot', () => {
		const mockVault: Vault = {
			token: { ...BAUTOPILOT_USDC_TOKEN, enabled: true },
			apy: '5.5'
		};

		const { container } = render(UnstakeModal, {
			props: {
				token: BAUTOPILOT_USDC_TOKEN as Token,
				vault: mockVault,
				totalStaked: 1000n
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
			name: PLAUSIBLE_EVENTS.UNSTAKE,
			metadata: expect.objectContaining({
				result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.CANCEL
			})
		});

		const steps = [
			WizardStepsUnstake.UNSTAKE,
			WizardStepsUnstake.REVIEW,
			WizardStepsUnstake.UNSTAKING
		];

		beforeEach(() => {
			vi.useFakeTimers();

			vi.spyOn(stakeConfig, 'getUnstakeWizardComponent').mockReturnValue(StakeWizardStub);
			vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const renderOnStep = async (step: WizardStepsUnstake) => {
			const result = render(UnstakeModal, {
				props: { token: BAUTOPILOT_USDC_TOKEN as Token, vault, totalStaked: 1000n }
			});

			for (let i = 0; i < steps.indexOf(step); i++) {
				await fireEvent.click(result.getByTestId('stake-wizard-stub-next'));
			}

			expect(result.getByTestId('stake-wizard-stub-step')).toHaveTextContent(step);

			return result;
		};

		const closeFromWizard = async ({ getByTestId }: RenderResult<typeof UnstakeModal>) => {
			await fireEvent.click(getByTestId('stake-wizard-stub-close'));

			// The modal tracks once its closing animation is over.
			await vi.runAllTimersAsync();
		};

		it('should track a cancellation when the dialog closes on the review step', async () => {
			await closeFromWizard(await renderOnStep(WizardStepsUnstake.REVIEW));

			expect(analytics.trackEvent).toHaveBeenCalledExactlyOnceWith(cancellation);
		});

		// The unstaking step leaves the user no way to close the dialog: a close there is the wizard
		// ending a send whose outcome it tracks itself.
		it('should not track a cancellation when the wizard closes the dialog on the unstaking step', async () => {
			await closeFromWizard(await renderOnStep(WizardStepsUnstake.UNSTAKING));

			expect(analytics.trackEvent).not.toHaveBeenCalled();
		});
	});
});
