import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import LiquidiumSupplyIcrcWizard from '$lib/components/liquidium/supply/LiquidiumSupplyIcrcWizard.svelte';
import { STAKE_REVIEW_FORM_BUTTON } from '$lib/constants/test-ids.constants';
import * as addressesStore from '$lib/derived/address.derived';
import { ProgressStepsLiquidiumSupply } from '$lib/enums/progress-steps';
import { WizardStepsLiquidiumSupply } from '$lib/enums/wizard-steps';
import * as liquidiumSupplyServices from '$lib/services/liquidium-supply.services';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { LiquidiumMarket } from '$lib/types/liquidium';
import type { WizardStep } from '$lib/types/wizard';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('LiquidiumSupplyIcrcWizard', () => {
	const market: LiquidiumMarket = {
		poolId: 'pool-icp',
		asset: 'ICP',
		chain: 'ICP',
		supplyApy: 6,
		borrowApy: 10,
		frozen: false,
		available: true
	};

	const context = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })]]);

	const step = (name: WizardStepsLiquidiumSupply): WizardStep => ({ name, title: name });

	const baseProps = {
		market,
		amount: 1,
		supplyProgressStep: ProgressStepsLiquidiumSupply.INITIALIZATION,
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
		const { container } = render(LiquidiumSupplyIcrcWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumSupply.SUPPLY) },
			context: context()
		});

		expect(container).toHaveTextContent(en.liquidium.text.supply_apy);
	});

	it('renders the review step', () => {
		const { container } = render(LiquidiumSupplyIcrcWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumSupply.REVIEW) },
			context: context()
		});

		expect(container).toHaveTextContent(en.liquidium.text.supply_apy);
	});

	it('renders the progress step', () => {
		const { container } = render(LiquidiumSupplyIcrcWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumSupply.SUPPLYING) },
			context: context()
		});

		expect(container).toHaveTextContent(en.liquidium.text.starting_to_supply);
	});

	it('supplies the ICP pool on confirm', async () => {
		const executeSpy = vi
			.spyOn(liquidiumSupplyServices, 'executeLiquidiumSupply')
			.mockResolvedValue(undefined);

		const onNext = vi.fn();

		const { getByTestId } = render(LiquidiumSupplyIcrcWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumSupply.REVIEW), onNext },
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
