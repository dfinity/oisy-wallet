<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { BadgeVariant } from '$lib/types/style';
	import { formatToShortDateString } from '$lib/utils/format.utils';
	import IconCalendarDays from '$lib/components/icons/lucide/IconCalendarDays.svelte';

	interface Props {
		date: Date;
		prefix?: string | undefined;
		suffix?: string | undefined;
		testId?: string | undefined;
		variant?: BadgeVariant;
		showIcon?: boolean;
	}

	let {
		date,
		prefix = undefined,
		suffix = undefined,
		testId = undefined,
		variant = 'default',
		showIcon = false,
	}: Props = $props();

	const formattedDate = $derived(
		`${formatToShortDateString({ date, i18n: $i18n })} ${date.getDate()}`
	);
</script>

<Badge styleClass="rounded-full py-1 pl-2 pr-3" {testId} {variant}>
	<div class="flex items-center gap-1.5 text-sm">
		{#if showIcon}
			<IconCalendarDays size="14" />
		{/if}

		{prefix ?? ''}
		{formattedDate}
		{suffix ?? ''}
	</div>
</Badge>
