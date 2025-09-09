<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { run } from 'svelte/legacy';
	import { slide } from 'svelte/transition';
	import LoaderEthTransactions from '$eth/components/loaders/LoaderEthTransactions.svelte';
	import EthTokenModal from '$eth/components/tokens/EthTokenModal.svelte';
	import EthTransaction from '$eth/components/transactions/EthTransaction.svelte';
	import EthTransactionModal from '$eth/components/transactions/EthTransactionModal.svelte';
	import EthTransactionsSkeletons from '$eth/components/transactions/EthTransactionsSkeletons.svelte';
	import { sortedEthTransactions } from '$eth/derived/eth-transactions.derived';
	import { ethereumTokenId } from '$eth/derived/token.derived';
	import type { EthTransactionUi } from '$eth/types/eth-transaction';
	import { mapEthTransactionUi } from '$eth/utils/transactions.utils';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { toCkMinterInfoAddresses } from '$icp-eth/utils/cketh.utils';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import {
		modalEthTransaction,
		modalEthToken,
		modalEthTokenData
	} from '$lib/derived/modal.derived';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { EthAddress } from '$lib/types/address';
	import type { OptionToken } from '$lib/types/token';
	import { mapTransactionModalData } from '$lib/utils/transaction.utils';

	let ckMinterInfoAddresses: EthAddress[] = $state([]);
	run(() => {
		ckMinterInfoAddresses = toCkMinterInfoAddresses($ckEthMinterInfoStore?.[$ethereumTokenId]);
	});

	let sortedTransactionsUi: EthTransactionUi[] = $derived(
		$sortedEthTransactions.map(({ data: transaction }) =>
			mapEthTransactionUi({
				transaction,
				ckMinterInfoAddresses,
				ethAddress: $ethAddress
			})
		)
	);

	let selectedTransaction: EthTransactionUi | undefined = $state();
	let selectedToken: OptionToken = $state();
	run(() => {
		({ transaction: selectedTransaction, token: selectedToken } =
			mapTransactionModalData<EthTransactionUi>({
				$modalOpen: $modalEthTransaction,
				$modalStore
			}));
	});
</script>

<Header>{$i18n.transactions.text.title}</Header>

<LoaderEthTransactions>
	<EthTransactionsSkeletons>
		{#each sortedTransactionsUi as transaction (transaction.hash)}
			<div transition:slide={SLIDE_DURATION}>
				<EthTransaction token={$tokenWithFallback} {transaction} />
			</div>
		{/each}

		{#if $sortedEthTransactions.length === 0}
			<TransactionsPlaceholder />
		{/if}
	</EthTransactionsSkeletons>
</LoaderEthTransactions>

{#if $modalEthTransaction && nonNullish(selectedTransaction)}
	<EthTransactionModal token={selectedToken} transaction={selectedTransaction} />
{:else if $modalEthToken}
	<EthTokenModal fromRoute={$modalEthTokenData} />
{/if}
