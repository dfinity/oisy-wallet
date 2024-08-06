<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import type { Token } from '$lib/types/token';
	import Tag from '$lib/components/ui/Tag.svelte';
	import { nonNullish } from '@dfinity/utils';

	export let token: Token;

	const ariaLabel = nonNullish(token.oisyName)
		? `${token.oisyName.prefix ?? ''}${token.oisyName.oisyName}`
		: token.name;
</script>

<Card noMargin>
	<span aria-label={ariaLabel}>
		{#if nonNullish(token.oisyName?.prefix)}
			<Tag ariaHidden>{token.oisyName.prefix}</Tag>
		{/if}
		<span aria-hidden="true">{token.oisyName?.oisyName ?? token.name}</span>
	</span>

	<TokenLogo {token} slot="icon" color="white" />

	<slot name="description" slot="description" />

	<slot name="exchange" slot="action" />
</Card>
