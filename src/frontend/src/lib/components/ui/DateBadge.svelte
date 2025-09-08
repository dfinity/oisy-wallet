<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { BadgeVariant } from '$lib/types/style';
	import { formatToShortDateString } from '$lib/utils/format.utils';

	interface Props {
		date: Date;
		prefix?: string | undefined;
		suffix?: string | undefined;
		testId?: string | undefined;
		variant?: BadgeVariant;
	}

	let {
		date,
		prefix = undefined,
		suffix = undefined,
		testId = undefined,
		variant = 'default'
	}: Props = $props();

	const formattedDate = $derived(
		`${formatToShortDateString({ date, i18n: $i18n })} ${date.getDate()}`
	);
</script>

<Badge {testId} {variant}>
	{prefix ?? ''}
	{formattedDate}
	{suffix ?? ''}
</Badge>
