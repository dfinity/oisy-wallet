<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { BtcTransactionStatus, BtcTransactionUi } from '$btc/types/btc';
	import type { BtcTransactionType } from '$btc/types/btc-transaction';
	import { BTC_MAINNET_EXPLORER_URL, BTC_TESTNET_EXPLORER_URL } from '$env/explorers.env';
	import TransactionModal from '$lib/components/transactions/TransactionModal.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { isNetworkIdBTCTestnet, isNetworkIdBTCRegtest } from '$lib/utils/network.utils';

	export let transaction: BtcTransactionUi;

	let from: string;
	let to: string | undefined;
	let type: BtcTransactionType;
	let value: bigint | undefined;
	let timestamp: bigint | undefined;
	let id: string;
	let blockNumber: number | undefined;
	let confirmations: number | undefined;
	let status: BtcTransactionStatus;

	let explorerUrl: string | undefined;
	$: {
		explorerUrl = isNetworkIdBTCTestnet($tokenWithFallback.network.id)
			? BTC_TESTNET_EXPLORER_URL
			: isNetworkIdBTCRegtest($tokenWithFallback.network.id)
				? undefined
				: BTC_MAINNET_EXPLORER_URL;
	}

	$: ({ from, value, timestamp, id, blockNumber, to, type, status, confirmations } = transaction);

	let txExplorerUrl: string | undefined;
	$: txExplorerUrl = nonNullish(explorerUrl) ? `${explorerUrl}/tx/${id}` : undefined;

	let toExplorerUrl: string | undefined;
	$: toExplorerUrl = nonNullish(explorerUrl) ? `${explorerUrl}/address/${to}` : undefined;

	let fromExplorerUrl: string | undefined;
	$: fromExplorerUrl =
		nonNullish(explorerUrl) && nonNullish(to) ? `${explorerUrl}/address/${from}` : undefined;
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
	value={nonNullish(value) ? BigNumber.from(value) : undefined}
	sendToLabel={$i18n.transaction.text.to}
	typeLabel={type === 'send' ? $i18n.send.text.send : $i18n.receive.text.receive}
>
	<svelte:fragment slot="transaction-confirmations">
		{#if nonNullish(confirmations)}
			<Value ref="confirmations">
				<svelte:fragment slot="label">{$i18n.transaction.text.confirmations}</svelte:fragment>
				{confirmations}
			</Value>
		{/if}
	</svelte:fragment>

	<Value ref="status" slot="transaction-status">
		<svelte:fragment slot="label">{$i18n.transaction.text.status}</svelte:fragment>
		{`${
			status === 'pending'
				? $i18n.transaction.text.pending
				: status === 'unconfirmed'
					? $i18n.transaction.text.unconfirmed
					: $i18n.transaction.text.confirmed
		}`}
	</Value>
</TransactionModal>
