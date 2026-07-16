<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { Chain } from '@liquidium/client';
	import { getContext } from 'svelte';
	import { sendIcp } from '$icp/services/ic-send.services';
	import { getTokenFee } from '$icp/utils/token.utils';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import LiquidiumRepayForm from '$lib/components/liquidium/repay/LiquidiumRepayForm.svelte';
	import LiquidiumRepayProgress from '$lib/components/liquidium/repay/LiquidiumRepayProgress.svelte';
	import LiquidiumRepayReview from '$lib/components/liquidium/repay/LiquidiumRepayReview.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { LIQUIDIUM_ASSET_LEDGER_CANISTER_IDS } from '$lib/constants/liquidium.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsLiquidiumRepay } from '$lib/enums/progress-steps';
	import { WizardStepsLiquidiumRepay } from '$lib/enums/wizard-steps';
	import {
		computeLiquidiumRepayPreview,
		executeLiquidiumRepay
	} from '$lib/services/liquidium-repay.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep } from '$lib/types/wizard';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		reserve: LiquidiumReserve;
		portfolio: LiquidiumPortfolio;
		amount: OptionAmount;
		repayProgressStep: string;
		maxRepay?: bigint;
		inflowFee?: bigint;
		inflowFeeUnavailable?: boolean;
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
		inflowFee,
		inflowFeeUnavailable,
		currentStep,
		onSelectToken,
		onClose,
		onNext,
		onBack
	}: Props = $props();

	const { sendToken, sendTokenDecimals, sendTokenSymbol, sendTokenExchangeRate, sendBalance } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	// Flat ICRC/ICP ledger fee, deducted by the ledger on top of the transfer (no gas/UTXO).
	let ledgerFee = $derived(getTokenFee($sendToken));

	let parsedAmount = $derived(
		nonNullish(amount) && !invalidAmount(amount)
			? parseToken({ value: `${amount}`, unitName: $sendTokenDecimals })
			: undefined
	);

	// Pairwise USD from the position itself (no asset-price dependency): the repaid share of the
	// position's debt. Repaying improves the (aggregate) projected health factor.
	let repayUsd = $derived(
		reserve.borrowed > ZERO && nonNullish(parsedAmount)
			? (Number(parsedAmount) / Number(reserve.borrowed)) * reserve.borrowedUsd
			: 0
	);

	let preview = $derived(computeLiquidiumRepayPreview({ portfolio, repayUsd }));

	let validateRepayAmount = $derived.by(() => {
		const balance = $sendBalance;
		const inflow = inflowFee;
		const fee = ledgerFee ?? ZERO;

		return (userAmount: bigint): Error | undefined =>
			nonNullish(inflow) && nonNullish(balance) && userAmount + inflow + fee > balance
				? new Error($i18n.liquidium.text.insufficient_funds_for_fee)
				: undefined;
	});

	const repay = async () => {
		if (isNullish($authIdentity) || isNullish($ethAddress) || isNullish(inflowFee)) {
			toastsError({ msg: { text: $i18n.liquidium.text.transaction_failed } });
			return;
		}

		if (isNullish(parsedAmount)) {
			toastsError({ msg: { text: $i18n.send.assertion.amount_invalid } });
			return;
		}

		// The ICP pool settles on the ICP ledger (ICP-chain transfer).
		const ledgerCanisterId = LIQUIDIUM_ASSET_LEDGER_CANISTER_IDS[reserve.asset];

		if (isNullish(ledgerCanisterId)) {
			toastsError({ msg: { text: $i18n.liquidium.text.transaction_failed } });
			return;
		}

		const amountBaseUnits = parsedAmount;
		const identity = $authIdentity;

		onNext();

		try {
			await executeLiquidiumRepay({
				identity,
				ethAddress: $ethAddress,
				poolId: reserve.poolId,
				chain: Chain.ICP,
				asset: reserve.asset,
				amount: amountBaseUnits,
				inflowFee,
				displayAmount: `${amount}`,
				progress: (step) => (repayProgressStep = step),
				broadcast: async ({ target, amount: transferAmount }) => {
					const blockIndex = await sendIcp({
						identity,
						ledgerCanisterId,
						to: target.address,
						amount: transferAmount
					});

					return `${blockIndex}`;
				}
			});

			repayProgressStep = ProgressStepsLiquidiumRepay.DONE;

			setTimeout(onClose, 750);
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.liquidium.text.transaction_failed }, err });

			onBack();
		}
	};
</script>

{#snippet feeDisplay()}
	<FeeDisplay
		decimals={$sendTokenDecimals}
		exchangeRate={$sendTokenExchangeRate}
		feeAmount={ledgerFee}
		symbol={$sendTokenSymbol}
	>
		{#snippet label()}{$i18n.liquidium.text.transaction_fee}{/snippet}
	</FeeDisplay>
{/snippet}

{#if currentStep?.name === WizardStepsLiquidiumRepay.REVIEW}
	<LiquidiumRepayReview
		{amount}
		{feeDisplay}
		{inflowFee}
		{onBack}
		onConfirm={repay}
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
		{onClose}
		onCustomErrorValidate={validateRepayAmount}
		{onNext}
		{onSelectToken}
		{preview}
		{reserve}
		totalFee={ledgerFee}
		bind:amount
	/>
{/if}
