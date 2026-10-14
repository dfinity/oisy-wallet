<script lang="ts">
	import LoaderEthBalances from '$eth/components/loaders/LoaderEthBalances.svelte';
	import MultipleListeners from '$lib/components/core/MultipleListeners.svelte';
	import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
	import ExtensionRequest from '$lib/components/extension/ExtensionRequest.svelte';
	import AgreementsGuard from '$lib/components/guard/AgreementsGuard.svelte';
	import Loader from '$lib/components/loaders/Loader.svelte';
	import LoaderTokens from '$lib/components/loaders/LoaderTokens.svelte';
	import LoaderUserProfile from '$lib/components/loaders/LoaderUserProfile.svelte';
	import SignerSignIn from '$lib/components/signer/SignerSignIn.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
</script>

<!--
	Only what the connect and review screens read: profile and networks, addresses, tokens, balances
	and rates. The app's `Guards` stay out, so neither the rewards welcome nor any other app prompt
	opens over the request; the terms still have to be accepted.
-->
{#if $authNotSignedIn}
	<SignerSignIn />
{:else}
	<LoaderUserProfile>
		<Loader>
			<LoaderTokens />

			<LoaderEthBalances />

			<MultipleListeners tokens={$enabledFungibleNetworkTokens} />

			<ExchangeWorker />

			<ExtensionRequest />
		</Loader>

		<AgreementsGuard />
	</LoaderUserProfile>
{/if}
