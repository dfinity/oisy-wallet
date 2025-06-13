<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';

	export let testId: string | undefined = undefined;
</script>

<Card {testId}>
	<span class="inline-block w-[120px] max-w-full sm:w-[200px]"><slot><SkeletonText /></slot></span>

	{#snippet amount()}
		<span class="inline-block w-full max-w-[100px]"><SkeletonText /></span>
	{/snippet}

	{#snippet icon()}
		<SkeletonLogo />
	{/snippet}
</Card>
