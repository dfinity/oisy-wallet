import { tradingWithdrawWizardSteps } from '$lib/config/trading-withdraw.config';
import { WizardStepsTradingWithdraw } from '$lib/enums/wizard-steps';
import en from '$tests/mocks/i18n.mock';

describe('trading-withdraw.config', () => {
	describe('tradingWithdrawWizardSteps', () => {
		it('returns the withdraw wizard steps with expected names and titles', () => {
			expect(tradingWithdrawWizardSteps({ i18n: en })).toStrictEqual([
				{ name: WizardStepsTradingWithdraw.WITHDRAW, title: en.trading.withdraw.title },
				{ name: WizardStepsTradingWithdraw.REVIEW, title: en.trading.withdraw.review_title },
				{ name: WizardStepsTradingWithdraw.WITHDRAWING, title: en.trading.withdraw.progress_title },
				{ name: WizardStepsTradingWithdraw.TOKENS_LIST, title: en.trading.withdraw.title }
			]);
		});
	});
});
