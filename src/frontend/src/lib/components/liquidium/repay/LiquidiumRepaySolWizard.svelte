<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { Chain } from '@liquidium/client';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import LiquidiumRepayForm from '$lib/components/liquidium/repay/LiquidiumRepayForm.svelte';
	import LiquidiumRepayProgress from '$lib/components/liquidium/repay/LiquidiumRepayProgress.svelte';
	import LiquidiumRepayReview from '$lib/components/liquidium/repay/LiquidiumRepayReview.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { ethAddress, solAddressMainnet } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { ProgressStepsLiquidiumRepay } from '$lib/enums/progress-steps';
	import { WizardStepsLiquidiumRepay } from '$lib/enums/wizard-steps';
	import {
		computeLiquidiumRepayPreview,
		executeLiquidiumRepay,
		liquidiumRepayCapError
	} from '$lib/services/liquidium-repay.services';
	import { sendLiquidiumSol } from '$lib/services/liquidium-sol.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError, toastsErrorNoTrace } from '$lib/stores/toasts.store';
	import { LiquidiumSolTransferRefusedError } from '$lib/types/errors';
	import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenId } from '$lib/types/token';
	import type { WizardStep } from '$lib/types/wizard';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { liquidiumSolRefusalMessage } from '$lib/utils/liquidium-sol.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import SolFeeContext from '$sol/components/fee/SolFeeContext.svelte';
	import {
		SOL_FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeContext,
		initFeeStore
	} from '$sol/stores/sol-fee.store';

	interface Props {
		reserve: LiquidiumReserve;
		portfolio: LiquidiumPortfolio;
		amount: OptionAmount;
		repayProgressStep: string;
		maxRepay?: bigint;
		maxRepayUnavailable?: boolean;
		// Net amount of this pool's repays still settling.
		pendingRepay?: bigint;
		inflowFee?: bigint;
		inflowFeeUnavailable?: boolean;
		// Least gross transfer Liquidium credits, from the per-account quote.
		minimumSendAmount?: bigint;
		currentStep?: WizardStep;
		onSelectToken?: () => void;
		onClose: () => void;
		onNext: () => void;
		onBack: () => void;
	}

	let {
		reserve,
		portfolio,
		amount = $bindable(),
		repayProgressStep = $bindable(),
		maxRepay,
		maxRepayUnavailable,
		pendingRepay = ZERO,
		inflowFee,
		inflowFeeUnavailable,
		minimumSendAmount,
		currentStep,
		onSelectToken,
		onClose,
		onNext,
		onBack
	}: Props = $props();

	const { sendToken, sendTokenDecimals, sendBalance } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let parsedAmount = $derived(
		nonNullish(amount) && !invalidAmount(amount)
			? parseToken({ value: `${amount}`, unitName: $sendTokenDecimals })
			: undefined
	);

	const feeStore = initFeeStore();
	const prioritizationFeeStore = initFeeStore();
	const ataFeeStore = initFeeStore();
	const feeSymbolStore = writable<string | undefined>(SOLANA_TOKEN.symbol);
	const feeTokenIdStore = writable<TokenId | undefined>(SOLANA_TOKEN.id);
	const feeDecimalsStore = writable<number | undefined>(SOLANA_TOKEN.decimals);
	const feeExchangeRateStore = writable<number | undefined>(undefined);

	$effect(() => {
		feeExchangeRateStore.set($exchanges?.[SOLANA_TOKEN.id]?.usd);
	});

	setContext<FeeContextType>(
		SOL_FEE_CONTEXT_KEY,
		initFeeContext({
			feeStore,
			prioritizationFeeStore,
			ataFeeStore,
			feeSymbolStore,
			feeDecimalsStore,
			feeTokenIdStore,
			feeExchangeRateStore
		})
	);

	// Pairwise USD from the position itself (no asset-price dependency): the repaid share of the
	// position's debt, including repays still settling.
	let repayUsd = $derived(
		reserve.borrowed > ZERO
			? (Number((parsedAmount ?? ZERO) + pendingRepay) / Number(reserve.borrowed)) *
					reserve.borrowedUsd
			: 0
	);

	let preview = $derived(computeLiquidiumRepayPreview({ portfolio, repayUsd }));

	// The quote's minimum is a gross transfer; the typed amount is net of the provider fee.
	let minimumRepay = $derived(
		nonNullish(minimumSendAmount) && nonNullish(inflowFee)
			? minimumSendAmount - inflowFee
			: undefined
	);

	let validateRepayAmount = $derived.by(() => {
		const balance = $sendBalance;
		const inflow = inflowFee;
		const networkFee = $feeStore;
		const minimum = minimumRepay;

		return (userAmount: bigint): Error | undefined => {
			// Less than Liquidium credits would wait at the deposit address, and a debt smaller than that
			// can't be repaid exactly on this rail: ckSOL's minimum is negligible.
			if (nonNullish(minimum) && userAmount < minimum) {
				return new Error(
					replacePlaceholders($i18n.liquidium.text.repay_below_native_minimum, {
						$amount: `${formatToken({
							value: minimum,
							unitName: SOLANA_TOKEN.decimals,
							displayDecimals: SOLANA_TOKEN.decimals
						})} ${SOLANA_TOKEN.symbol}`
					})
				);
			}

			// The transfer (amount + provider fee) and its network fee both leave the SOL balance.
			return nonNullish(inflow) &&
				nonNullish(balance) &&
				userAmount + inflow + (networkFee ?? ZERO) > balance
				? new Error($i18n.liquidium.text.insufficient_funds_for_fee)
				: undefined;
		};
	});

	const repay = async () => {
		if (isNullish($authIdentity) || isNullish($ethAddress) || isNullish($solAddressMainnet)) {
			toastsError({ msg: { text: $i18n.send.assertion.address_unknown } });
			return;
		}

		if (isNullish(inflowFee) || isNullish($feeStore)) {
			toastsError({ msg: { text: $i18n.send.assertion.gas_fees_not_defined } });
			return;
		}

		if (isNullish(parsedAmount)) {
			toastsError({ msg: { text: $i18n.send.assertion.amount_invalid } });
			return;
		}

		// Review can outlive the cap (a repay that settles refetches it; a new pending one lowers it),
		// so it is re-checked at the point of broadcast rather than trusted from the form.
		const capError = liquidiumRepayCapError({
			amount: parsedAmount,
			maxRepay,
			pendingRepay,
			reserve,
			i18n: $i18n
		});

		if (nonNullish(capError)) {
			toastsError({ msg: { text: capError.message } });
			return;
		}

		const identity = $authIdentity;
		const source = $solAddressMainnet;
		const prioritizationFee = $prioritizationFeeStore ?? ZERO;

		// Set once the transfer is handed to Solana: a failure before that sent nothing.
		let broadcastStarted = false;

		onNext();

		try {
			await executeLiquidiumRepay({
				identity,
				ethAddress: $ethAddress,
				poolId: reserve.poolId,
				chain: Chain.SOL,
				asset: reserve.asset,
				amount: parsedAmount,
				inflowFee,
				displayAmount: `${amount}`,
				progress: (step) => (repayProgressStep = step),
				broadcast: async ({ target, amount: transferAmount, beforeBroadcast }) => {
					broadcastStarted = true;

					return await sendLiquidiumSol({
						identity,
						source,
						destination: target.address,
						amount: transferAmount,
						prioritizationFee,
						beforeBroadcast
					});
				}
			});

			repayProgressStep = ProgressStepsLiquidiumRepay.DONE;

			setTimeout(onClose, 750);
		} catch (err: unknown) {
			// The SOL may have left, and its row keeps counting against the repay max until it settles.
			// The form would offer the debt again, so the flow closes instead.
			if (broadcastStarted && !(err instanceof LiquidiumSolTransferRefusedError)) {
				toastsErrorNoTrace({ msg: { text: $i18n.send.error.solana_confirmation_failed }, err });

				onClose();

				return;
			}

			// A transfer that was never sent shows only a translated message: the refusal and what it
			// wraps go to the console.
			if (err instanceof LiquidiumSolTransferRefusedError) {
				toastsErrorNoTrace({
					msg: { text: liquidiumSolRefusalMessage({ cause: err.cause, i18n: $i18n }) },
					err
				});

				onBack();

				return;
			}

			toastsError({ msg: { text: $i18n.liquidium.text.transaction_failed }, err });

			onBack();
		}
	};
