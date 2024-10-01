<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
</script>

<Card noMargin>
	<span class="inline-block w-[120px] max-w-full sm:w-[200px]"><slot><SkeletonText /></slot></span>

	<span class="mt-1 inline-block w-[120px] max-w-full sm:w-[200px]" slot="description"
		><SkeletonText /></span
	>

	<SkeletonLogo slot="icon" />
</Card>
