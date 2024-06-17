<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import { token, tokenStandard } from '$lib/derived/token.derived';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import IcFeeDisplay from './IcFeeDisplay.svelte';
	import type { NetworkId } from '$lib/types/network';
	import IcReviewNetwork from '$icp/components/send/IcReviewNetwork.svelte';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import { balance } from '$lib/derived/balances.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';

	export let destination = '';
	export let amount: number | undefined = undefined;
	export let networkId: NetworkId | undefined = undefined;

	// Should never happen given that the same checks are performed on previous wizard step
	let invalid = true;
	$: invalid =
		isNullish($tokenStandard) ||
		isInvalidDestinationIc({
			destination,
			tokenStandard: $tokenStandard,
			networkId
		}) ||
		invalidAmount(amount);

	const dispatch = createEventDispatcher();

	let source: string;
	$: source = $icrcAccountIdentifierText ?? '';
</script>

<div class="stretch">
	{#if nonNullish($token)}
		<SendData {amount} {destination} token={$token} balance={$balance} {source}>
			<IcFeeDisplay slot="fee" {networkId} />
			<IcReviewNetwork {networkId} slot="network" />
		</SendData>
	{/if}
</div>

<ButtonGroup>
	<button class="secondary block flex-1" on:click={() => dispatch('icBack')}
		>{$i18n.core.text.back}</button
	>
	<button
		class="primary block flex-1"
		disabled={invalid}
		class:opacity-10={invalid}
		on:click={() => dispatch('icSend')}
	>
		{$i18n.send.text.send}
	</button>
</ButtonGroup>
