<script lang="ts">
	import { getContext } from 'svelte';
	import IcTokenFees from '$icp/components/fee/IcTokenFees.svelte';
	import ConvertReview from '$lib/components/convert/ConvertReview.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';

	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;
	export let networkId: NetworkId;

	const { sourceToken, sourceTokenExchangeRate } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);
</script>

<ConvertReview on:icConvert on:icBack {sendAmount} {receiveAmount}>
	<IcTokenFees
		sourceToken={$sourceToken}
		sourceTokenExchangeRate={$sourceTokenExchangeRate}
		{networkId}
		slot="fee"
	/>

	<slot name="cancel" slot="cancel" />
</ConvertReview>
