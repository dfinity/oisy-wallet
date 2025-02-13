<script lang="ts">
	import { getContext } from 'svelte';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import { ckEthHelperContractAddress } from '$icp-eth/derived/cketh.derived';
	import ConvertForm from '$lib/components/convert/ConvertForm.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';

	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;

	const { sourceTokenExchangeRate } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	const { maxGasFee }: FeeContext = getContext<FeeContext>(FEE_CONTEXT_KEY);

	let insufficientFunds: boolean;
	let insufficientFundsForFee: boolean;

	let invalid: boolean;
	$: invalid =
		insufficientFunds ||
		insufficientFundsForFee ||
		invalidAmount(sendAmount) ||
		isNullishOrEmpty($ckEthHelperContractAddress);
</script>

<ConvertForm
	on:icNext
	bind:sendAmount
	bind:receiveAmount
	bind:insufficientFunds
	bind:insufficientFundsForFee
	totalFee={$maxGasFee?.toBigInt()}
	disabled={invalid}
>
	<EthFeeDisplay exchangeRate={$sourceTokenExchangeRate} slot="fee" />

	<slot name="cancel" slot="cancel" />
</ConvertForm>
