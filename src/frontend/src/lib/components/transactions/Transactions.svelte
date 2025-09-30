<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import BtcTransactions from '$btc/components/transactions/BtcTransactions.svelte';
	import EthTransactions from '$eth/components/transactions/EthTransactions.svelte';
	import IcTransactions from '$icp/components/transactions/IcTransactions.svelte';
	import ManageTokensModal from '$lib/components/manage/ManageTokensModal.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { FALLBACK_TIMEOUT } from '$lib/constants/app.constants';
	import { allTokens } from '$lib/derived/all-tokens.derived';
	import { modalManageTokens } from '$lib/derived/modal.derived';
	import { routeNetwork, routeToken } from '$lib/derived/nav.derived';
	import {
		networkBitcoin,
		networkEthereum,
		networkEvm,
		networkICP,
		networkSolana
	} from '$lib/derived/network.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsShow } from '$lib/stores/toasts.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import SolTransactions from '$sol/components/transactions/SolTransactions.svelte';

	let token = $derived(
		$allTokens.find(
			(token) =>
				token.name === $routeToken &&
				$routeNetwork &&
				token.network.id.description === $routeNetwork
		)
	);

	let timer = $state<NodeJS.Timeout | undefined>();

	const manageTokensId = Symbol();

	onMount(() => {
		// Since we do not have the change to check whether the data fetching is completed or not, we need to use this fallback timeout.
		// After the timeout, we assume that the fetch has failed and open the token modal or redirect the user to the activity page.
		timer = setTimeout(async () => {
			if (isNullish($pageToken) && nonNullish($routeToken) && nonNullish(token)) {
				modalStore.openManageTokens({ id: manageTokensId });
			} else if (nonNullish($routeNetwork) && nonNullish($routeToken) && isNullish(token)) {
				toastsShow({
					text: replacePlaceholders($i18n.transactions.error.loading_token_with_network, {
						$token: $routeToken,
						$network: $routeNetwork
					}),
					level: 'warn'
				});
				await goto('/');
			}
		}, FALLBACK_TIMEOUT);
	});

	onDestroy(() => clearTimeout(timer));

	const handleClose = async () => {
		if (isNullish($pageToken)) {
			await goto('/');
		}
	};
</script>

{#if $modalManageTokens}
	<ManageTokensModal initialSearch={token?.name} onClose={handleClose}>
		{#snippet infoElement()}
			<MessageBox level="info">
				{$i18n.transactions.text.token_needs_enabling}
			</MessageBox>
		{/snippet}
	</ManageTokensModal>
{:else if nonNullish($routeNetwork)}
	{#if $networkICP}
		<IcTransactions />
	{:else if $networkBitcoin}
		<BtcTransactions />
	{:else if $networkEthereum || $networkEvm}
		<EthTransactions />
	{:else if $networkSolana}
		<SolTransactions />
	{/if}
{/if}
