<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { ComponentType } from 'svelte';
	import type { EthTransactionType } from '$eth/types/eth-transaction';
	import { isTransactionPending } from '$eth/utils/transactions.utils';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import TransactionPending from '$lib/components/transactions/TransactionPending.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Transaction } from '$lib/types/transaction';
	import { formatSecondsToDate } from '$lib/utils/format.utils';

	export let transaction: Transaction;

	let from: string;
	let value: BigNumber;
	let timestamp: number | undefined;
	let displayTimestamp: number | undefined;

	let pending: boolean;
	$: pending = isTransactionPending(transaction);

	$: ({ from, value, timestamp, displayTimestamp } = transaction);

	let type: EthTransactionType;
	$: type = from?.toLowerCase() === $ethAddress?.toLowerCase() ? 'send' : 'receive';

	let label: string;
	$: label = type === 'send' ? $i18n.send.text.send : $i18n.receive.text.receive;

	let icon: ComponentType;
	$: icon = type === 'send' ? IconSend : IconReceive;

	let amount: BigNumber;
	$: amount = type == 'send' ? value.mul(BigNumber.from(-1)) : value;

	let transactionDate: number | undefined;
	$: transactionDate = timestamp ?? displayTimestamp;
</script>

<button on:click={() => modalStore.openTransaction(transaction)} class="contents">
	<Card>
		{label}

		<RoundedIcon slot="icon" {icon} iconStyleClass={pending ? 'opacity-10' : ''} />

		<Amount {amount} slot="amount" />

		<svelte:fragment slot="description">
			{#if nonNullish(transactionDate)}
				{formatSecondsToDate(transactionDate)}
			{/if}

			<TransactionPending {pending} />
		</svelte:fragment>
	</Card>
</button>
