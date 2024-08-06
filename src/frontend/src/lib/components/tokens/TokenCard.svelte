<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import type { Token } from '$lib/types/token';
	import Tag from '$lib/components/ui/Tag.svelte';
	import { nonNullish } from '@dfinity/utils';

	export let token: Token;

	const ariaLabel = nonNullish(token.displayName)
		? `${token.displayName.prefix ?? ''}${token.displayName.name}`
		: token.name;
</script>

<Card noMargin>
	<span aria-label={ariaLabel}>
		{#if nonNullish(token.displayName?.prefix)}
			<Tag ariaHidden>ck</Tag>
		{/if}
		<span aria-hidden="true">{token.displayName?.name ?? token.name}</span>
	</span>

	<TokenLogo {token} slot="icon" color="white" />

	<slot name="description" slot="description" />

	<slot name="exchange" slot="action" />
</Card>
