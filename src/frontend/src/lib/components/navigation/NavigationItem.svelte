<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import { trackEvent as trackEventServices } from '$lib/services/analytics.services';
	import type { TrackEventParams } from '$lib/types/analytics';
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
		trackEvent?: TrackEventParams;
	}

	let {
		label,
		icon,
		href,
		selected = false,
		ariaLabel,
		testId,
		tag,
		tagVariant,
		trackEvent
	}: Props = $props();

	const onclick = () => {
		if (isNullish(trackEvent)) {
			return;
		}

		trackEventServices(trackEvent);
	};
</script>

<a
	class="nav-item flex min-w-0 flex-1"
	class:selected
	aria-label={ariaLabel}
	data-tid={testId}
	{href}
	{onclick}
>
	{@render icon?.()}
	<span class="block w-full truncate md:w-auto">
		{@render label?.()}
	</span>
	{#if nonNullish(tag)}
		<div
			class="absolute -mt-1.5 ml-10 scale-75 text-xs/4.5 font-bold uppercase md:relative md:mt-0.75 md:ml-1 md:scale-100"
		>
			<Tag size="sm" variant={tagVariant}>{tag}</Tag>
		</div>
	{/if}
</a>
