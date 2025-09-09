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

<ConvertReview {receiveAmount} {sendAmount} on:icConvert on:icBack>
	{#snippet destination()}
		<DestinationValue {destination} {isDestinationCustom} token={$destinationToken} />
	{/snippet}

	{#snippet fee()}
		<IcTokenFees
			networkId={$destinationToken.network.id}
			sourceToken={$sourceToken}
			sourceTokenExchangeRate={$sourceTokenExchangeRate}
		/>
	{/snippet}

	{#snippet cancel()}
		{@render cancel_render?.()}
	{/snippet}
</ConvertReview>
