<script lang="ts">
	import { getContext } from 'svelte';
	import IcTokenFees from '$icp/components/fee/IcTokenFees.svelte';
	import DestinationValue from '$lib/components/address/DestinationValue.svelte';
	import ConvertReview from '$lib/components/convert/ConvertReview.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import type { OptionAmount } from '$lib/types/send';

	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;
	export let destination = '';
	export let isDestinationCustom = false;

	const { sourceToken, sourceTokenExchangeRate, destinationToken } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);
</script>

<ConvertReview on:icConvert on:icBack {sendAmount} {receiveAmount}>
	<svelte:fragment slot="destination">
		<DestinationValue token={$destinationToken} {destination} {isDestinationCustom} />
	</svelte:fragment>

	<IcTokenFees
		sourceToken={$sourceToken}
		sourceTokenExchangeRate={$sourceTokenExchangeRate}
		networkId={$destinationToken.network.id}
		slot="fee"
	/>

	<slot name="cancel" slot="cancel" />
</ConvertReview>
