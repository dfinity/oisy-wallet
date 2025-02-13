<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';

	export let date: Date;
	export let prefix: string | undefined = undefined;
	export let suffix: string | undefined = undefined;
	export let testId: string | undefined = undefined;

	let formattedDate;
	$: formattedDate = `${date.toLocaleDateString('en-US', { month: 'long' })} ${date.getDate()}`;
</script>

<Badge {testId}>
	{prefix ?? ''}
	{formattedDate}
	{suffix ?? ''}
</Badge>