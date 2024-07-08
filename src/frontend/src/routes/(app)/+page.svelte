<script lang="ts">
	import Tokens from '$lib/components/tokens/Tokens.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import Header from '$lib/components/ui/Header.svelte';
	import TokensMenu from '$lib/components/tokens/TokensMenu.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import PseudoTokens from '$lib/components/tokens/PseudoTokens.svelte';
</script>

<Header>
	{$i18n.tokens.text.title}

	<TokensMenu slot="end" />
</Header>

{#if $authSignedIn}
	<Tokens />
{:else}
	<PseudoTokens />
{/if}
