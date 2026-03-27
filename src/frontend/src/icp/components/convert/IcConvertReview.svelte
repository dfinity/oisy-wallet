<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import IcTokenFees from '$icp/components/fee/IcTokenFees.svelte';
	import DestinationValue from '$lib/components/address/DestinationValue.svelte';
	import ConvertReview from '$lib/components/convert/ConvertReview.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import type { OptionAmount } from '$lib/types/send';

	interface Props {
		sendAmount: OptionAmount;
		receiveAmount?: number;
		destination?: string;
		isDestinationCustom?: boolean;
		onConvert: () => void;
		cancel: Snippet;
	}

	let {
		sendAmount,
		receiveAmount,
		destination: destinationProp = '',
		isDestinationCustom = false,
		onConvert,
		cancel
	}: Props = $props();

	const { sourceToken, sourceTokenExchangeRate, destinationToken } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);
</script>

<ConvertReview {cancel} {onConvert} {receiveAmount} {sendAmount}>
	{#snippet destination()}
		<DestinationValue
			destination={destinationProp}
			{isDestinationCustom}
			token={$destinationToken}
		/>
	{/snippet}

	{#snippet fee()}
		<IcTokenFees
			networkId={$destinationToken.network.id}
			sourceToken={$sourceToken}
			sourceTokenExchangeRate={$sourceTokenExchangeRate}
		/>
	{/snippet}
</ConvertReview>
