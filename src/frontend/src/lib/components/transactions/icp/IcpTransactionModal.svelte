<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store.js';
	import { Modal } from '@dfinity/gix-components';
	import type { IcpTransaction } from '$lib/types/icp-wallet';
	import Copy from '$lib/components/ui/Copy.svelte';
	import type { BigNumber } from '@ethersproject/bignumber';
	import { onMount } from 'svelte';
	import { mapIcpTransaction } from '$lib/utils/icp-transactions.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import { nonNullish } from '@dfinity/utils';
	import { formatNanosecondsToDate, formatTokenDetailed } from '$lib/utils/format.utils';
	import { icpAccountIdentifiedStore } from '$lib/derived/icp.derived';
	import { token } from '$lib/derived/token.derived';

	export let transaction: IcpTransaction;

	let id: bigint;

	$: ({ id } = transaction);

	let from: string | undefined;
	let to: string | undefined;
	let value: BigNumber | undefined;
	let timestamp: bigint | undefined;

	let type: 'send' | 'receive';
	$: type =
		from?.toLowerCase() === $icpAccountIdentifiedStore?.toHex().toLowerCase() ? 'send' : 'receive';

	onMount(() => {
		try {
			({ from, to, value, timestamp } = mapIcpTransaction({ transaction }));
		} catch (err: unknown) {
			toastsError({
				msg: { text: 'Cannot map the transaction to display its information.' },
				err
			});
		}
	});
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">Transaction details</svelte:fragment>

	<div>
		<label for="id" class="font-bold px-4.5">Transaction ID:</label>
		<p id="id" class="font-normal mb-4 px-4.5 break-all">
			<output>{id}</output>
			<Copy value={`${id}`} text="Transaction ID copied to clipboard." inline />
		</p>

		{#if nonNullish(timestamp)}
			<label for="timestamp" class="font-bold px-4.5">Timestamp:</label>
			<p id="timestamp" class="font-normal mb-4 px-4.5 break-all">
				<output>{formatNanosecondsToDate(timestamp)}</output>
			</p>
		{/if}

		<label for="type" class="font-bold px-4.5">Type:</label>
		<p id="type" class="font-normal mb-4 px-4.5 break-all">
			{`${type === 'send' ? 'Send' : 'Receive'}`}
		</p>

		{#if nonNullish(from)}
			<label for="from" class="font-bold px-4.5">From:</label>
			<p id="from" class="font-normal mb-4 px-4.5 break-all">
				<output>{from}</output>
				<Copy value={from} text="From address copied to clipboard." inline />
			</p>
		{/if}

		{#if nonNullish(to)}
			<label for="to" class="font-bold px-4.5">To:</label>
			<p id="to" class="font-normal mb-4 px-4.5 break-all">
				<output>{to}</output>
				<Copy value={to} text="To address copied to clipboard." inline />
			</p>
		{/if}

		{#if nonNullish(value)}
			<label for="amount" class="font-bold px-4.5">Value:</label>
			<p id="amount" class="font-normal mb-4 px-4.5 break-all">
				<output>
					{formatTokenDetailed({
						value,
						unitName: $token.decimals
					})}
				</output> ICP
			</p>
		{/if}

		<button class="primary full center text-center my-3" on:click={modalStore.close}>Close</button>
	</div>
</Modal>
