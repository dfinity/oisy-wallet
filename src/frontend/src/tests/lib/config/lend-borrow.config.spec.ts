import {
	lendBorrowProvidersConfig,
	liquidiumBorrowWizardSteps,
	liquidiumRepayWizardSteps,
	liquidiumSupplyWizardSteps,
	liquidiumWithdrawWizardSteps
} from '$lib/config/lend-borrow.config';
import {
	WizardStepsLiquidiumBorrow,
	WizardStepsLiquidiumRepay,
	WizardStepsLiquidiumSupply,
	WizardStepsLiquidiumWithdraw
} from '$lib/enums/wizard-steps';
import { LendBorrowProvider } from '$lib/types/lend-borrow';
import en from '$tests/mocks/i18n.mock';

describe('lend-borrow.config', () => {
	describe('liquidiumSupplyWizardSteps', () => {
		it('returns the supply wizard steps with expected names and titles', () => {
			expect(liquidiumSupplyWizardSteps({ i18n: en })).toStrictEqual([
				{ name: WizardStepsLiquidiumSupply.SUPPLY, title: en.liquidium.text.action_supply },
				{ name: WizardStepsLiquidiumSupply.REVIEW, title: en.liquidium.text.supply_review },
				{ name: WizardStepsLiquidiumSupply.SUPPLYING, title: en.liquidium.text.supplying },
				{
					name: WizardStepsLiquidiumSupply.TOKENS_LIST,
					title: en.liquidium.text.select_supply_token
				}
			]);
		});
	});

	describe('liquidiumBorrowWizardSteps', () => {
		it('returns the borrow wizard steps with expected names and titles', () => {
			expect(liquidiumBorrowWizardSteps({ i18n: en })).toStrictEqual([
				{ name: WizardStepsLiquidiumBorrow.BORROW, title: en.liquidium.text.action_borrow },
				{ name: WizardStepsLiquidiumBorrow.REVIEW, title: en.liquidium.text.borrow_review },
				{ name: WizardStepsLiquidiumBorrow.BORROWING, title: en.liquidium.text.borrowing },
				{
					name: WizardStepsLiquidiumBorrow.TOKENS_LIST,
					title: en.liquidium.text.select_borrow_token
				}
			]);
		});
	});

	describe('liquidiumWithdrawWizardSteps', () => {
		it('returns the withdraw wizard steps with expected names and titles', () => {
			expect(liquidiumWithdrawWizardSteps({ i18n: en })).toStrictEqual([
				{ name: WizardStepsLiquidiumWithdraw.WITHDRAW, title: en.liquidium.text.action_withdraw },
				{ name: WizardStepsLiquidiumWithdraw.REVIEW, title: en.liquidium.text.withdraw_review },
				{ name: WizardStepsLiquidiumWithdraw.WITHDRAWING, title: en.liquidium.text.withdrawing },
				{
					name: WizardStepsLiquidiumWithdraw.TOKENS_LIST,
					title: en.liquidium.text.select_withdraw_token
				}
			]);
		});
	});

	describe('liquidiumRepayWizardSteps', () => {
		it('returns the repay wizard steps with expected names and titles', () => {
			expect(liquidiumRepayWizardSteps({ i18n: en })).toStrictEqual([
				{ name: WizardStepsLiquidiumRepay.REPAY, title: en.liquidium.text.action_repay },
				{ name: WizardStepsLiquidiumRepay.REVIEW, title: en.liquidium.text.repay_review },
				{ name: WizardStepsLiquidiumRepay.REPAYING, title: en.liquidium.text.repaying },
				{
					name: WizardStepsLiquidiumRepay.TOKENS_LIST,
					title: en.liquidium.text.select_repay_token
				}
			]);
		});
	});

	describe('lendBorrowProvidersConfig', () => {
		it('exposes the Liquidium provider config', () => {
			expect(lendBorrowProvidersConfig[LendBorrowProvider.LIQUIDIUM]).toStrictEqual({
				name: 'Liquidium',
				descriptionKey: 'liquidium.text.description',
				logo: '/images/dapps/liquidium-logo.webp',
				url: 'https://liquidium.fi/',
				docsUrl: 'https://liquidium.fi/docs'
			});
		});
	});
});
