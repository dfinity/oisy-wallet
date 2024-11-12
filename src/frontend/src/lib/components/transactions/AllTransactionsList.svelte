<script lang="ts">
	import { slide } from 'svelte/transition';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import type { AllTransactionsUi } from '$lib/types/transaction';
	import {
		isNetworkIdBTCMainnet,
		isNetworkIdEthereum,
		isNetworkIdICP
	} from '$lib/utils/network.utils';
	import { nonNullish } from '@dfinity/utils';
	import IcTransactionModal from '$icp/components/transactions/IcTransactionModal.svelte';
	import type { BtcTransactionUi } from '$btc/types/btc';
	import type { EthTransactionUi } from '$eth/types/eth-transaction';
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import BtcTransactionModal from '$btc/components/transactions/BtcTransactionModal.svelte';
	import EthTransactionModal from '$eth/components/transactions/EthTransactionModal.svelte';
	import {
		modalBtcTransaction,
		modalIcTransaction,
		modalEthTransaction
	} from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';

	let transactions: AllTransactionsUi;
	// TODO: extract the function to a separate util
	$: transactions = $enabledTokens.reduce<AllTransactionsUi>(
		(acc, { network: { id: networkId } }) => {
			if (isNetworkIdBTCMainnet(networkId)) {
				// TODO: Implement BTC transactions
			}

			if (isNetworkIdICP(networkId)) {
				// TODO: Implement ICP transactions
				return acc;
			}

			if (isNetworkIdEthereum(networkId)) {
				// TODO: Implement Ethereum transactions
				return acc;
			}

			return acc;
		},
		[]
	);

	let selectedBtcTransaction: BtcTransactionUi | undefined;
	$: selectedBtcTransaction = $modalBtcTransaction
		? ($modalStore?.data as BtcTransactionUi | undefined)
		: undefined;

	let selectedEthTransaction: EthTransactionUi | undefined;
	$: selectedEthTransaction = $modalEthTransaction
		? ($modalStore?.data as EthTransactionUi | undefined)
		: undefined;

	let selectedIcTransaction: IcTransactionUi | undefined;
	$: selectedIcTransaction = $modalIcTransaction
		? ($modalStore?.data as IcTransactionUi | undefined)
		: undefined;
</script>

<!--TODO: include skeleton for loading transactions-->

{#if transactions.length > 0}
	{#each transactions as transaction, index (`${transaction.id}-${index}`)}
		<li in:slide={SLIDE_DURATION}>
			<svelte:component this={transaction.transactionComponent} {transaction} />
		</li>
	{/each}
{/if}

{#if transactions.length === 0}
	<TransactionsPlaceholder />
{/if}

{#if $modalBtcTransaction && nonNullish(selectedBtcTransaction)}
	<BtcTransactionModal transaction={selectedBtcTransaction} />
{:else if $modalEthTransaction && nonNullish(selectedEthTransaction)}
	<EthTransactionModal transaction={selectedEthTransaction} />
{:else if $modalIcTransaction && nonNullish(selectedIcTransaction)}
	<IcTransactionModal transaction={selectedIcTransaction} />
{/if}
