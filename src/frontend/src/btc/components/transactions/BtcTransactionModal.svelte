<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { BtcTransactionStatus, BtcTransactionUi } from '$btc/types/btc';
	import { BTC_MAINNET_EXPLORER_URL, BTC_TESTNET_EXPLORER_URL } from '$env/explorers.env';
	import { isNetworkIdBTCTestnet, isNetworkIdBTCRegtest } from '$icp/utils/ic-send.utils';
	import TransactionModal from '$lib/components/transactions/TransactionModal.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TransactionType } from '$lib/types/transaction';

	export let transaction: BtcTransactionUi;

	let from: string;
	let to: string | undefined;
	let type: TransactionType;
	let value: bigint | undefined;
	let timestamp: number | undefined;
	let id: string;
	let blockNumber: number | undefined;
	let status: BtcTransactionStatus;

	let explorerUrl: string | undefined;
	$: {
		explorerUrl = isNetworkIdBTCTestnet($tokenWithFallback.network.id)
			? BTC_TESTNET_EXPLORER_URL
			: isNetworkIdBTCRegtest($tokenWithFallback.network.id)
				? undefined
				: BTC_MAINNET_EXPLORER_URL;
	}

	let txExplorerUrl: string | undefined;
	$: txExplorerUrl = nonNullish(explorerUrl) ? `${explorerUrl}/tx/${id}` : undefined;

	let toExplorerUrl: string | undefined;
	$: toExplorerUrl = nonNullish(explorerUrl) ? `${explorerUrl}/address/${to}` : undefined;

	let fromExplorerUrl: string | undefined;
	$: fromExplorerUrl =
		nonNullish(explorerUrl) && nonNullish(to) ? `${explorerUrl}/address/${from}` : undefined;

	$: ({ from, value, timestamp, id, blockNumber, to, type, status } = transaction);
</script>

<TransactionModal
	{from}
	{to}
	{timestamp}
	{blockNumber}
	hash={id}
	{txExplorerUrl}
	{toExplorerUrl}
	{fromExplorerUrl}
	typeLabel={type === 'send' ? $i18n.send.text.send : $i18n.receive.text.receive}
	value={nonNullish(value) ? BigNumber.from(value) : undefined}
>
	<!--	TODO: Implement BtcTransactionStatus component	-->
	<Value ref="status" slot="transaction-status">
		<svelte:fragment slot="label">{$i18n.transaction.text.status}</svelte:fragment>
		{`${status === 'pending' ? $i18n.transaction.text.pending : 'Confirmed'}`}
	</Value>
</TransactionModal>
