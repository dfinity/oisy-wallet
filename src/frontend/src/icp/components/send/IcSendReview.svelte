<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import { token, tokenStandard } from '$lib/derived/token.derived';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import IcFeeDisplay from './IcFeeDisplay.svelte';
	import type { NetworkId } from '$lib/types/network';
	import IcSendReviewNetwork from '$icp/components/send/IcSendReviewNetwork.svelte';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import { balance } from '$lib/derived/balances.derived';

	export let destination = '';
	export let amount: number | undefined = undefined;
	export let networkId: NetworkId | undefined = undefined;

	// Should never happen given that the same checks are performed on previous wizard step
	let invalid = true;
	$: invalid =
		isInvalidDestinationIc({
			destination,
			tokenStandard: $tokenStandard,
			networkId
		}) || invalidAmount(amount);

	const dispatch = createEventDispatcher();

	let source: string;
	$: source = $icrcAccountIdentifierText ?? '';
</script>

<SendData {amount} {destination} token={$token} balance={$balance} {source}>
	<IcFeeDisplay slot="fee" {networkId} />
	<IcSendReviewNetwork {networkId} slot="network" />
</SendData>

<div class="flex justify-end gap-1">
	<button class="secondary" on:click={() => dispatch('icBack')}>Back</button>
	<button
		class="primary"
		disabled={invalid}
		class:opacity-10={invalid}
		on:click={() => dispatch('icSend')}
	>
		Send
	</button>
</div>
