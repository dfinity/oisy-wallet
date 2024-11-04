<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import BtcSendAmount from '$btc/components/send/BtcSendAmount.svelte';
	import BtcSendDestination from '$btc/components/send/BtcSendDestination.svelte';
	import { loadBtcPendingSentTransactions } from '$btc/services/btc-pending-sent-transactions.services';
	import type { BtcAmountAssertionError } from '$btc/types/btc-send';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { balance } from '$lib/derived/balances.derived';
	import { token } from '$lib/stores/token.store';
	import type { NetworkId } from '$lib/types/network';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	export let networkId: NetworkId | undefined = undefined;
	export let amount: number | undefined = undefined;
	export let destination = '';
	export let source: string;

	let amountError: BtcAmountAssertionError | undefined;
	let invalidDestination: boolean;

	// TODO: check if we can align this validation flag with other SendForm components (e.g IcSendForm)
	let invalid = true;
	$: invalid =
		invalidDestination ||
		nonNullish(amountError) ||
		isNullishOrEmpty(destination) ||
		isNullish(amount);

	onMount(() => {
		// This call will load the pending sent transactions for the source address in the store.
		// This data will then be used in the review step. That's why we don't wait here.
		loadBtcPendingSentTransactions({
			identity: $authIdentity,
			networkId,
			address: source
		});
	});
</script>

<SendForm on:icNext {source} token={$token} balance={$balance} disabled={invalid}>
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
