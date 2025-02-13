<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import { formatToShortDateString } from '$lib/utils/format.utils';

	export let date: Date;
	export let prefix: string | undefined = undefined;
	export let suffix: string | undefined = undefined;
	export let testId: string | undefined = undefined;

	let formattedDate;
	$: formattedDate = `${formatToShortDateString(date)} ${date.getDate()}`;
</script>

<Badge {testId}>
	{prefix ?? ''}
	{formattedDate}
	{suffix ?? ''}
</Badge>
