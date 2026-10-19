<script lang="ts">
	import type { Snippet } from 'svelte';
	import LoaderEthBalances from '$eth/components/loaders/LoaderEthBalances.svelte';
	import MultipleListeners from '$lib/components/core/MultipleListeners.svelte';
	import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
	import AgreementsGuard from '$lib/components/guard/AgreementsGuard.svelte';
	import Loader from '$lib/components/loaders/Loader.svelte';
	import LoaderTokens from '$lib/components/loaders/LoaderTokens.svelte';
	import LoaderUserProfile from '$lib/components/loaders/LoaderUserProfile.svelte';
	import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
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

		<MultipleListeners tokens={$enabledFungibleNetworkTokens} />

		<ExchangeWorker />

		{@render children()}
	</Loader>

	<AgreementsGuard />
</LoaderUserProfile>
