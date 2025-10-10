import { ICP_SYMBOL } from '$env/tokens/tokens.icp.env';
import { stakeWizardSteps } from '$lib/config/stake.config';
import { WizardStepsStake } from '$lib/enums/wizard-steps';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';

describe('stake.config', () => {
	describe('stakeWizardSteps', () => {
		const mockParams = {
			i18n: en,
			tokenSymbol: ICP_SYMBOL
		};

		it('should return the correct steps with expected text and state', () => {
			const steps = stakeWizardSteps(mockParams);

			expect(steps).toStrictEqual([
				{
					name: WizardStepsStake.STAKE,
					title: replacePlaceholders(en.stake.text.stake, {
						$token_symbol: ICP_SYMBOL
					})
				},
				{
					name: WizardStepsStake.REVIEW,
					title: en.stake.text.review
				},
				{
					name: WizardStepsStake.STAKING,
					title: en.stake.text.executing_transaction
				}
			]);
		});
	});
});
