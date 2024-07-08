<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { authSignedIn } from '$lib/derived/auth.derived.js';
	import TokensMenu from '$lib/components/tokens/TokensMenu.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import TokensSignedIn from '$lib/components/tokens/TokensSignedIn.svelte';
	import TokensSignedOut from '$lib/components/tokens/TokensSignedOut.svelte';
	import ManageTokensButton from '$lib/components/tokens/ManageTokensButton.svelte';
</script>

<Header>
	{$i18n.tokens.text.title}

	<TokensMenu slot="end" />
</Header>

{#if $authSignedIn}
	<TokensSignedIn />
{:else}
	<TokensSignedOut />
{/if}

<ManageTokensButton />
