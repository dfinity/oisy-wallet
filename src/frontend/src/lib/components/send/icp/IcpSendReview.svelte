<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import { token } from '$lib/derived/token.derived';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { invalidIcpAddress } from '$lib/utils/icp-account.utils';
	import {icpAccountIdentifiedStore} from "$lib/derived/icp.derived";
	import IcpFeeDisplay from "$lib/components/send/icp/IcpFeeDisplay.svelte";

	export let destination = '';
	export let amount: number | undefined = undefined;

	let invalid = true;
	$: invalid =
		isNullishOrEmpty(destination) || invalidAmount(amount) || invalidIcpAddress(destination);

	const dispatch = createEventDispatcher();
</script>

<SendData {amount} {destination} token={$token} source={$icpAccountIdentifiedStore?.toHex() ?? ''} >
	<IcpFeeDisplay slot="fee" />
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
