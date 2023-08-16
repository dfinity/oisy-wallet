<script lang="ts">
	import type { Transaction } from '$lib/types/transaction';
	import { BigNumber } from '@ethersproject/bignumber';
	import { Utils } from 'alchemy-sdk';
	import { isTransactionPending } from '$lib/utils/transactions.utils';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { SvelteComponent } from 'svelte';
	import { addressStore } from '$lib/stores/address.store';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { nonNullish } from '@dfinity/utils';
	import { formatToDate } from '$lib/utils/date.utils';

	export let transaction: Transaction;

	let blockNumber: number | undefined;
	let from: string;
	let to: string | undefined;
	let value: BigNumber;
	let timestamp: number | undefined;

	$: ({ blockNumber, from, to, value, timestamp } = transaction);

	let type: 'send' | 'receive';
	$: type = from === $addressStore ? 'send' : 'receive';

	let icon: typeof SvelteComponent;
	$: icon = type === 'send' ? IconSend : IconReceive;

	let amount: BigNumber;
	$: amount = type == 'send' ? value.mul(BigNumber.from(-1)) : value;

	$: console.log(transaction);
</script>

<div class="flex gap-2 mb-2">
	<div class="relative">
		<div class="rounded-50 bg-deep-violet opacity-15" style="width: 3rem; aspect-ratio: 1/1" />
		<svelte:component this={icon} styleClass="inset-center" />
	</div>

	<div class="flex-1 flex flex-col justify-center">
		<div class="flex font-bold">
			<span>{`${type === 'send' ? 'Send' : 'Receive'}`}</span>
			<span class="flex-1 text-right">{Utils.formatEther(amount.toString())}</span>
		</div>
		<p class="text-cetacean-blue opacity-50">
			{#if nonNullish(timestamp)}
				{formatToDate(timestamp)}
			{/if}

			{#if isTransactionPending(transaction)}
				<strong>Pending (TODO styling)</strong>
			{/if}
		</p>
	</div>
</div>

<hr class="bg-deep-violet opacity-15 my-3" style="width: 100%; border: 0.05rem solid" />
