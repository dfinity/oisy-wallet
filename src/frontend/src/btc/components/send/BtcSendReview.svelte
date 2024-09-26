<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import IcReviewNetwork from '$icp/components/send/IcReviewNetwork.svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { balance } from '$lib/derived/balances.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import type { NetworkId } from '$lib/types/network';

	export let destination = '';
	export let amount: number | undefined = undefined;
	export let networkId: NetworkId | undefined = undefined;
	export let source: string;

	const dispatch = createEventDispatcher();
</script>

<ContentWithToolbar>
	{#if nonNullish($token)}
		<SendData {amount} {destination} token={$token} balance={$balance} {source}>
			<IcReviewNetwork {networkId} slot="network" />
		</SendData>
	{/if}

	<ButtonGroup slot="toolbar">
		<button class="secondary block flex-1" on:click={() => dispatch('icBack')}
			>{$i18n.core.text.back}</button
		>
		<button class="primary block flex-1" on:click={() => dispatch('icSend')}>
			{$i18n.send.text.send}
		</button>
	</ButtonGroup>
</ContentWithToolbar>
