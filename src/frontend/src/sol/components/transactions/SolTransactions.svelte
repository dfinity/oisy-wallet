<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet,
		solAddressTestnet
	} from '$lib/derived/address.derived';
	import { modalSolTransaction } from '$lib/derived/modal.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { token } from '$lib/stores/token.store';
	import type { OptionSolAddress } from '$lib/types/address';
	import type { OptionToken } from '$lib/types/token';
	import {
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLTestnet
	} from '$lib/utils/network.utils';
	import { mapTransactionModalData } from '$lib/utils/transaction.utils';
	import SolTransaction from '$sol/components/transactions/SolTransaction.svelte';
	import SolTransactionModal from '$sol/components/transactions/SolTransactionModal.svelte';
	import SolTransactionsSkeletons from '$sol/components/transactions/SolTransactionsSkeletons.svelte';
	import { solTransactions } from '$sol/derived/sol-transactions.derived';
	import { loadSolTransactionsOld as loadSolTransactions } from '$sol/services/sol-transactions.services';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';

	let address: OptionSolAddress;
	$: address = isNetworkIdSOLTestnet($networkId)
		? $solAddressTestnet
		: isNetworkIdSOLDevnet($networkId)
			? $solAddressDevnet
			: isNetworkIdSOLLocal($networkId)
				? $solAddressLocal
				: $solAddressMainnet;

	// $: address, $token, loadSolTransactions({ address, token: $token });

	let selectedTransaction: SolTransactionUi | undefined;
	let selectedToken: OptionToken;
	$: ({ transaction: selectedTransaction, token: selectedToken } =
		mapTransactionModalData<SolTransactionUi>({
			$modalOpen: $modalSolTransaction,
			$modalStore: $modalStore
		}));
</script>

<Header>
	{$i18n.transactions.text.title}
</Header>

<SolTransactionsSkeletons>
	<!--TODO: add listener-->
	<!--	TODO: make it paginated to load more on scroll since we have a limit of calls-->
	{#each $solTransactions as transaction, index (`${transaction.id}-${index}`)}
		<div in:slide={SLIDE_DURATION}>
			<SolTransaction {transaction} token={$token ?? SOLANA_TOKEN} />
		</div>
	{/each}

	{#if $solTransactions.length === 0}
		<TransactionsPlaceholder />
	{/if}
</SolTransactionsSkeletons>

{#if $modalSolTransaction && nonNullish(selectedTransaction)}
	<SolTransactionModal transaction={selectedTransaction} token={selectedToken} />
{/if}
