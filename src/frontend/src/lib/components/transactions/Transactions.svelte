<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { goto } from '$app/navigation';
	import BtcTransactions from '$btc/components/transactions/BtcTransactions.svelte';
	import EthTransactions from '$eth/components/transactions/EthTransactions.svelte';
	import IcTransactions from '$icp/components/transactions/IcTransactions.svelte';
	import ManageTokensModal from '$lib/components/manage/ManageTokensModal.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { allTokens } from '$lib/derived/all-tokens.derived';
	import { routeNetwork, routeToken } from '$lib/derived/nav.derived';
	import { networkBitcoin, networkICP } from '$lib/derived/network.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionToken } from '$lib/types/token';

	let token: OptionToken;
	$: token = $allTokens.find((token) => token.name === $routeToken);
	let showTokenModal = false;

	$: if (isNullish($pageToken) && nonNullish($routeToken) && nonNullish(token)) {
		showTokenModal = true;
	}

	const handleClose = async () => {
		if (isNullish($pageToken)) {
			await goto('/');
		}
	};
</script>

{#if showTokenModal && nonNullish(token)}
	<ManageTokensModal onClose={handleClose} initialSearch={token.name}>
		<MessageBox slot="info-element" level="info">
			{$i18n.transactions.text.token_needs_enabling}
		</MessageBox>
	</ManageTokensModal>
{:else if nonNullish($routeNetwork)}
	{#if $networkICP}
		<IcTransactions />
	{:else if $networkBitcoin}
		<BtcTransactions />
	{:else if nonNullish($routeToken)}
		<EthTransactions />
	{/if}
{/if}
