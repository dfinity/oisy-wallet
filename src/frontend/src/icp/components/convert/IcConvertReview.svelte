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

<ConvertReview {receiveAmount} {sendAmount} on:icConvert on:icBack>
	<svelte:fragment slot="destination">
		<DestinationValue {destination} {isDestinationCustom} token={$destinationToken} />
	</svelte:fragment>

	<IcTokenFees
		slot="fee"
		networkId={$destinationToken.network.id}
		sourceToken={$sourceToken}
		sourceTokenExchangeRate={$sourceTokenExchangeRate}
	/>

	<slot name="cancel" slot="cancel" />
</ConvertReview>
