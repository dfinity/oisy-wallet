<script lang="ts">
	import BtcSendAmount from './BtcSendAmount.svelte';
	import BtcSendDestination from '$btc/components/send/BtcSendDestination.svelte';
	import type { BtcAmountAssertionError } from '$btc/types/btc-send';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { balance } from '$lib/derived/balances.derived';
	import { token } from '$lib/stores/token.store';
	import type { NetworkId } from '$lib/types/network';

	export let networkId: NetworkId | undefined = undefined;
	export let amount: number | undefined = undefined;
	export let destination = '';
	export let source: string;

	let amountError: BtcAmountAssertionError | undefined;
	let invalidDestination: boolean;
</script>

<SendForm {source} token={$token} balance={$balance}>
	<BtcSendDestination
		slot="destination"
		bind:destination
		bind:invalidDestination
		{networkId}
		on:icQRCodeScan
	/>

	<BtcSendAmount slot="amount" bind:amount bind:amountError />

	<!--	TODO: calculate and display transaction fee	-->

	<slot name="cancel" slot="cancel" />
</SendForm>
