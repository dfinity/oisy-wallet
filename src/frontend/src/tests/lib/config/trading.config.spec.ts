import { tradingDepositWizardSteps } from '$lib/config/trading.config';
import { WizardStepsTradingDeposit } from '$lib/enums/wizard-steps';
import en from '$tests/mocks/i18n.mock';

describe('trading.config', () => {
	describe('tradingDepositWizardSteps', () => {
		const steps = tradingDepositWizardSteps({ i18n: en });

		it('builds the five deposit wizard steps in order', () => {
			expect(steps.map(({ name }) => name)).toEqual([
				WizardStepsTradingDeposit.DEPOSIT,
				WizardStepsTradingDeposit.TOKENS_LIST,
				WizardStepsTradingDeposit.FILTER_NETWORKS,
				WizardStepsTradingDeposit.REVIEW,
				WizardStepsTradingDeposit.DEPOSITING
			]);
		});

		it('uses the matching i18n titles', () => {
			expect(steps.map(({ title }) => title)).toEqual([
				en.trading.deposit.title,
				en.send.text.select_token,
				en.send.text.select_network_filter,
				en.trading.deposit.review_title,
				en.trading.deposit.progress_title
			]);
		});
	});
});
