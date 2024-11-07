<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import TokenModal from '$eth/components/tokens/TokenModal.svelte';
	import EthTransaction from '$eth/components/transactions/EthTransaction.svelte';
	import EthTransactionModal from '$eth/components/transactions/EthTransactionModal.svelte';
	import EthTransactionsSkeletons from '$eth/components/transactions/EthTransactionsSkeletons.svelte';
	import { tokenNotInitialized } from '$eth/derived/nav.derived';
	import { ethereumTokenId, ethereumToken } from '$eth/derived/token.derived';
	import { sortedTransactions } from '$eth/derived/transactions.derived';
	import { loadTransactions } from '$eth/services/transactions.services';
	import type { EthTransactionUi } from '$eth/types/eth-transaction';
	import { mapTransactionUi } from '$eth/utils/transactions.utils';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { toCkMinterInfoAddresses } from '$icp-eth/utils/cketh.utils';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { modalToken, modalTransaction } from '$lib/derived/modal.derived';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionEthAddress } from '$lib/types/address';
	import type { TokenId } from '$lib/types/token';
	import type { Transaction as TransactionType } from '$lib/types/transaction';
	import { isNetworkIdEthereum } from '$lib/utils/network.utils';

	let ckMinterInfoAddresses: OptionEthAddress[] = [];
	$: ckMinterInfoAddresses = toCkMinterInfoAddresses({
		minterInfo: $ckEthMinterInfoStore?.[$ethereumTokenId],
		networkId: $ethereumToken.network.id
	});

	let sortedTransactionsUi: EthTransactionUi[];
	$: sortedTransactionsUi = $sortedTransactions.map((transaction) =>
		mapTransactionUi({
			transaction,
			ckMinterInfoAddresses,
			$ethAddress: $ethAddress
		})
	);

	let tokenIdLoaded: TokenId | undefined = undefined;

	const load = async () => {
		if ($tokenNotInitialized) {
			tokenIdLoaded = undefined;
			return;
		}

		const {
			network: { id: networkId },
			id: tokenId
		} = $tokenWithFallback;

		// If user browser ICP transactions but switch token to Eth, due to the derived stores, the token can briefly be set to ICP while the navigation is not over.
		// This prevents the glitch load of ETH transaction with a token ID for ICP.
		if (!isNetworkIdEthereum(networkId)) {
			tokenIdLoaded = undefined;
			return;
		}

		// We don't reload the same token in a row.
		if (tokenIdLoaded === tokenId) {
			return;
		}

		tokenIdLoaded = tokenId;

		const { success } = await loadTransactions({ tokenId, networkId });

		if (!success) {
			tokenIdLoaded = undefined;
		}
	};

	$: $tokenWithFallback, $tokenNotInitialized, (async () => await load())();

	let selectedTransaction: TransactionType | undefined;
	$: selectedTransaction = $modalTransaction
		? ($modalStore?.data as TransactionType | undefined)
		: undefined;
</script>

<Header>{$i18n.transactions.text.title}</Header>

<EthTransactionsSkeletons>
	{#each sortedTransactionsUi as transaction (transaction.hash)}
		<div transition:slide={SLIDE_DURATION}>
			<EthTransaction {transaction} />
		</div>
	{/each}

	{#if $sortedTransactions.length === 0}
		<TransactionsPlaceholder />
	{/if}
</EthTransactionsSkeletons>

{#if $modalTransaction && nonNullish(selectedTransaction)}
	<EthTransactionModal transaction={selectedTransaction} />
{:else if $modalToken}
	<TokenModal />
{/if}
