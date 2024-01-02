<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import { token } from '$lib/derived/token.derived';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { invalidIcpAddress } from '$lib/utils/icp-account.utils';
	import { icAccountIdentifierStore, icpAccountIdentifierStore } from '$lib/derived/icp.derived';
	import IcpFeeDisplay from '$lib/components/send/icp/IcpFeeDisplay.svelte';
	import { invalidIcrcAddress } from '$lib/utils/icrc-account.utils';

	export let destination = '';
	export let amount: number | undefined = undefined;

	let invalid = true;
	$: invalid =
		isNullishOrEmpty(destination) ||
		invalidAmount(amount) ||
		(invalidIcpAddress(destination) && invalidIcrcAddress(destination));

	const dispatch = createEventDispatcher();

	let source: string;
	$: source = $icAccountIdentifierStore ?? '';
</script>

<SendData {amount} {destination} token={$token} {source}>
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
