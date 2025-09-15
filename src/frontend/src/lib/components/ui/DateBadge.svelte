<script lang="ts">
	import type { Snippet } from 'svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { BadgeVariant } from '$lib/types/style';
	import { formatToShortDateString } from '$lib/utils/format.utils';

	interface Props {
		date: Date;
		styleClass?: string;
		inlineStyleClass?: string;
		prefix?: string | undefined;
		suffix?: string | undefined;
		testId?: string | undefined;
		variant?: BadgeVariant;
		children?: Snippet;
	}

	let {
		date,
		styleClass,
		inlineStyleClass,
		prefix = undefined,
		suffix = undefined,
		testId = undefined,
		variant = 'default',
		children
	}: Props = $props();

	const formattedDate = $derived(
		`${formatToShortDateString({ date, i18n: $i18n })} ${date.getDate()}`
	);
</script>

<Badge {styleClass} {testId} {variant}>
	<div class={inlineStyleClass}>
		{@render children?.()}

		{prefix ?? ''}
		{formattedDate}
		{suffix ?? ''}
	</div>
</Badge>
