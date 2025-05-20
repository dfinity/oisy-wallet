<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Tag from '$lib/components/ui/Tag.svelte';
	import type { TagVariant } from '$lib/types/style';

	export let disabled = false;
	export let ariaLabel: string;
	export let testId: string | undefined = undefined;
	export let tag: string | undefined = undefined;
	export let tagVariant: TagVariant | undefined = undefined;
</script>

<button
	class="nav-item nav-item-condensed"
	data-tid={testId}
	aria-label={ariaLabel}
	on:click
	{disabled}
	class:opacity-50={disabled}
>
	<slot />
	{#if nonNullish(tag)}
		<span class="ml-auto">
			<Tag variant={tagVariant}>{tag}</Tag>
		</span>
	{/if}
</button>
