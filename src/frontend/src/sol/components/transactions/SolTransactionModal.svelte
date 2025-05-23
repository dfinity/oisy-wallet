<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Commitment } from '@solana/kit';
	import TransactionModal from '$lib/components/transactions/TransactionModal.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionToken } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkSolana } from '$lib/utils/network.utils';
	import type { SolTransactionType, SolTransactionUi } from '$sol/types/sol-transaction';

	export let transaction: SolTransactionUi;
	export let token: OptionToken;

	let from: string;
	let to: string | undefined;
	let type: SolTransactionType;
	let value: bigint | undefined;
	let timestamp: bigint | undefined;
	let id: string;
	let status: Commitment | null;

	let explorerUrl: string | undefined;
	$: explorerUrl = isNetworkSolana(token?.network) ? token.network.explorerUrl : undefined;

	$: ({ from, value, timestamp, signature: id, blockNumber, to, type, status } = transaction);

	let txExplorerUrl: string | undefined;
	$: txExplorerUrl = nonNullish(explorerUrl)
		? replacePlaceholders(explorerUrl, { $args: `tx/${id}/` })
		: undefined;

	let toExplorerUrl: string | undefined;
	$: toExplorerUrl = nonNullish(explorerUrl)
		? replacePlaceholders(explorerUrl, { $args: `account/${to}/` })
		: undefined;

	let fromExplorerUrl: string | undefined;
	$: fromExplorerUrl = nonNullish(explorerUrl)
		? replacePlaceholders(explorerUrl, { $args: `account/${from}/` })
		: undefined;
</script>

<TransactionModal
	commonData={{
		to,
		from,
		timestamp,
		blockNumber,
		txExplorerUrl,
		toExplorerUrl,
		fromExplorerUrl
	}}
	hash={id}
	{value}
	{token}
	sendToLabel={$i18n.transaction.text.to}
	typeLabel={type === 'send' ? $i18n.send.text.send : $i18n.receive.text.receive}
>
	<Value ref="status" slot="transaction-status">
		{#snippet label()}
			{$i18n.transaction.text.status}
		{/snippet}

		{#snippet content()}
			{#if nonNullish(status)}
				{`${$i18n.transaction.status[status]}`}
			{/if}
		{/snippet}
	</Value>
</TransactionModal>
