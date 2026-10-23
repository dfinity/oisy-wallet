<script lang="ts">
	import type { Snippet } from 'svelte';
	import LoaderEthBalances from '$eth/components/loaders/LoaderEthBalances.svelte';
	import LoaderEthTransactions from '$eth/components/loaders/LoaderEthTransactions.svelte';
	import CkMinterInfoLoader from '$icp/components/loaders/CkMinterInfoLoader.svelte';
	import MultipleListeners from '$lib/components/core/MultipleListeners.svelte';
	import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
	import AgreementsGuard from '$lib/components/guard/AgreementsGuard.svelte';
	import Loader from '$lib/components/loaders/Loader.svelte';
	import LoaderContacts from '$lib/components/loaders/LoaderContacts.svelte';
	import LoaderLiquidium from '$lib/components/loaders/LoaderLiquidium.svelte';
	import LoaderOisyTrade from '$lib/components/loaders/LoaderOisyTrade.svelte';
	import LoaderTokens from '$lib/components/loaders/LoaderTokens.svelte';
	import LoaderUserProfile from '$lib/components/loaders/LoaderUserProfile.svelte';
	import LoaderWallets from '$lib/components/loaders/LoaderWallets.svelte';
	import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import SolLoaderWallets from '$sol/components/core/SolLoaderWallets.svelte';

	interface Props {
		children: Snippet;
		walletOverview?: boolean;
	}

	let { children, walletOverview = false }: Props = $props();
</script>

<!--
	Only what the extension's screens read: profile and networks, addresses, tokens, balances and
	rates. The app's `Guards` stay out, so neither the rewards welcome nor any other app prompt opens
	over them; the terms still have to be accepted.
-->
<LoaderUserProfile>
	<Loader>
		<LoaderTokens />

		<LoaderEthBalances />

		{#if walletOverview}
			<!-- The side panel's wallet: every chain's balances and the value held with providers make up the same total as the app's; transactions, ck minter info and contacts feed the recent activity rows. -->
			<LoaderWallets />
			<LoaderLiquidium />
			<LoaderOisyTrade />
			<LoaderEthTransactions />
			<CkMinterInfoLoader />
			<LoaderContacts />
		{:else}
			<SolLoaderWallets />
		{/if}

		<MultipleListeners tokens={$enabledFungibleNetworkTokens} />

		<ExchangeWorker />

		{@render children()}
	</Loader>

	<AgreementsGuard />
</LoaderUserProfile>
