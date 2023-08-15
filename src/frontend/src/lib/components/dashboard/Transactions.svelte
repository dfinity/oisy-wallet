<script lang="ts">
	import { sortedTransactionsStore } from '$lib/stores/transactions.store';
	import { isTransactionPending } from '$lib/utils/transactions.utils';
	import { Utils } from 'alchemy-sdk';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
</script>

<p class="font-bold mb-2">Activity</p>

{#each $sortedTransactionsStore as transaction, index (transaction.hash)}
	{@const { blockNumber, from, to, value } = transaction}

	<div class="flex">
		<div class="rounded-50 bg-deep-violet opacity-15">
			<IconReceive />
		</div>

		<div>
			<p>Receive</p>
			<p>Aug 8, 2023 15:21</p>
		</div>

		<span class="flex-1 text-right">{Utils.formatEther(value.toString())}</span>
	</div>

	<p>Block: <output>{blockNumber ?? ''}</output></p>
	<p>From: <output>{from}</output></p>
	<p>To: <output>{to}</output></p>
	<p>Value: <output>{Utils.formatEther(value.toString())}</output></p>

	{#if isTransactionPending(transaction)}
		<p><strong>Pending</strong></p>
	{/if}

	<hr />
{/each}

<style lang="scss">
	hr {
		width: 100%;
		display: block;
		border: 1px solid lightseagreen;
	}
</style>
