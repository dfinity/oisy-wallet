<script lang="ts">
	import { formatEtherShort } from '$lib/utils/format.utils';
	import SendData from '$lib/components/send/SendData.svelte';
	import type { BigNumber } from '@ethersproject/bignumber';
	import { createEventDispatcher } from 'svelte';

	export let amount: BigNumber;
	export let destination: string;

	const dispatch = createEventDispatcher();
</script>

<SendData amount={formatEtherShort(amount)} {destination} />

<div class="flex justify-end gap-1 mt-4">
	<button class="primary" on:click={() => dispatch('icReject')}>Reject</button>
	<button class="primary" on:click={() => dispatch('icApprove')}> Approve </button>
</div>
