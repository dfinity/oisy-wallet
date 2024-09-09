<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Tag from '$lib/components/ui/Tag.svelte';
	import type { Token } from '$lib/types/token';

	export let token: Token;

	const ariaLabel = nonNullish(token.oisyName)
		? `${token.oisyName.prefix ?? ''}${token.oisyName.oisyName}`
		: token.name;
</script>

<span aria-label={ariaLabel}>
	{#if nonNullish(token.oisyName?.prefix)}
		<Tag ariaHidden>{token.oisyName.prefix}</Tag>
	{/if}
	<span aria-hidden="true">{token.oisyName?.oisyName ?? token.name}</span>
</span>
