<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { ComponentType } from 'svelte';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import TransactionPending from '$lib/components/transactions/TransactionPending.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TransactionType } from '$lib/types/transaction';
	import { formatSecondsToDate } from '$lib/utils/format.utils.js';

	export let value: BigNumber | undefined;
	export let type: TransactionType;
	export let pending: boolean;
	export let timestamp: number | undefined;

	let label: string;
	$: label = type === 'send' ? $i18n.send.text.send : $i18n.receive.text.receive;

	let icon: ComponentType;
	$: icon = type === 'send' ? IconSend : IconReceive;
</script>

<button class="contents" on:click>
	<Card>
		<span class="inline-block first-letter:capitalize">{label}</span>

		<RoundedIcon slot="icon" {icon} iconStyleClass={pending ? 'opacity-10' : ''} />

		<svelte:fragment slot="amount">
			{#if nonNullish(value)}
				<Amount amount={BigNumber.from(value)} />
			{/if}
		</svelte:fragment>

		<svelte:fragment slot="description">
			{#if nonNullish(timestamp)}
				{formatSecondsToDate(timestamp)}
			{/if}

			<TransactionPending {pending} />
		</svelte:fragment>
	</Card>
</button>
