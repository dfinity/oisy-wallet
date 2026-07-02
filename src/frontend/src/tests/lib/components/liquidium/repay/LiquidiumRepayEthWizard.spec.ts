import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import LiquidiumRepayEthWizard from '$lib/components/liquidium/repay/LiquidiumRepayEthWizard.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsLiquidiumRepay } from '$lib/enums/progress-steps';
import { WizardStepsLiquidiumRepay } from '$lib/enums/wizard-steps';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import type { WizardStep } from '@dfinity/gix-components';
import { render } from '@testing-library/svelte';

// No matching enabled native token in the test, so the EthFeeContext (and its fee
// estimation) never mounts — rendering exercises the wizard's setup/deriveds only,
// without triggering network calls.
describe('LiquidiumRepayEthWizard', () => {
	const reserve: LiquidiumReserve = {
		poolId: 'pool-eth',
		asset: 'ETH',
		chain: 'ETH',
		supplyApy: 0,
		borrowApy: 7,
		deposited: ZERO,
		depositedDecimals: 18,
		borrowed: 1_000_000_000_000_000_000n,
		borrowedDecimals: 18,
		debtInterest: ZERO,
		suppliedUsd: 0,
		borrowedUsd: 3_000
	};

	const portfolio: LiquidiumPortfolio = {
		reserves: [reserve],
		totalSuppliedUsd: 12_000,
		totalBorrowedUsd: 3_000,
		netValueUsd: 9_000,
		availableBorrowsUsd: 6_000,
		weightedLiquidationThresholdBps: 8_000,
		healthFactorPercent: 75
	};

	const context = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: ETHEREUM_TOKEN })]]);

	const step = (name: WizardStepsLiquidiumRepay): WizardStep => ({ name, title: name });

	const baseProps = {
		reserve,
		portfolio,
		amount: 0.5,
		repayProgressStep: ProgressStepsLiquidiumRepay.INITIALIZATION,
		maxRepay: 1_000_000_000_000_000_000n,
		inflowFee: 50n,
		onClose: () => {},
		onNext: () => {},
		onBack: () => {}
	};

	it('mounts the form step without triggering fee estimation', () => {
		const { container } = render(LiquidiumRepayEthWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumRepay.REPAY) },
			context: context()
		});

		expect(container).toBeTruthy();
	});

	it('mounts the progress step', () => {
		const { container } = render(LiquidiumRepayEthWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumRepay.REPAYING) },
			context: context()
		});

		expect(container).toBeTruthy();
	});
});
