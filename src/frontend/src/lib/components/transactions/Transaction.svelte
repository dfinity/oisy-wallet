<script lang="ts">
	import type { Transaction } from '$lib/types/transaction';
	import { BigNumber } from '@ethersproject/bignumber';
	import { Utils } from 'alchemy-sdk';
	import { isTransactionPending } from '$lib/utils/transactions.utils';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import type { SvelteComponent } from 'svelte';
	import { addressStore } from '$lib/stores/address.store';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { nonNullish } from '@dfinity/utils';
	import Card from '$lib/components/ui/Card.svelte';
	import { formatToDate } from '$lib/utils/format.utils';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import {modalTransaction} from "$lib/derived/modal.derived";

	export let transaction: Transaction;

	let from: string;
	let value: BigNumber;
	let timestamp: number | undefined;

	$: ({ from, value, timestamp } = transaction);

	let type: 'send' | 'receive';
	$: type = from?.toLowerCase() === $addressStore?.toLowerCase() ? 'send' : 'receive';

	let icon: typeof SvelteComponent;
	$: icon = type === 'send' ? IconSend : IconReceive;

	let amount: BigNumber;
	$: amount = type == 'send' ? value.mul(BigNumber.from(-1)) : value;

	let pending: boolean;
	$: pending = isTransactionPending(transaction);
</script>

<button on:click={() => modalStore.openTransaction(transaction)} class="contents">
	<Card {pending}>
		{`${type === 'send' ? 'Send' : 'Receive'}`}

		<RoundedIcon slot="icon" {icon} iconStyleClass={pending ? 'opacity-15' : ''} />

		<svelte:fragment slot="amount">{Utils.formatEther(amount.toString())}</svelte:fragment>
		<svelte:fragment slot="description">
			{#if nonNullish(timestamp)}
				{formatToDate(timestamp)}
			{/if}
		</svelte:fragment>
	</Card>
</button>
