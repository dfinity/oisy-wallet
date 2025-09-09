<script lang="ts">
	import { type Snippet, getContext } from 'svelte';
	import IcTokenFees from '$icp/components/fee/IcTokenFees.svelte';
	import DestinationValue from '$lib/components/address/DestinationValue.svelte';
	import ConvertReview from '$lib/components/convert/ConvertReview.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import type { OptionAmount } from '$lib/types/send';

	interface Props {
		sendAmount: OptionAmount;
		receiveAmount: number | undefined;
		destination?: string;
		isDestinationCustom?: boolean;
		cancel?: Snippet;
	}

	let {
		sendAmount,
		receiveAmount,
		destination = '',
		isDestinationCustom = false,
		cancel
	}: Props = $props();

	const { sourceToken, sourceTokenExchangeRate, destinationToken } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	const cancel_render = $derived(cancel);
</script>

<ConvertReview on:icConvert on:icBack {sendAmount} {receiveAmount}>
	{#snippet destination()}
		<DestinationValue token={$destinationToken} {destination} {isDestinationCustom} />
	{/snippet}

	{#snippet fee()}
		<IcTokenFees
			sourceToken={$sourceToken}
			sourceTokenExchangeRate={$sourceTokenExchangeRate}
			networkId={$destinationToken.network.id}
		/>
	{/snippet}

	{#snippet cancel()}
		{@render cancel_render?.()}
	{/snippet}
</ConvertReview>
