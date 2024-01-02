<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import { createEventDispatcher } from 'svelte';
	import { token } from '$lib/derived/token.derived';
	import SendDestination from '$lib/components/send/SendDestination.svelte';
	import { TargetNetwork } from '$lib/enums/network';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { icpAccountIdentifierStore } from '$lib/derived/icp.derived';
	import IcpFeeDisplay from '$lib/components/send/icp/IcpFeeDisplay.svelte';

	export let destination = '';
	export let amount: number | undefined = undefined;

	let invalid = true;
	$: invalid = isNullishOrEmpty(destination) || invalidAmount(amount);

	const dispatch = createEventDispatcher();
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<SendDestination bind:destination network={TargetNetwork.ICP} />

	<label for="amount" class="font-bold px-4.5">Amount:</label>
	<Input name="amount" inputType="icp" required bind:value={amount} placeholder="Amount" />

	<SendSource token={$token} source={$icpAccountIdentifierStore?.toHex() ?? ''} />

	<IcpFeeDisplay />

	<div class="flex justify-end gap-1">
		<button type="button" class="secondary" on:click={() => dispatch('icClose')}>Cancel</button>
		<button class="primary" type="submit" disabled={invalid} class:opacity-10={invalid}>
			Next
		</button>
	</div>
</form>
