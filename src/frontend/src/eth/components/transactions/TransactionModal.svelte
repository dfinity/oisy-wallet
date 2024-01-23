<script lang="ts">
	import type { Transaction } from '$lib/types/transaction';
	import type { BigNumber } from '@ethersproject/bignumber';
	import { address } from '$lib/derived/address.derived';
	import { Modal } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';
	import { nonNullish } from '@dfinity/utils';
	import { formatSecondsToDate, formatToken } from '$lib/utils/format.utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import TransactionStatus from './TransactionStatus.svelte';
	import { token } from '$lib/derived/token.derived';
	import Value from '$lib/components/ui/Value.svelte';

	export let transaction: Transaction;

	let from: string;
	let to: string | undefined;
	let value: BigNumber;
	let timestamp: number | undefined;
	let hash: string | undefined;
	let blockNumber: number | undefined;

	$: ({ from, value, timestamp, hash, blockNumber, to } = transaction);

	let type: 'send' | 'receive';
	$: type = from?.toLowerCase() === $address?.toLowerCase() ? 'send' : 'receive';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">Transaction details</svelte:fragment>

	<div>
		{#if nonNullish(hash)}
			<Value ref="hash">
				<svelte:fragment slot="label">Transaction Hash</svelte:fragment>
				<output>{hash}</output>
				<Copy value={hash} text="Transaction hash copied to clipboard." inline />
			</Value>
		{/if}

		{#if nonNullish(blockNumber)}
			<Value ref="blockNumber">
				<svelte:fragment slot="label">Block</svelte:fragment>
				<output>{blockNumber}</output>
			</Value>

			<TransactionStatus {blockNumber} />
		{/if}

		{#if nonNullish(timestamp)}
			<Value ref="timestamp">
				<svelte:fragment slot="label">Timestamp</svelte:fragment>
				<output>{formatSecondsToDate(timestamp)}</output>
			</Value>
		{/if}

		<Value ref="type">
			<svelte:fragment slot="label">Type</svelte:fragment>
			{`${type === 'send' ? 'Send' : 'Receive'}`}
		</Value>

		<Value ref="from">
			<svelte:fragment slot="label">From</svelte:fragment>
			<output>{from}</output>
			<Copy value={from} text="From address copied to clipboard." inline />
		</Value>

		{#if nonNullish(to)}
			<Value ref="to">
				<svelte:fragment slot="label">Interacted With (To)</svelte:fragment>
				<output>{to}</output>
				<Copy value={to} text="To address copied to clipboard." inline />
			</Value>
		{/if}

		<Value ref="amount">
			<svelte:fragment slot="label">Value</svelte:fragment>
			<output>
				{formatToken({
					value,
					unitName: $token.decimals,
					displayDecimals: $token.decimals
				})}
			</output>
		</Value>

		<button class="primary full center text-center my-3" on:click={modalStore.close}>Close</button>
	</div>
</Modal>
