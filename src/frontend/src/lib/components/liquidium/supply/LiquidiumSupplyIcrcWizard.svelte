<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { Chain } from '@liquidium/client';
	import { getContext } from 'svelte';
	import { sendIcp } from '$icp/services/ic-send.services';
	import { getTokenFee } from '$icp/utils/token.utils';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import LiquidiumSupplyForm from '$lib/components/liquidium/supply/LiquidiumSupplyForm.svelte';
	import LiquidiumSupplyProgress from '$lib/components/liquidium/supply/LiquidiumSupplyProgress.svelte';
	import LiquidiumSupplyReview from '$lib/components/liquidium/supply/LiquidiumSupplyReview.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { LIQUIDIUM_ASSET_LEDGER_CANISTER_IDS } from '$lib/constants/liquidium.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsLiquidiumSupply } from '$lib/enums/progress-steps';
	import { WizardStepsLiquidiumSupply } from '$lib/enums/wizard-steps';
	import { executeLiquidiumSupply } from '$lib/services/liquidium-supply.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { LiquidiumMarket } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep } from '$lib/types/wizard';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		market: LiquidiumMarket;
		amount: OptionAmount;
		supplyProgressStep: string;
		inflowFee?: bigint;
		inflowFeeUnavailable?: boolean;
		currentStep?: WizardStep;
		onSelectToken?: () => void;
		onClose: () => void;
		onNext: () => void;
		onBack: () => void;
	}

	let {
		market,
		amount = $bindable(),
		supplyProgressStep = $bindable(),
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

	let validateSupplyAmount = $derived.by(() => {
		const balance = $sendBalance;
		const inflow = inflowFee;
		const fee = ledgerFee ?? ZERO;

		return (userAmount: bigint): Error | undefined =>
			nonNullish(inflow) && nonNullish(balance) && userAmount + inflow + fee > balance
				? new Error($i18n.liquidium.text.insufficient_funds_for_fee)
				: undefined;
	});

	const supply = async () => {
		if (isNullish($authIdentity) || isNullish($ethAddress) || isNullish(inflowFee)) {
			toastsError({ msg: { text: $i18n.liquidium.text.transaction_failed } });
			return;
		}

		if (isNullish(parsedAmount)) {
			toastsError({ msg: { text: $i18n.send.assertion.amount_invalid } });
			return;
		}

		// The ICP pool settles on the ICP ledger (ICP-chain transfer).
		const ledgerCanisterId = LIQUIDIUM_ASSET_LEDGER_CANISTER_IDS[market.asset];

		if (isNullish(ledgerCanisterId)) {
			toastsError({ msg: { text: $i18n.liquidium.text.transaction_failed } });
			return;
		}

		const amountBaseUnits = parsedAmount;
		const identity = $authIdentity;

		onNext();

		try {
			await executeLiquidiumSupply({
				identity,
				ethAddress: $ethAddress,
				poolId: market.poolId,
				chain: Chain.ICP,
				asset: market.asset,
				amount: amountBaseUnits,
				inflowFee,
				displayAmount: `${amount}`,
				progress: (step) => (supplyProgressStep = step),
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

			supplyProgressStep = ProgressStepsLiquidiumSupply.DONE;

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

{#if currentStep?.name === WizardStepsLiquidiumSupply.REVIEW}
	<LiquidiumSupplyReview {amount} {feeDisplay} {inflowFee} {market} {onBack} onConfirm={supply} />
{:else if currentStep?.name === WizardStepsLiquidiumSupply.SUPPLYING}
	<LiquidiumSupplyProgress {supplyProgressStep} />
{:else}
	<LiquidiumSupplyForm
		{feeDisplay}
		{inflowFee}
		{inflowFeeUnavailable}
		{market}
		{onClose}
		onCustomErrorValidate={validateSupplyAmount}
		{onNext}
		{onSelectToken}
		totalFee={ledgerFee}
		bind:amount
	/>
{/if}
