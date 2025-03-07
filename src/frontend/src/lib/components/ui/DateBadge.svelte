<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import { formatToShortDateString } from '$lib/utils/format.utils';
	import type { BadgeVariant } from '$lib/types/style';

	export let date: Date;
	export let prefix: string | undefined = undefined;
	export let suffix: string | undefined = undefined;
	export let testId: string | undefined = undefined;
	export let variant: BadgeVariant;

	let formattedDate: string;
	$: formattedDate = `${formatToShortDateString(date)} ${date.getDate()}`;
</script>

<Badge {testId} {variant}>
	{prefix ?? ''}
	{formattedDate}
	{suffix ?? ''}
</Badge>
