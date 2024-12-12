<script lang="ts">
	import { slide } from 'svelte/transition';
	import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet,
		solAddressTestnet
	} from '$lib/derived/address.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import type { OptionSolAddress } from '$lib/types/address';
	import {
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLTestnet
	} from '$lib/utils/network.utils';
	import SolTransaction from '$sol/components/transactions/SolTransaction.svelte';
	import { solTransactions } from '$sol/derived/sol-transactions.derived';
	import { loadSolTransactions } from '$sol/services/sol-transactions.services';

	let address: OptionSolAddress;
	$: address = isNetworkIdSOLTestnet($networkId)
		? $solAddressTestnet
		: isNetworkIdSOLDevnet($networkId)
			? $solAddressDevnet
			: isNetworkIdSOLLocal($networkId)
				? $solAddressLocal
				: $solAddressMainnet;

	$: address, $token, loadSolTransactions({ address, token: $token });

	$: console.log($solTransactions);
</script>

<Header>
	{$i18n.transactions.text.title}
</Header>

<!--TODO: add skeleton-->
<!--TODO: add listener-->
{#if $solTransactions.length > 0}
	<!--	TODO: make it paginated to load more on scroll since we have a limit of calls-->
	{#each $solTransactions as transaction, index (`${transaction.id}-${index}`)}
		<li in:slide>
			<SolTransaction {transaction} token={$token ?? SOLANA_TOKEN} />
		</li>
	{/each}
{/if}

{#if $solTransactions.length === 0}
	<TransactionsPlaceholder />
{/if}

<!--TODO: add transaction modal and token modal-->