</script>

{#snippet feeDisplay()}
	{#if nonNullish($feeStore)}
		<FeeDisplay
			decimals={SOLANA_TOKEN.decimals}
			exchangeRate={$feeExchangeRateStore}
			feeAmount={$feeStore}
			symbol={SOLANA_TOKEN.symbol}
		>
			{#snippet label()}{$i18n.liquidium.text.transaction_fee}{/snippet}
		</FeeDisplay>
	{/if}
{/snippet}

<SolFeeContext
	observe={currentStep?.name !== WizardStepsLiquidiumRepay.REPAYING}
	token={$sendToken}
>
	{#if currentStep?.name === WizardStepsLiquidiumRepay.REVIEW}
		<LiquidiumRepayReview
			{amount}
			{feeDisplay}
			{inflowFee}
			{maxRepay}
			{maxRepayUnavailable}
			{onBack}
			onConfirm={repay}
			{pendingRepay}
			{preview}
			{reserve}
		/>
	{:else if currentStep?.name === WizardStepsLiquidiumRepay.REPAYING}
		<LiquidiumRepayProgress {repayProgressStep} />
	{:else}
		<LiquidiumRepayForm
			{feeDisplay}
			{inflowFee}
			{inflowFeeUnavailable}
			{maxRepay}
			{maxRepayUnavailable}
			{onClose}
			onCustomErrorValidate={validateRepayAmount}
			{onNext}
			{onSelectToken}
			{pendingRepay}
			{preview}
			{reserve}
			totalFee={$feeStore}
			bind:amount
		/>
	{/if}
</SolFeeContext>
