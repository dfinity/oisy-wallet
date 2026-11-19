<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';

	interface Props {
		name: string;
		styleClass?: string;
		testId?: string;
	}

	let { name, styleClass = undefined, testId = undefined }: Props = $props();
</script>

<Badge {styleClass} {testId} variant="transparent" width="w-fit">
	{name}
</Badge>
