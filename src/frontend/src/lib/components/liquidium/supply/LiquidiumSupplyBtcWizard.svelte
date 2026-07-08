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
	import LiquidiumSupplyForm from '$lib/components/liquidium/supply/LiquidiumSupplyForm.svelte';
	import LiquidiumSupplyProgress from '$lib/components/liquidium/supply/LiquidiumSupplyProgress.svelte';
	import LiquidiumSupplyReview from '$lib/components/liquidium/supply/LiquidiumSupplyReview.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { btcAddressMainnet, ethAddress } from '$lib/derived/address.derived';
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
	import { mapNetworkIdToBitcoinNetwork } from '$lib/utils/network.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		market: LiquidiumMarket;
		amount: OptionAmount;
		supplyProgressStep: string;
		inflowFee?: bigint;
		inflowFeeUnavailable?: boolean;
		currentStep?: WizardStep;
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

	// UTXO selection and the network fee must cover the gross transfer that is actually
	// broadcast (net supply + Liquidium inflow fee), not just the net amount the user typed.
	// Selecting UTXOs for the net amount alone under-funds the transaction, so the signer
	// rejects it with NotEnoughFunds once the inflow fee is added on broadcast.
	let feeEstimationAmount = $derived(
		nonNullish(parsedAmount) && nonNullish(inflowFee)
			? convertSatoshisToBtc(parsedAmount + inflowFee)
			: amount
	);

	const { store: utxosFeeStore } = setContext<UtxosFeeContext>(UTXOS_FEE_CONTEXT_KEY, {
		store: initUtxosFeeStore()
	});

	let utxosFee = $derived($utxosFeeStore?.utxosFee);

	let validateSupplyAmount = $derived.by(() => {
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

	const supply = async () => {
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
			await executeLiquidiumSupply({
				identity: $authIdentity,
				ethAddress: $ethAddress,
				poolId: market.poolId,
				asset: market.asset,
				amount: amountBaseUnits,
				inflowFee,
				displayAmount: `${amount}`,
				progress: (step) => (supplyProgressStep = step),
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

			supplyProgressStep = ProgressStepsLiquidiumSupply.DONE;

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
			totalFee={utxosFee?.feeSatoshis}
			bind:amount
		/>
	{/if}
</UtxosFeeLoader>
