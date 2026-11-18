import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import * as tokensDerived from '$eth/derived/tokens.derived';
import type { EthFeeStore, FeeStoreData } from '$eth/stores/eth-fee.store';
import * as feeStoreMod from '$eth/stores/eth-fee.store';
import { EthSubmissionUnconfirmedError } from '$eth/types/send';
import LiquidiumRepayEthWizard from '$lib/components/liquidium/repay/LiquidiumRepayEthWizard.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { STAKE_REVIEW_FORM_BUTTON } from '$lib/constants/test-ids.constants';
import * as addrDerived from '$lib/derived/address.derived';
import * as idDerived from '$lib/derived/auth.derived';
import { ProgressStepsLiquidiumRepay } from '$lib/enums/progress-steps';
import { WizardStepsLiquidiumRepay } from '$lib/enums/wizard-steps';
import * as liquidiumRepayServices from '$lib/services/liquidium-repay.services';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import * as toasts from '$lib/stores/toasts.store';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import type { WizardStep } from '$lib/types/wizard';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';

// No matching enabled native token in the mount tests, so the EthFeeContext (and its fee
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

	describe('when the repay fails', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.useFakeTimers();

			// The review needs the native token to mount, and a fee to repay with.
			vi.spyOn(tokensDerived, 'enabledEthereumTokens', 'get').mockReturnValue(
				readable([ETHEREUM_TOKEN])
			);
			vi.spyOn(addrDerived, 'ethAddress', 'get').mockReturnValue(readable(mockEthAddress));
			vi.spyOn(idDerived, 'authIdentity', 'get').mockImplementation(() => readable(mockIdentity));
			vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));
			vi.spyOn(toasts, 'toastsErrorNoTrace').mockImplementation(() => Symbol('toast'));

			const feeState = writable<FeeStoreData>({
				gas: 21_000n,
				maxFeePerGas: 2_000_000n,
				maxPriorityFeePerGas: 1_000_000n
			});
			const feeStore: EthFeeStore = {
				subscribe: feeState.subscribe,
				setFee: vi.fn((partial) => feeState.update((cur) => ({ ...cur, ...partial })))
			};
			vi.spyOn(feeStoreMod, 'initEthFeeStore').mockReturnValue(feeStore);
			vi.spyOn(feeStoreMod, 'initEthFeeContext').mockImplementation((ctx) => ({
				...ctx,
				maxGasFee: readable(42_000_000_000n),
				minGasFee: readable(undefined),
				estimatedGasFee: readable(undefined),
				feePrioritiesStore: writable(undefined)
			}));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const repay = async ({ err }: { err: unknown }) => {
			vi.spyOn(liquidiumRepayServices, 'executeLiquidiumRepay').mockRejectedValue(err);

			const onBack = vi.fn();
			const onClose = vi.fn();

			const { getByTestId } = render(LiquidiumRepayEthWizard, {
				props: {
					...baseProps,
					onBack,
					onClose,
					currentStep: step(WizardStepsLiquidiumRepay.REVIEW)
				},
				context: context()
			});

			await fireEvent.click(getByTestId(STAKE_REVIEW_FORM_BUTTON));
			await vi.runOnlyPendingTimersAsync();

			expect(liquidiumRepayServices.executeLiquidiumRepay).toHaveBeenCalledOnce();

			return { onBack, onClose };
		};

		// The repayment may have reached the network: repaid again from the review, it would be
		// signed with the next nonce, and both could execute.
		it('closes with the could-not-confirm toast when the outcome of the repayment is unknown', async () => {
			const err = new EthSubmissionUnconfirmedError(new Error('Internal error'));

			const { onBack, onClose } = await repay({ err });

			expect(onClose).toHaveBeenCalledOnce();
			expect(onBack).not.toHaveBeenCalled();
			expect(toasts.toastsErrorNoTrace).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.send.error.ethereum_transaction_unconfirmed },
				err
			});
			expect(toasts.toastsError).not.toHaveBeenCalledWith(
				expect.objectContaining({ msg: { text: en.liquidium.text.transaction_failed } })
			);
		});

		it('goes back to the review with its own toast after any other failure', async () => {
			const err = Object.assign(new Error('insufficient funds'), { code: 'INSUFFICIENT_FUNDS' });

			const { onBack, onClose } = await repay({ err });

			expect(onBack).toHaveBeenCalledOnce();
			expect(onClose).not.toHaveBeenCalled();
			expect(toasts.toastsError).toHaveBeenCalledWith({
				msg: { text: en.liquidium.text.transaction_failed },
				err
			});
		});
	});
});
