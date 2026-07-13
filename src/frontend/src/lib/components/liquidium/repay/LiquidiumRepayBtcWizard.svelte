<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext } from 'svelte';
	import UtxosFeeLoader from '$btc/components/fee/UtxosFeeLoader.svelte';
	import BtcUtxosFeeDisplay from '$btc/components/send/BtcUtxosFeeDisplay.svelte';
	import { sendBtc } from '$btc/services/btc-send.services';
	import {
		initUtxosFeeStore,
		UTXOS_FEE_CONTEXT_KEY,
		type UtxosFeeContext
	} from '$btc/stores/utxos-fee.store';
	import { convertSatoshisToBtc } from '$btc/utils/btc-send.utils';
	import LiquidiumRepayForm from '$lib/components/liquidium/repay/LiquidiumRepayForm.svelte';
	import LiquidiumRepayProgress from '$lib/components/liquidium/repay/LiquidiumRepayProgress.svelte';
	import LiquidiumRepayReview from '$lib/components/liquidium/repay/LiquidiumRepayReview.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { btcAddressMainnet, ethAddress } from '$lib/derived/address.derived';
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
	import { mapNetworkIdToBitcoinNetwork } from '$lib/utils/network.utils';
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

	const { sendToken, sendTokenDecimals, sendBalance } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let networkId = $derived($sendToken.network.id);
	let network = $derived(mapNetworkIdToBitcoinNetwork(networkId));

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

	// UTXO selection and the network fee must cover the gross transfer that is actually broadcast
	// (net repayment + Liquidium inflow fee), not just the net amount the user typed.
	let feeEstimationAmount = $derived(
		nonNullish(parsedAmount) && nonNullish(inflowFee)
			? convertSatoshisToBtc(parsedAmount + inflowFee)
			: amount
	);

	const { store: utxosFeeStore } = setContext<UtxosFeeContext>(UTXOS_FEE_CONTEXT_KEY, {
		store: initUtxosFeeStore()
	});

	let utxosFee = $derived($utxosFeeStore?.utxosFee);

	let validateRepayAmount = $derived.by(() => {
		const balance = $sendBalance;
		const inflow = inflowFee;
		const networkFee = utxosFee?.feeSatoshis;

		return (userAmount: bigint): Error | undefined =>
			nonNullish(inflow) &&
			nonNullish(balance) &&
			userAmount + inflow + (networkFee ?? ZERO) > balance
				? new Error($i18n.liquidium.text.insufficient_funds_for_fee)
				: undefined;
	});

	const repay = async () => {
		if (
			isNullish($authIdentity) ||
			isNullish($ethAddress) ||
			isNullish($btcAddressMainnet) ||
			isNullish(network) ||
			isNullish(utxosFee) ||
			isNullish(inflowFee)
		) {
			toastsError({ msg: { text: $i18n.send.assertion.utxos_fee_missing } });
			return;
		}

		if (isNullish(parsedAmount)) {
			toastsError({ msg: { text: $i18n.send.assertion.amount_invalid } });
			return;
		}

		// BTC sent from the BTC address, but the profile is ETH-owned → look it up by ETH address.
		const source = $btcAddressMainnet;
		const btcNetwork = network;
		const preparedUtxosFee = utxosFee;
		const amountBaseUnits = parsedAmount;

		onNext();

		try {
			await executeLiquidiumRepay({
				identity: $authIdentity,
				ethAddress: $ethAddress,
				poolId: reserve.poolId,
				asset: reserve.asset,
				amount: amountBaseUnits,
				inflowFee,
				displayAmount: `${amount}`,
				progress: (step) => (repayProgressStep = step),
				broadcast: async ({ target, amount: transferAmount }) =>
					await sendBtc({
						identity: $authIdentity,
						network: btcNetwork,
						utxosFee: preparedUtxosFee,
						destination: target.address,
						amount: convertSatoshisToBtc(transferAmount),
						source
					})
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
	<BtcUtxosFeeDisplay>
		{#snippet label()}{$i18n.liquidium.text.transaction_fee}{/snippet}
	</BtcUtxosFeeDisplay>
{/snippet}

<UtxosFeeLoader amount={feeEstimationAmount} {networkId} source={$btcAddressMainnet ?? ''}>
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
			totalFee={utxosFee?.feeSatoshis}
			bind:amount
		/>
	{/if}
</UtxosFeeLoader>
