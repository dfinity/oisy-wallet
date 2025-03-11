<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Tag from '$lib/components/ui/Tag.svelte';
	import type { CardData } from '$lib/types/token-card';

	export let data: CardData;

	const ariaLabel = nonNullish(data.oisyName)
		? `${data.oisyName.prefix ?? ''}${data.oisyName.oisyName}`
		: data.name;
</script>

<span aria-label={ariaLabel}>
	<Tag ariaHidden>ck</Tag>
	<span aria-hidden="true">{data.oisyName?.oisyName ?? data.name}</span>
</span>
