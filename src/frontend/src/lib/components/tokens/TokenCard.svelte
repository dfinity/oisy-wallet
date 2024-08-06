<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import type { Token } from '$lib/types/token';
	import Tag from '$lib/components/ui/Tag.svelte';
	import { nonNullish } from '@dfinity/utils';

	export let token: Token;
</script>

<Card noMargin>
	{#if nonNullish(token.displayName?.prefix)}
		<Tag>ck</Tag>
	{/if}
	{token.displayName?.name ?? token.name}

	<TokenLogo {token} slot="icon" color="white" />

	<slot name="description" slot="description" />

	<slot name="exchange" slot="action" />
</Card>
