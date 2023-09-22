<script lang="ts">
	import type { Transaction } from '$lib/types/transaction';
	import { BigNumber } from '@ethersproject/bignumber';
	import { addressStore } from '$lib/stores/address.store';
	import { Modal } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';
	import { nonNullish } from '@dfinity/utils';
	import { formatToDate, formatTokenShort } from '$lib/utils/format.utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { Utils } from 'alchemy-sdk';
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
			<label for="hash" class="font-bold px-1.25">Transaction Hash:</label>
			<p id="hash" class="font-normal mb-2 px-1.25 break-words">
				<output>{hash}</output>
				<Copy value={hash} text="Transaction hash copied to clipboard." inline />
			</p>
		{/if}

		{#if nonNullish(blockNumber)}
			<label for="block-number" class="font-bold px-1.25">Block:</label>
			<p id="block-number" class="font-normal mb-2 px-1.25 break-words">
				<output>{blockNumber}</output>
			</p>

			<TransactionStatus {blockNumber} />
		{/if}

		{#if nonNullish(timestamp)}
			<label for="timestamp" class="font-bold px-1.25">Timestamp:</label>
			<p id="timestamp" class="font-normal mb-2 px-1.25 break-words">
				<output>{formatToDate(timestamp)}</output>
			</p>
		{/if}

		<label for="type" class="font-bold px-1.25">Type:</label>
		<p id="type" class="font-normal mb-2 px-1.25 break-words">
			{`${type === 'send' ? 'Send' : 'Receive'}`}
		</p>

		<label for="from" class="font-bold px-1.25">From:</label>
		<p id="from" class="font-normal mb-2 px-1.25 break-words">
			<output>{from}</output>
			<Copy value={from} text="From address copied to clipboard." inline />
		</p>

		{#if nonNullish(to)}
			<label for="to" class="font-bold px-1.25">Interacted With (To):</label>
			<p id="to" class="font-normal mb-2 px-1.25 break-words">
				<output>{to}</output>
				<Copy value={to} text="To address copied to clipboard." inline />
			</p>
		{/if}

		<label for="amount" class="font-bold px-1.25">Value:</label>
		<p id="amount" class="font-normal mb-2 px-1.25 break-words">
			<output>
				{formatTokenShort({
					value,
					unitName: $token.decimals
				})}
			</output>
		</p>

		<button class="primary full center text-center my-3" on:click={modalStore.close}>Close</button>
	</div>
</Modal>
