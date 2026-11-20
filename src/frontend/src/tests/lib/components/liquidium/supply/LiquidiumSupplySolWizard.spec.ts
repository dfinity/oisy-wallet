import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import LiquidiumSupplySolWizard from '$lib/components/liquidium/supply/LiquidiumSupplySolWizard.svelte';
import { STAKE_REVIEW_FORM_BUTTON } from '$lib/constants/test-ids.constants';
import * as addressesStore from '$lib/derived/address.derived';
import { ProgressStepsLiquidiumSupply } from '$lib/enums/progress-steps';
import { WizardStepsLiquidiumSupply } from '$lib/enums/wizard-steps';
import * as liquidiumSolServices from '$lib/services/liquidium-sol.services';
import * as liquidiumSupplyServices from '$lib/services/liquidium-supply.services';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { LiquidiumSolTransferRefusedError } from '$lib/types/errors';
import type { LiquidiumMarket } from '$lib/types/liquidium';
import type { WizardStep } from '$lib/types/wizard';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import type { SupplyTarget } from '@liquidium/client';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

vi.mock('$sol/api/solana.api', () => ({
	estimatePriorityFee: vi.fn().mockResolvedValue(1_000_000n)
}));

describe('LiquidiumSupplySolWizard', () => {
	const market: LiquidiumMarket = {
		poolId: 'pool-sol',
		asset: 'SOL',
		chain: 'SOL',
		supplyApy: 4,
		borrowApy: 8,
		frozen: false,
		available: true
	};

	const target: SupplyTarget = {
		poolId: 'pool-sol',
		asset: 'SOL',
		chain: 'SOL',
		action: 'deposit',
		address: 'GXVewvv6HehcLFYCmwpqh5CrMjqN9zJ8rqzGq3HEt9Ax'
	};

	const context = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: SOLANA_TOKEN })]]);

	const step = (name: WizardStepsLiquidiumSupply): WizardStep => ({ name, title: name });

	const baseProps = {
		market,
		amount: 0.03,
		supplyProgressStep: ProgressStepsLiquidiumSupply.INITIALIZATION,
		inflowFee: 1_884_122n,
		minimumSendAmount: 20_000_000n,
		onClose: () => {},
		onNext: () => {},
		onBack: () => {}
	};

	const executeSpy = () => vi.spyOn(liquidiumSupplyServices, 'executeLiquidiumSupply');

	// The service hands the broadcast the flow's target, as `executeLiquidiumSupply` does.
	const broadcastThroughService = (spy: ReturnType<typeof executeSpy>) =>
		spy.mockImplementation(async ({ broadcast }) => {
			await broadcast({ target, amount: 31_884_122n, beforeBroadcast: vi.fn() });
		});

	// Review, once the network fee is known: Confirm needs it.
	const renderReview = async (props: Partial<typeof baseProps> = {}) => {
		const rendered = render(LiquidiumSupplySolWizard, {
			props: { ...baseProps, ...props, currentStep: step(WizardStepsLiquidiumSupply.REVIEW) },
			context: context()
		});

		await waitFor(() =>
			expect(rendered.container).toHaveTextContent(en.liquidium.text.transaction_fee)
		);

		return rendered;
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();
		vi.spyOn(addressesStore, 'ethAddress', 'get').mockImplementation(() =>
			readable(mockEthAddress)
		);
		vi.spyOn(addressesStore, 'solAddressMainnet', 'get').mockImplementation(() =>
			readable(mockSolAddress)
		);
	});

	it('renders the form with the minimum net of the provider fee', () => {
		const { container } = render(LiquidiumSupplySolWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumSupply.SUPPLY) },
			context: context()
		});

		expect(container).toHaveTextContent(en.liquidium.text.supply_apy);
		expect(container).toHaveTextContent(en.liquidium.text.minimum_supply);
	});

	it('renders the progress step', () => {
		const { container } = render(LiquidiumSupplySolWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumSupply.SUPPLYING) },
			context: context()
		});

		expect(container).toHaveTextContent(en.liquidium.text.starting_to_supply);
	});

	it('supplies the SOL pool on the SOL chain on confirm', async () => {
		const spy = executeSpy().mockResolvedValue(undefined);
		const onNext = vi.fn();

		const { getByTestId } = await renderReview({ onNext });

		await fireEvent.click(getByTestId(STAKE_REVIEW_FORM_BUTTON));

		await waitFor(() => {
			expect(onNext).toHaveBeenCalledOnce();
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					chain: 'SOL',
					asset: 'SOL',
					poolId: 'pool-sol',
					amount: 30_000_000n,
					inflowFee: 1_884_122n
				})
			);
		});
	});

	it('sends the transfer from the mainnet SOL address to the target', async () => {
		broadcastThroughService(executeSpy());
		const sendSpy = vi
			.spyOn(liquidiumSolServices, 'sendLiquidiumSol')
			.mockResolvedValue('sol-signature');

		const { getByTestId } = await renderReview();

		await fireEvent.click(getByTestId(STAKE_REVIEW_FORM_BUTTON));

		await waitFor(() =>
			expect(sendSpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					identity: mockIdentity,
					source: mockSolAddress,
					destination: target.address,
					amount: 31_884_122n,
					prioritizationFee: 1_000_000n
				})
			)
		);
	});

	it('goes back to the review when the transfer was never sent, showing what refused it', async () => {
		const cause = new Error('preflight failure');
		broadcastThroughService(executeSpy());
		vi.spyOn(liquidiumSolServices, 'sendLiquidiumSol').mockRejectedValue(
			new LiquidiumSolTransferRefusedError({ cause })
		);
		const toastsError = vi.spyOn(toastsStore, 'toastsError');
		const onBack = vi.fn();
		const onClose = vi.fn();

		const { getByTestId } = await renderReview({ onBack, onClose });

		await fireEvent.click(getByTestId(STAKE_REVIEW_FORM_BUTTON));

		await waitFor(() => expect(onBack).toHaveBeenCalledOnce());

		expect(onClose).not.toHaveBeenCalled();
		expect(toastsError).toHaveBeenCalledExactlyOnceWith({
			msg: { text: en.liquidium.text.transaction_failed },
			err: cause
		});
	});

	it('closes with the unconfirmed message when the SOL may have left', async () => {
		broadcastThroughService(executeSpy());
		vi.spyOn(liquidiumSolServices, 'sendLiquidiumSol').mockRejectedValue(
			new Error('confirmation timed out')
		);
		const toastsErrorNoTrace = vi.spyOn(toastsStore, 'toastsErrorNoTrace');
		const onBack = vi.fn();
		const onClose = vi.fn();

		const { getByTestId } = await renderReview({ onBack, onClose });

		await fireEvent.click(getByTestId(STAKE_REVIEW_FORM_BUTTON));

		await waitFor(() => expect(onClose).toHaveBeenCalledOnce());

		expect(onBack).not.toHaveBeenCalled();
		expect(toastsErrorNoTrace).toHaveBeenCalledWith(
			expect.objectContaining({ msg: { text: en.send.error.solana_confirmation_failed } })
		);
	});

	it('goes back to the review on a failure before the transfer', async () => {
		executeSpy().mockRejectedValue(new Error('profile unavailable'));
		const onBack = vi.fn();
		const onClose = vi.fn();

		const { getByTestId } = await renderReview({ onBack, onClose });

		await fireEvent.click(getByTestId(STAKE_REVIEW_FORM_BUTTON));

		await waitFor(() => expect(onBack).toHaveBeenCalledOnce());

		expect(onClose).not.toHaveBeenCalled();
	});
});
