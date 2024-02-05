<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store.js';
	import { Modal } from '@dfinity/gix-components';
	import Copy from '$lib/components/ui/Copy.svelte';
	import type { BigNumber } from '@ethersproject/bignumber';
	import { nonNullish } from '@dfinity/utils';
	import { formatNanosecondsToDate, formatToken } from '$lib/utils/format.utils';
	import { token } from '$lib/derived/token.derived';
	import Value from '$lib/components/ui/Value.svelte';
	import type { IcTransactionType, IcTransactionUi } from '$icp/types/ic';

	export let transaction: IcTransactionUi;

	let id: bigint;
	let from: string | undefined;
	let to: string | undefined;
	let value: BigNumber | undefined;
	let timestamp: bigint | undefined;
	let type: IcTransactionType;
	let typeLabel: string | undefined;
	let toLabel: string | undefined;

	$: ({ id, from, to, value, timestamp, type, typeLabel, toLabel } = transaction);
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">Transaction details</svelte:fragment>

	<div>
		<Value ref="id">
			<svelte:fragment slot="label">Transaction ID</svelte:fragment>
			<output>{id}</output>
			<Copy value={`${id}`} text="Transaction ID copied to clipboard." inline />
		</Value>

		{#if nonNullish(timestamp)}
			<Value ref="timestamp">
				<svelte:fragment slot="label">Timestamp</svelte:fragment>
				<output>{formatNanosecondsToDate(timestamp)}</output>
			</Value>
		{/if}

		<Value ref="type">
			<svelte:fragment slot="label">Type</svelte:fragment>
			<span class="capitalize"
				>{type}{#if nonNullish(typeLabel)}
					({typeLabel}){/if}</span
			>
		</Value>

		{#if nonNullish(from)}
			<Value ref="from">
				<svelte:fragment slot="label">From</svelte:fragment>
				<output>{from}</output>
				<Copy value={from} text="From address copied to clipboard." inline />
			</Value>
		{/if}

		{#if nonNullish(to)}
			<Value ref="to">
				<svelte:fragment slot="label">To</svelte:fragment>
				<output>{to}</output>{#if nonNullish(toLabel)}
					({toLabel}){/if}
				<Copy value={to} text="To address copied to clipboard." inline />
			</Value>
		{/if}

		{#if nonNullish(value)}
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
		{/if}

		<button class="primary full center text-center my-3" on:click={modalStore.close}>Close</button>
	</div>
</Modal>
