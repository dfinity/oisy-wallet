<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import IcFeeDisplay from './IcFeeDisplay.svelte';
	import IcReviewNetwork from '$icp/components/send/IcReviewNetwork.svelte';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import SendData from '$lib/components/send/SendData.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { balance } from '$lib/derived/balances.derived';
	import { tokenStandard } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import type { NetworkId } from '$lib/types/network';
	import { invalidAmount } from '$lib/utils/input.utils';

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

<ContentWithToolbar>
	{#if nonNullish($token)}
		<SendData {amount} {destination} token={$token} balance={$balance} {source}>
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
