<script lang="ts">
	import { type Snippet, untrack } from 'svelte';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import { setIdbBalancesStore } from '$lib/api/idb-balances.api';
	import {
		setIdbBtcTransactions,
		setIdbEthTransactions,
		setIdbIcTransactions,
		setIdbSolTransactions
	} from '$lib/api/idb-transactions.api';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	// We don't need to track identity and tokens changes for every store, since we are interested in the final result of the balances store.
	// And the balances store will be updated when the identity or tokens change too.
	// TODO: split it by single token to avoid unnecessary updates. This should happen directly
	$effect(() => {
		setIdbBalancesStore({
			identity: untrack(() => $authIdentity),
			tokens: untrack(() => $enabledTokens),
			balancesStoreData: $balancesStore
		});
	});
</script>

{@render children?.()}
