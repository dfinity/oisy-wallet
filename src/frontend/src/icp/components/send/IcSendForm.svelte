<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import { createEventDispatcher } from 'svelte';
	import { token } from '$lib/derived/token.derived';
	import SendDestination from '$lib/components/send/SendDestination.svelte';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { icAccountIdentifierStore } from '$icp/derived/ic.derived';
	import IcFeeDisplay from './IcFeeDisplay.svelte';
	import { ICP_NETWORK } from '$lib/constants/networks.constants';
	import SendNetworkICP from "$eth/components/send/SendNetworkICP.svelte";
	import IcSendNetworkCkBTC from "$icp/components/send/IcSendNetworkCkBTC.svelte";
	import type {Network, NetworkId} from "$lib/types/network";

	export let destination = '';
	export let amount: number | undefined = undefined;
	export let networkId: NetworkId | undefined = undefined;

	let invalid = true;
	$: invalid = isNullishOrEmpty(destination) || invalidAmount(amount);

	const dispatch = createEventDispatcher();
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<SendDestination bind:destination network={ICP_NETWORK} />

	<IcSendNetworkCkBTC token={$token} bind:destination bind:networkId />

	<label for="amount" class="font-bold px-4.5">Amount:</label>
	<Input name="amount" inputType="icp" required bind:value={amount} placeholder="Amount" />

	<SendSource token={$token} source={$icAccountIdentifierStore ?? ''} />

	<IcFeeDisplay />

	<div class="flex justify-end gap-1">
		<button type="button" class="secondary" on:click={() => dispatch('icClose')}>Cancel</button>
		<button class="primary" type="submit" disabled={invalid} class:opacity-10={invalid}>
			Next
		</button>
	</div>
</form>
