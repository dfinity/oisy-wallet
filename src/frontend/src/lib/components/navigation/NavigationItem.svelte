<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import type { TagVariant } from '$lib/types/style';

	interface Props {
		label?: Snippet;
		icon?: Snippet;
		href?: string;
		onclick?: () => void;
		selected?: boolean;
		ariaLabel: string;
		testId?: string;
		tag?: string;
		tagVariant?: TagVariant;
	}

	let {
		label,
		icon,
		href,
		onclick,
		selected = false,
		ariaLabel,
		testId,
		tag,
		tagVariant
	}: Props = $props();
</script>

{#snippet content()}
	{@render icon?.()}
	<span class="block w-full truncate md:w-auto">
		{@render label?.()}
	</span>
	{#if nonNullish(tag)}
		<!-- Desktop: scaled to 80% from its left edge (origin-left) so the shrink
		     hugs the label instead of drifting right. md:ml-0 resets the mobile
		     ml-10, leaving the label-to-badge gap to the row's own gap-3
		     (0.75rem/12px) — the same token spacing the icon and label use. No
		     vertical offset — the row's items-center keeps the badge centred. -->
		<div
			class="absolute -mt-1.5 ml-10 scale-75 text-xs/4.5 font-bold uppercase md:relative md:mt-0 md:ml-0 md:origin-left md:scale-[0.8]"
		>
			<Tag size="sm" variant={tagVariant}>{tag}</Tag>
		</div>
	{/if}
{/snippet}

{#if nonNullish(href)}
	<a
		class="nav-item flex min-w-0 flex-1"
		class:selected
		aria-label={ariaLabel}
		data-tid={testId}
		{href}
	>
		{@render content()}
	</a>
{:else}
	<button
		class="nav-item flex min-w-0 flex-1"
		class:selected
		aria-label={ariaLabel}
		data-tid={testId}
		{onclick}
		type="button"
	>
		{@render content()}
	</button>
{/if}
