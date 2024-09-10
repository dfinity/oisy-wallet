<script lang="ts">
	import NetworksSwitcher from '$lib/components/networks/NetworksSwitcher.svelte';
	import ManageTokensButton from '$lib/components/tokens/ManageTokensButton.svelte';
	import TokensMenu from '$lib/components/tokens/TokensMenu.svelte';
	import TokensSignedIn from '$lib/components/tokens/TokensSignedIn.svelte';
	import TokensSignedOut from '$lib/components/tokens/TokensSignedOut.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
</script>

<div class:pointer-events-none={$authNotSignedIn} class:blur-[1.5px]={$authNotSignedIn}>
	<Header>
		<NetworksSwitcher disabled={$authNotSignedIn} />

		<TokensMenu slot="end" />
	</Header>

	{#if $authSignedIn}
		<TokensSignedIn />
	{:else}
		<TokensSignedOut />
	{/if}

	<ManageTokensButton />
</div>
