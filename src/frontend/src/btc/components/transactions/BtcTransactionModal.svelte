<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { BtcTransactionStatus, BtcTransactionUi } from '$btc/types/btc';
	import type { BtcTransactionType } from '$btc/types/btc-transaction';
	import { BTC_MAINNET_EXPLORER_URL, BTC_TESTNET_EXPLORER_URL } from '$env/explorers.env';
	import TransactionAddress from '$lib/components/transactions/TransactionAddress.svelte';
	import TransactionModal from '$lib/components/transactions/TransactionModal.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionToken } from '$lib/types/token';
	import { isNetworkIdBTCTestnet, isNetworkIdBTCRegtest } from '$lib/utils/network.utils';

	export let transaction: BtcTransactionUi;
	export let token: OptionToken;

	let from: string;
	let to: string[] | undefined;
	let type: BtcTransactionType;
	let value: bigint | undefined;
	let timestamp: bigint | undefined;
	let id: string;
	let blockNumber: number | undefined;
	let confirmations: number | undefined;
	let status: BtcTransactionStatus;

	let explorerUrl: string | undefined;
	$: explorerUrl = isNetworkIdBTCTestnet(token?.network.id)
		? BTC_TESTNET_EXPLORER_URL
		: isNetworkIdBTCRegtest(token?.network.id)
			? undefined
			: BTC_MAINNET_EXPLORER_URL;

	$: ({ from, value, timestamp, id, blockNumber, to, type, status, confirmations } = transaction);

	let txExplorerUrl: string | undefined;
	$: txExplorerUrl = nonNullish(explorerUrl) ? `${explorerUrl}/tx/${id}` : undefined;

	let fromExplorerUrl: string | undefined;
	$: fromExplorerUrl =
		nonNullish(explorerUrl) && nonNullish(to) ? `${explorerUrl}/address/${from}` : undefined;
</script>

<TransactionModal
	commonData={{
		from,
		timestamp,
		blockNumber,
		txExplorerUrl,
		fromExplorerUrl
	}}
	hash={id}
	{value}
	{token}
	sendToLabel={$i18n.transaction.text.to}
	typeLabel={type === 'send' ? $i18n.send.text.send : $i18n.receive.text.receive}
>
	<svelte:fragment slot="transaction-confirmations">
		{#if nonNullish(confirmations)}
			<Value ref="confirmations">
				{#snippet label()}
					{$i18n.transaction.text.confirmations}
				{/snippet}
				{#snippet content()}
					{confirmations}
				{/snippet}
			</Value>
		{/if}
	</svelte:fragment>

	<Value ref="status" slot="transaction-status">
		{#snippet label()}
			{$i18n.transaction.text.status}
		{/snippet}
		{#snippet content()}
			{`${$i18n.transaction.status[status]}`}
		{/snippet}
	</Value>

	<svelte:fragment slot="transaction-custom-to">
		{#if nonNullish(to)}
			<Value ref="recipients">
				{#snippet label()}
					{$i18n.transaction.text.to}
				{/snippet}

				{#snippet content()}
					<ul class="list-none">
						{#each to as address, index (`${address}-${index}`)}
							<li>
								<TransactionAddress
									{address}
									explorerUrl={nonNullish(explorerUrl)
										? `${explorerUrl}/address/${address}`
										: undefined}
									copiedText={$i18n.transaction.text.to_copied}
								/>
							</li>
						{/each}
					</ul>
				{/snippet}
			</Value>
		{/if}
	</svelte:fragment>
</TransactionModal>
