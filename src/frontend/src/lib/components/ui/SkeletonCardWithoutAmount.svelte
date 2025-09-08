<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
</script>

<Card noMargin>
	<span class="inline-block w-[120px] max-w-full sm:w-[200px]"><slot><SkeletonText /></slot></span>

	{#snippet description()}
		<span class="mt-1 inline-block w-[120px] max-w-full sm:w-[200px]"><SkeletonText /></span>
	{/snippet}

	{#snippet icon()}
		<SkeletonLogo />
	{/snippet}
</Card>
