<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import BtcSendAmount from './BtcSendAmount.svelte';
	import BtcSendDestination from '$btc/components/send/BtcSendDestination.svelte';
	import type { BtcAmountAssertionError } from '$btc/types/btc-send';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';
	export let networkId: NetworkId | undefined = undefined;
	export let amount: number | undefined = undefined;
	export let destination = '';
	export let source: string;

	let amountError: BtcAmountAssertionError | undefined;
	let invalidDestination: boolean;

	const dispatch = createEventDispatcher();
	const close = () => dispatch('icClose');
</script>

<SendForm {source}>
	<BtcSendDestination
		slot="destination"
		bind:destination
		bind:invalidDestination
		{networkId}
		on:icQRCodeScan
	/>

	<BtcSendAmount slot="amount" bind:amount bind:amountError />

	<!--	TODO: calculate and display transaction fee	-->

	<button slot="cancel" type="button" class="secondary block flex-1" on:click={close}
		>{$i18n.core.text.cancel}</button
	>
</SendForm>
