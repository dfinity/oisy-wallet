import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import LiquidiumRepayIcrcWizard from '$lib/components/liquidium/repay/LiquidiumRepayIcrcWizard.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { STAKE_REVIEW_FORM_BUTTON } from '$lib/constants/test-ids.constants';
import * as addressesStore from '$lib/derived/address.derived';
import { ProgressStepsLiquidiumRepay } from '$lib/enums/progress-steps';
import { WizardStepsLiquidiumRepay } from '$lib/enums/wizard-steps';
import * as liquidiumRepayServices from '$lib/services/liquidium-repay.services';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import type { WizardStep } from '$lib/types/wizard';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('LiquidiumRepayIcrcWizard', () => {
	const reserve: LiquidiumReserve = {
		poolId: 'pool-icp',
		asset: 'ICP',
		chain: 'ICP',
		supplyApy: 0,
		borrowApy: 10,
		deposited: ZERO,
		depositedDecimals: 8,
		borrowed: 100_000_000n,
		borrowedDecimals: 8,
		debtInterest: ZERO,
		suppliedUsd: 0,
		borrowedUsd: 12
	};

	const portfolio: LiquidiumPortfolio = {
		reserves: [reserve],
		totalSuppliedUsd: 100,
		totalBorrowedUsd: 12,
		netValueUsd: 88,
		availableBorrowsUsd: 50,
		weightedLiquidationThresholdBps: 8_000,
		healthFactorPercent: 80
	};

	const context = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })]]);

	const step = (name: WizardStepsLiquidiumRepay): WizardStep => ({ name, title: name });

	const baseProps = {
		reserve,
		portfolio,
		amount: 1,
		repayProgressStep: ProgressStepsLiquidiumRepay.INITIALIZATION,
		maxRepay: 100_000_000n,
		inflowFee: 50n,
		onClose: () => {},
		onNext: () => {},
		onBack: () => {}
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();
		vi.spyOn(addressesStore, 'ethAddress', 'get').mockImplementation(() =>
			readable(mockEthAddress)
		);
	});

	it('renders the form step', () => {
		const { container } = render(LiquidiumRepayIcrcWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumRepay.REPAY) },
			context: context()
		});

		expect(container).toBeTruthy();
	});

	it('renders the progress step', () => {
		const { container } = render(LiquidiumRepayIcrcWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumRepay.REPAYING) },
			context: context()
		});

		expect(container).toHaveTextContent(en.liquidium.text.starting_to_repay);
	});

	it('repays the ICP pool on confirm', async () => {
		const executeSpy = vi
			.spyOn(liquidiumRepayServices, 'executeLiquidiumRepay')
			.mockResolvedValue(undefined);

		const onNext = vi.fn();

		const { getByTestId } = render(LiquidiumRepayIcrcWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumRepay.REVIEW), onNext },
			context: context()
		});

		await fireEvent.click(getByTestId(STAKE_REVIEW_FORM_BUTTON));

		await waitFor(() => {
			expect(onNext).toHaveBeenCalledOnce();
			expect(executeSpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ chain: 'ICP', asset: 'ICP', poolId: 'pool-icp', inflowFee: 50n })
			);
		});
	});
});
