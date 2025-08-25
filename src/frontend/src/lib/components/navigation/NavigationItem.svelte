<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import type { TagVariant } from '$lib/types/style';

	interface Props {
		label?: Snippet;
		icon?: Snippet;
		href: string;
		selected?: boolean;
		ariaLabel: string;
		testId?: string;
		tag?: string;
		tagVariant?: TagVariant;
	}

	let { label, icon, href, selected = false, ariaLabel, testId, tag, tagVariant }: Props = $props();
</script>

<a
	class="nav-item flex min-w-0 flex-1"
	class:selected
	aria-label={ariaLabel}
	data-tid={testId}
	{href}
>
	{@render icon?.()}
	<span class="block w-full truncate md:w-auto">
		{@render label?.()}
	</span>
	{#if nonNullish(tag)}
		<div
			class="text-xs/4.5 md:mt-0.75 absolute -mt-1.5 ml-10 scale-75 font-bold uppercase md:relative md:ml-1 md:scale-100"
		>
			<Tag size="sm" variant={tagVariant}>{tag}</Tag>
		</div>
	{/if}
</a>
