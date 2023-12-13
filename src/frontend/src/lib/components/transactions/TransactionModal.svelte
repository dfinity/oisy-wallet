<script lang="ts">
	import type { Transaction } from '$lib/types/transaction';
	import type { BigNumber } from '@ethersproject/bignumber';
	import { addressStore } from '$lib/stores/address.store';
	import { Modal } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';
	import { nonNullish } from '@dfinity/utils';
	import { formatSecondsToDate, formatTokenDetailed } from '$lib/utils/format.utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import TransactionStatus from '$lib/components/transactions/TransactionStatus.svelte';
	import { token } from '$lib/derived/token.derived';

	export let transaction: Transaction;

	let from: string;
	let to: string | undefined;
	let value: BigNumber;
	let timestamp: number | undefined;
	let hash: string | undefined;
	let blockNumber: number | undefined;

	$: ({ from, value, timestamp, hash, blockNumber, to } = transaction);

	let type: 'send' | 'receive';
	$: type = from?.toLowerCase() === $addressStore?.toLowerCase() ? 'send' : 'receive';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">Transaction details</svelte:fragment>

	<div>
		{#if nonNullish(hash)}
			<label for="hash" class="font-bold px-4.5">Transaction Hash:</label>
			<p id="hash" class="font-normal mb-4 px-4.5 break-all">
				<output>{hash}</output>
				<Copy value={hash} text="Transaction hash copied to clipboard." inline />
			</p>
		{/if}

		{#if nonNullish(blockNumber)}
			<label for="block-number" class="font-bold px-4.5">Block:</label>
			<p id="block-number" class="font-normal mb-4 px-4.5 break-all">
				<output>{blockNumber}</output>
			</p>

			<TransactionStatus {blockNumber} />
		{/if}

		{#if nonNullish(timestamp)}
			<label for="timestamp" class="font-bold px-4.5">Timestamp:</label>
			<p id="timestamp" class="font-normal mb-4 px-4.5 break-all">
				<output>{formatSecondsToDate(timestamp)}</output>
			</p>
		{/if}

		<label for="type" class="font-bold px-4.5">Type:</label>
		<p id="type" class="font-normal mb-4 px-4.5 break-all">
			{`${type === 'send' ? 'Send' : 'Receive'}`}
		</p>

		<label for="from" class="font-bold px-4.5">From:</label>
		<p id="from" class="font-normal mb-4 px-4.5 break-all">
			<output>{from}</output>
			<Copy value={from} text="From address copied to clipboard." inline />
		</p>

		{#if nonNullish(to)}
			<label for="to" class="font-bold px-4.5">Interacted With (To):</label>
			<p id="to" class="font-normal mb-4 px-4.5 break-all">
				<output>{to}</output>
				<Copy value={to} text="To address copied to clipboard." inline />
			</p>
		{/if}

		<label for="amount" class="font-bold px-4.5">Value:</label>
		<p id="amount" class="font-normal mb-4 px-4.5 break-all">
			<output>
				{formatTokenDetailed({
					value,
					unitName: $token.decimals
				})}
			</output>
		</p>

		<button class="primary full center text-center my-3" on:click={modalStore.close}>Close</button>
	</div>
</Modal>
