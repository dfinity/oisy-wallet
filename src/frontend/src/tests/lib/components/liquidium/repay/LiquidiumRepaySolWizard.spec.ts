import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import LiquidiumRepaySolWizard from '$lib/components/liquidium/repay/LiquidiumRepaySolWizard.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { STAKE_REVIEW_FORM_BUTTON } from '$lib/constants/test-ids.constants';
import * as addressesStore from '$lib/derived/address.derived';
import { ProgressStepsLiquidiumRepay } from '$lib/enums/progress-steps';
import { WizardStepsLiquidiumRepay } from '$lib/enums/wizard-steps';
import * as liquidiumRepayServices from '$lib/services/liquidium-repay.services';
import * as liquidiumSolServices from '$lib/services/liquidium-sol.services';
import { balancesStore } from '$lib/stores/balances.store';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { LiquidiumSolTransferRefusedError } from '$lib/types/errors';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import type { WizardStep } from '$lib/types/wizard';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
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

describe('LiquidiumRepaySolWizard', () => {
	const reserve: LiquidiumReserve = {
		poolId: 'pool-sol',
		asset: 'SOL',
		chain: 'SOL',
		supplyApy: 0,
		borrowApy: 8,
		deposited: ZERO,
		depositedDecimals: 9,
		borrowed: 1_000_000_000n,
		borrowedDecimals: 9,
		debtInterest: ZERO,
		suppliedUsd: 0,
		borrowedUsd: 150
	};

	const portfolio: LiquidiumPortfolio = {
		reserves: [reserve],
		totalSuppliedUsd: 1_000,
		totalBorrowedUsd: 150,
		netValueUsd: 850,
		availableBorrowsUsd: 500,
		weightedLiquidationThresholdBps: 8_000,
		healthFactorPercent: 80
	};

	const target: SupplyTarget = {
		poolId: 'pool-sol',
		asset: 'SOL',
		chain: 'SOL',
		action: 'repayment',
		address: 'GXVewvv6HehcLFYCmwpqh5CrMjqN9zJ8rqzGq3HEt9Ax'
	};

	const context = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: SOLANA_TOKEN })]]);

	const step = (name: WizardStepsLiquidiumRepay): WizardStep => ({ name, title: name });

	// Liquidium's quote today: a 0.02 SOL minimum send and a 1,884,122-lamport provider fee, so
	// 0.018115878 SOL to type at least.
	const baseProps = {
		reserve,
		portfolio,
		amount: 0.5,
		repayProgressStep: ProgressStepsLiquidiumRepay.INITIALIZATION,
		maxRepay: 1_001_000_000n,
		inflowFee: 1_884_122n,
		minimumSendAmount: 20_000_000n,
		onClose: () => {},
		onNext: () => {},
		onBack: () => {}
	};

	const belowMinimumMessage = replacePlaceholders(en.liquidium.text.repay_below_native_minimum, {
		$amount: '0.018115878 SOL'
	});

	const renderForm = (props: Partial<typeof baseProps> = {}) =>
		render(LiquidiumRepaySolWizard, {
			props: { ...baseProps, ...props, currentStep: step(WizardStepsLiquidiumRepay.REPAY) },
			context: context()
		});

	// Review, once the network fee is known: Confirm needs it.
	const renderReview = async (props: Partial<typeof baseProps> = {}) => {
		const rendered = render(LiquidiumRepaySolWizard, {
			props: { ...baseProps, ...props, currentStep: step(WizardStepsLiquidiumRepay.REVIEW) },
			context: context()
		});

		await waitFor(() =>
			expect(rendered.container).toHaveTextContent(en.liquidium.text.transaction_fee)
		);

		return rendered;
	};

	const executeSpy = () => vi.spyOn(liquidiumRepayServices, 'executeLiquidiumRepay');

	// The service hands the broadcast the flow's target, as `executeLiquidiumRepay` does.
	const broadcastThroughService = (spy: ReturnType<typeof executeSpy>) =>
		spy.mockImplementation(async ({ broadcast }) => {
			await broadcast({ target, amount: 501_884_122n, beforeBroadcast: vi.fn() });
		});

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

	afterEach(() => {
		balancesStore.reset(SOLANA_TOKEN.id);
	});

	describe('a repay below what Liquidium credits', () => {
		it('is blocked, pointing to ckSOL', async () => {
			const { container } = renderForm({ amount: 0.01 });

			await waitFor(() => expect(container).toHaveTextContent(belowMinimumMessage));
		});

		it('is not flagged at the minimum', async () => {
			const { container } = renderForm({ amount: 0.018115878 });

			await waitFor(() => expect(container).toHaveTextContent(en.liquidium.text.transaction_fee));

			expect(container).not.toHaveTextContent(belowMinimumMessage);
		});

		it('is not flagged before the quote', async () => {
			const { container } = renderForm({
				amount: 0.01,
				inflowFee: undefined,
				minimumSendAmount: undefined
			});

			await waitFor(() => expect(container).toHaveTextContent(en.liquidium.text.transaction_fee));

			expect(container).not.toHaveTextContent(belowMinimumMessage);
		});
	});

	it('rejects an amount the balance covers on its own but not with both fees', async () => {
		balancesStore.set({
			id: SOLANA_TOKEN.id,
			data: { data: 500_000_000n + 1_884_122n, certified: false }
		});

		const { container } = renderForm();

		await waitFor(() =>
			expect(container).toHaveTextContent(en.liquidium.text.insufficient_funds_for_fee)
		);
	});

	it('repays the SOL pool on the SOL chain on confirm', async () => {
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
					amount: 500_000_000n,
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
					amount: 501_884_122n,
					prioritizationFee: 1_000_000n
				})
			)
		);
	});

	it('goes back to the review when the transfer was never sent, with a translated message only', async () => {
		const refused = new LiquidiumSolTransferRefusedError({ cause: new Error('preflight failure') });
		broadcastThroughService(executeSpy());
		vi.spyOn(liquidiumSolServices, 'sendLiquidiumSol').mockRejectedValue(refused);
		const toastsErrorNoTrace = vi.spyOn(toastsStore, 'toastsErrorNoTrace');
		const onBack = vi.fn();
		const onClose = vi.fn();

		const { getByTestId } = await renderReview({ onBack, onClose });

		await fireEvent.click(getByTestId(STAKE_REVIEW_FORM_BUTTON));

		await waitFor(() => expect(onBack).toHaveBeenCalledOnce());

		expect(onClose).not.toHaveBeenCalled();
		expect(toastsErrorNoTrace).toHaveBeenCalledExactlyOnceWith({
			msg: { text: en.liquidium.text.transaction_failed },
			err: refused
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
});
