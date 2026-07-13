import {
	WizardStepsLiquidiumBorrow,
	WizardStepsLiquidiumRepay,
	WizardStepsLiquidiumSupply,
	WizardStepsLiquidiumWithdraw
} from '$lib/enums/wizard-steps';
import { LendBorrowProvider, type LendBorrowProviderConfig } from '$lib/types/lend-borrow';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '$lib/types/wizard';

// Lend & borrow providers (mirrors `stakeProvidersConfig`): source of truth for
// each provider's name/logo/url/description. Liquidium only for now.
export const lendBorrowProvidersConfig: Record<LendBorrowProvider, LendBorrowProviderConfig> = {
	[LendBorrowProvider.LIQUIDIUM]: {
		name: 'Liquidium',
		descriptionKey: 'liquidium.text.description',
		logo: '/images/dapps/liquidium-logo.webp',
		url: 'https://liquidium.fi/',
		docsUrl: 'https://liquidium.fi/docs'
	}
};

export const liquidiumSupplyWizardSteps = ({
	i18n
}: WizardStepsParams): WizardSteps<WizardStepsLiquidiumSupply> => [
	{
		name: WizardStepsLiquidiumSupply.SUPPLY,
		title: i18n.liquidium.text.action_supply
	},
	{
		name: WizardStepsLiquidiumSupply.REVIEW,
		title: i18n.liquidium.text.supply_review
	},
	{
		name: WizardStepsLiquidiumSupply.SUPPLYING,
		title: i18n.liquidium.text.supplying
	},
	{
		name: WizardStepsLiquidiumSupply.TOKENS_LIST,
		title: i18n.liquidium.text.select_supply_token
	}
];

export const liquidiumBorrowWizardSteps = ({
	i18n
}: WizardStepsParams): WizardSteps<WizardStepsLiquidiumBorrow> => [
	{
		name: WizardStepsLiquidiumBorrow.BORROW,
		title: i18n.liquidium.text.action_borrow
	},
	{
		name: WizardStepsLiquidiumBorrow.REVIEW,
		title: i18n.liquidium.text.borrow_review
	},
	{
		name: WizardStepsLiquidiumBorrow.BORROWING,
		title: i18n.liquidium.text.borrowing
	},
	{
		name: WizardStepsLiquidiumBorrow.TOKENS_LIST,
		title: i18n.liquidium.text.select_borrow_token
	}
];

export const liquidiumWithdrawWizardSteps = ({
	i18n
}: WizardStepsParams): WizardSteps<WizardStepsLiquidiumWithdraw> => [
	{
		name: WizardStepsLiquidiumWithdraw.WITHDRAW,
		title: i18n.liquidium.text.action_withdraw
	},
	{
		name: WizardStepsLiquidiumWithdraw.REVIEW,
		title: i18n.liquidium.text.withdraw_review
	},
	{
		name: WizardStepsLiquidiumWithdraw.WITHDRAWING,
		title: i18n.liquidium.text.withdrawing
	}
];

export const liquidiumRepayWizardSteps = ({
	i18n
}: WizardStepsParams): WizardSteps<WizardStepsLiquidiumRepay> => [
	{
		name: WizardStepsLiquidiumRepay.REPAY,
		title: i18n.liquidium.text.action_repay
	},
	{
		name: WizardStepsLiquidiumRepay.REVIEW,
		title: i18n.liquidium.text.repay_review
	},
	{
		name: WizardStepsLiquidiumRepay.REPAYING,
		title: i18n.liquidium.text.repaying
	}
];
