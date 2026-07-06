import {
	lendBorrowProvidersConfig,
	liquidiumSupplyWizardSteps
} from '$lib/config/lend-borrow.config';
import { WizardStepsLiquidiumSupply } from '$lib/enums/wizard-steps';
import { LendBorrowProvider } from '$lib/types/lend-borrow';
import en from '$tests/mocks/i18n.mock';

describe('lend-borrow.config', () => {
	describe('liquidiumSupplyWizardSteps', () => {
		it('returns the supply wizard steps with expected names and titles', () => {
			expect(liquidiumSupplyWizardSteps({ i18n: en })).toStrictEqual([
				{ name: WizardStepsLiquidiumSupply.SUPPLY, title: en.liquidium.text.action_supply },
				{ name: WizardStepsLiquidiumSupply.REVIEW, title: en.liquidium.text.supply_review },
				{ name: WizardStepsLiquidiumSupply.SUPPLYING, title: en.liquidium.text.supplying }
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
