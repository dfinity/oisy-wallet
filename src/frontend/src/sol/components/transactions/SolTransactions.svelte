<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import { DEFAULT_SOLANA_TOKEN } from '$lib/constants/tokens.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import {
		modalSolToken,
		modalSolTokenData,
		modalSolTransaction
	} from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionToken, Token } from '$lib/types/token';
	import { mapTransactionModalData } from '$lib/utils/transaction.utils';
	import SolTokenModal from '$sol/components/tokens/SolTokenModal.svelte';
	import SolTransaction from '$sol/components/transactions/SolTransaction.svelte';
	import SolTransactionModal from '$sol/components/transactions/SolTransactionModal.svelte';
	import SolTransactionsScroll from '$sol/components/transactions/SolTransactionsScroll.svelte';
	import SolTransactionsSkeletons from '$sol/components/transactions/SolTransactionsSkeletons.svelte';
	import { solTransactions } from '$sol/derived/sol-transactions.derived';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';

	let selectedTransaction: SolTransactionUi | undefined;
	let selectedToken: OptionToken;
	$: ({ transaction: selectedTransaction, token: selectedToken } =
		mapTransactionModalData<SolTransactionUi>({
			$modalOpen: $modalSolTransaction,
			$modalStore
		}));

	let token: Token;
	$: token = $pageToken ?? DEFAULT_SOLANA_TOKEN;
</script>

<Header>
	{$i18n.transactions.text.title}
</Header>

<SolTransactionsSkeletons>
	{#if $solTransactions.length > 0}
		<SolTransactionsScroll {token}>
			{#each $solTransactions as transaction, index (`${transaction.id}-${index}`)}
				<li in:slide={SLIDE_DURATION}>
					<SolTransaction {token} {transaction} />
				</li>
			{/each}
		</SolTransactionsScroll>
	{:else if $solTransactions.length === 0}
		<TransactionsPlaceholder />
	{/if}
</SolTransactionsSkeletons>

{#if $modalSolTransaction && nonNullish(selectedTransaction)}
	<SolTransactionModal token={selectedToken} transaction={selectedTransaction} />
{:else if $modalSolToken}
	<SolTokenModal fromRoute={$modalSolTokenData} />
{/if}
