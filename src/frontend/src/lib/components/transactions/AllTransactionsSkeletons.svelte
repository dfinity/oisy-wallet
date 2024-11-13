<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import {
		enabledBtcTokens,
		enabledErc20Tokens,
		enabledIcTokens
	} from '$lib/derived/tokens.derived';

	export let testIdPrefix: string | undefined = undefined;

	let btcLoading: boolean;
	$: btcLoading =
		isNullish($btcTransactionsStore) ||
		Object.getOwnPropertySymbols($btcTransactionsStore).length !== $enabledBtcTokens.length;

	let ethLoading: boolean;
	$: ethLoading =
		isNullish($ethTransactionsStore) ||
		Object.getOwnPropertySymbols($ethTransactionsStore).length !==
			$enabledEthereumTokens.length + $enabledErc20Tokens.length;

	let icLoading: boolean;
	$: icLoading =
		isNullish($icTransactionsStore) ||
		Object.getOwnPropertySymbols($icTransactionsStore).length !== $enabledIcTokens.length;

	let loading: boolean;
	$: loading = btcLoading || ethLoading || icLoading;
</script>

<TransactionsSkeletons {loading} {testIdPrefix}>
	<slot />
</TransactionsSkeletons>
