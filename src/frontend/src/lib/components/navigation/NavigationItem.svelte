<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Tag from '$lib/components/ui/Tag.svelte';
	import type { TagVariant } from '$lib/types/style';

	export let href: string;
	export let selected = false;
	export let ariaLabel: string;
	export let testId: string | undefined = undefined;
	export let tag: string | undefined = undefined;
	export let tagVariant: TagVariant | undefined = undefined;
</script>

<a {href} class="nav-item" class:selected aria-label={ariaLabel} data-tid={testId}>
	<slot />
	{#if nonNullish(tag)}
		<div
			class="text-xs/4.5 md:mt-0.75 absolute -mt-1.5 ml-10 scale-75 font-bold uppercase md:relative md:ml-1 md:scale-100"
		>
			<Tag variant={tagVariant} size="sm">{tag}</Tag>
		</div>
	{/if}
</a>
