<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import type { TagVariant } from '$lib/types/style';

	interface Props {
		onclick: () => void;
		children: Snippet;
		disabled?: boolean;
		ariaLabel: string;
		testId?: string;
		tag?: string;
		tagVariant?: TagVariant;
	}

	let { onclick, children, disabled = false, ariaLabel, testId, tag, tagVariant }: Props = $props();
</script>

<button
	class="nav-item nav-item-condensed"
	class:opacity-50={disabled}
	aria-label={ariaLabel}
	data-tid={testId}
	{disabled}
	{onclick}
>
	{@render children?.()}

	{#if nonNullish(tag)}
		<span class="ml-auto">
			<Tag variant={tagVariant}>{tag}</Tag>
		</span>
	{/if}
</button>
