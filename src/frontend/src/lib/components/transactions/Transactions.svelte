<script lang="ts">
	import {isNullish, nonNullish} from '@dfinity/utils';
	import BtcTransactions from '$btc/components/transactions/BtcTransactions.svelte';
	import EthTransactions from '$eth/components/transactions/EthTransactions.svelte';
	import IcTransactions from '$icp/components/transactions/IcTransactions.svelte';
	import { routeNetwork, routeToken } from '$lib/derived/nav.derived';
	import { networkBitcoin, networkICP, networkSolana } from '$lib/derived/network.derived';
	import SolTransactions from '$sol/components/transactions/SolTransactions.svelte';
	import {pageToken} from "$lib/derived/page-token.derived";
	import {allTokens} from "$lib/derived/all-tokens.derived";
	import type {OptionToken} from "$lib/types/token";
	import {goto} from "$app/navigation";
	import {FALLBACK_TIMEOUT} from "$lib/constants/app.constants";
	import ManageTokensModal from "$lib/components/manage/ManageTokensModal.svelte";

	let token: OptionToken;
	$: token = $allTokens.find((token) => token.name === $routeToken);
	let showTokenModal = false;

	$: if (isNullish($pageToken) && nonNullish($routeToken) && nonNullish(token)) {
		setTimeout(() => {
			showTokenModal = true;
		}, FALLBACK_TIMEOUT);
	}
	const handleClose = async () => {
		if (isNullish($pageToken)) {
			await goto('/');
		}
	};
</script>

{#if showTokenModal && nonNullish(token)}
	<ManageTokensModal onClose={handleClose} />
{:else if nonNullish($routeNetwork)}
	{#if $networkICP}
		<IcTransactions />
	{:else if $networkBitcoin}
		<BtcTransactions />
	{:else if $networkSolana}
		<SolTransactions />
	{:else if nonNullish($routeToken)}
		<EthTransactions />
	{/if}
{/if}
