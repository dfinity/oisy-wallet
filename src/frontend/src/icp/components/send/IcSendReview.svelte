<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import IcFeeDisplay from '$icp/components/send/IcFeeDisplay.svelte';
	import IcReviewNetwork from '$icp/components/send/IcReviewNetwork.svelte';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import SendData from '$lib/components/send/SendData.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { balance } from '$lib/derived/balances.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';
	import { invalidAmount } from '$lib/utils/input.utils';

	export let destination = '';
	export let amount: number | undefined = undefined;
	export let networkId: NetworkId | undefined = undefined;
	export let source: string;

	const { sendToken, sendTokenStandard } = getContext<SendContext>(SEND_CONTEXT_KEY);

	// Should never happen given that the same checks are performed on previous wizard step
	let invalid = true;
	$: invalid =
		isNullish($sendTokenStandard) ||
		isInvalidDestinationIc({
			destination,
			tokenStandard: $sendTokenStandard,
			networkId
		}) ||
		invalidAmount(amount);

	const dispatch = createEventDispatcher();
</script>

<ContentWithToolbar>
	{#if nonNullish($sendToken)}
		<SendData {amount} {destination} token={$sendToken} balance={$balance} {source}>
			<IcFeeDisplay slot="fee" {networkId} />
			<IcReviewNetwork {networkId} slot="network" />
		</SendData>
	{/if}

	<ButtonGroup slot="toolbar">
		<ButtonBack on:click={() => dispatch('icBack')} />
		<Button disabled={invalid} on:click={() => dispatch('icSend')}>
			{$i18n.send.text.send}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>
