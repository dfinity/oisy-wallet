<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { ComponentType } from 'svelte';
	import TransactionStatusComponent from '$lib/components/transactions/TransactionStatus.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import type { TransactionStatus, TransactionType } from '$lib/types/transaction';
	import { formatSecondsToDate } from '$lib/utils/format.utils.js';
	import { mapTransactionIcon } from '$lib/utils/transaction.utils';

	export let amount: BigNumber | undefined;
	export let type: TransactionType;
	export let status: TransactionStatus;
	export let timestamp: number | undefined;

	let icon: ComponentType;
	$: icon = mapTransactionIcon({ type, status });

	let iconWithOpacity: boolean;
	$: iconWithOpacity = status === 'pending' || status === 'unconfirmed';
</script>

<button class="contents" on:click>
	<Card>
		<span class="inline-block first-letter:capitalize"><slot /></span>

		<RoundedIcon slot="icon" {icon} iconStyleClass={iconWithOpacity ? 'opacity-10' : ''} />

		<svelte:fragment slot="amount">
			{#if nonNullish(amount)}
				<Amount {amount} />
			{/if}
		</svelte:fragment>

		<svelte:fragment slot="description">
			{#if nonNullish(timestamp)}
				{formatSecondsToDate(timestamp)}
			{/if}

			<TransactionStatusComponent {status} />
		</svelte:fragment>
	</Card>
</button>
