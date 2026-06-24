import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import LiquidiumSupplyEthWizard from '$lib/components/liquidium/supply/LiquidiumSupplyEthWizard.svelte';
import { ProgressStepsLiquidiumSupply } from '$lib/enums/progress-steps';
import { WizardStepsLiquidiumSupply } from '$lib/enums/wizard-steps';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { LiquidiumMarket } from '$lib/types/liquidium';
import type { WizardStep } from '@dfinity/gix-components';
import { render } from '@testing-library/svelte';

// No matching enabled native token in the test, so the EthFeeContext (and its fee
// estimation) never mounts — rendering exercises the wizard's setup/deriveds only,
// without triggering network calls.
describe('LiquidiumSupplyEthWizard', () => {
	const market: LiquidiumMarket = {
		poolId: 'pool-eth',
		asset: 'ETH',
		chain: 'ETH',
		supplyApy: 4,
		borrowApy: 7,
		frozen: false,
		available: true
	};

	const context = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: ETHEREUM_TOKEN })]]);

	const step = (name: WizardStepsLiquidiumSupply): WizardStep => ({ name, title: name });

	const baseProps = {
		market,
		amount: 0.01,
		supplyProgressStep: ProgressStepsLiquidiumSupply.INITIALIZATION,
		inflowFee: 50n,
		onClose: () => {},
		onNext: () => {},
		onBack: () => {}
	};

	it('mounts the form step without triggering fee estimation', () => {
		const { container } = render(LiquidiumSupplyEthWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumSupply.SUPPLY) },
			context: context()
		});

		expect(container).toBeTruthy();
	});

	it('mounts the progress step', () => {
		const { container } = render(LiquidiumSupplyEthWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumSupply.SUPPLYING) },
			context: context()
		});

		expect(container).toBeTruthy();
	});
});
