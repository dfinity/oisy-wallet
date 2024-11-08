<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { ComponentType } from 'svelte';
	import type { BtcTransactionType } from '$btc/types/btc-transaction';
	import type { EthTransactionType } from '$eth/types/eth-transaction';
	import IconConvert from '$lib/components/icons/IconConvert.svelte';
	import IconConvertFrom from '$lib/components/icons/IconConvertFrom.svelte';
	import IconConvertTo from '$lib/components/icons/IconConvertTo.svelte';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import TransactionStatusComponent from '$lib/components/transactions/TransactionStatus.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import type { TransactionStatus } from '$lib/types/transaction';
	import { formatSecondsToDate } from '$lib/utils/format.utils.js';

	export let amount: BigNumber | undefined;
	export let type: BtcTransactionType | EthTransactionType;
	export let status: TransactionStatus;
	export let timestamp: number | undefined;

	let icon: ComponentType;
	$: icon =
		(type === 'withdraw' || type === 'deposit') && status === 'pending'
			? IconConvert
			: type === 'withdraw'
				? IconConvertFrom
				: type === 'deposit'
					? IconConvertTo
					: type === 'send'
						? IconSend
						: IconReceive;

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
