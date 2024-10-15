<script lang="ts">
	import { fade } from 'svelte/transition';
	import NetworksSwitcher from '$lib/components/networks/NetworksSwitcher.svelte';
	import ManageTokensButton from '$lib/components/tokens/ManageTokensButton.svelte';
	import TokensMenu from '$lib/components/tokens/TokensMenu.svelte';
	import TokensSignedIn from '$lib/components/tokens/TokensSignedIn.svelte';
	import TokensSignedOut from '$lib/components/tokens/TokensSignedOut.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import { testnetsEnabled } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class:pointer-events-none={$authNotSignedIn} class:blur-[1.5px]={$authNotSignedIn}>
	<Header>
		{#if $testnetsEnabled}
			<NetworksSwitcher disabled={$authNotSignedIn} />
		{:else}
			<h2 class="text-base">{$i18n.tokens.text.title}</h2>
		{/if}

		<TokensMenu slot="end" />
	</Header>

	{#if $authSignedIn}
		<TokensSignedIn />

		<div transition:fade class="mb-4 mt-12 hidden w-full justify-center sm:flex sm:w-auto">
			<ManageTokensButton />
		</div>
	{:else}
		<TokensSignedOut />
	{/if}
</div>
