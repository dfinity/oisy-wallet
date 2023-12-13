<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store.js';
	import { Modal } from '@dfinity/gix-components';
	import type { IcpTransaction } from '$lib/types/icp-wallet';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { BigNumber } from '@ethersproject/bignumber';
	import { onMount } from 'svelte';
	import { mapIcpTransaction } from '$lib/utils/icp-transactions.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import { nonNullish } from '@dfinity/utils';
	import { formatToDate } from '$lib/utils/format.utils';
	import { formatNanosecondsToDate } from '$lib/utils/date.utils';

	export let transaction: IcpTransaction;

	let id: bigint;

	$: ({ id } = transaction);

	let from: string | undefined;
	let to: string | undefined;
	let value: BigNumber | undefined;
	let timestamp: bigint | undefined;

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
	</div>
</Modal>
