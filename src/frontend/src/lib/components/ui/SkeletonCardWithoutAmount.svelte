<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
</script>

<Card noMargin>
	<span class="sm:w-[200px] inline-block w-[120px] max-w-full"><slot><SkeletonText /></slot></span>

	<span class="mt-1 sm:w-[200px] inline-block w-[120px] max-w-full" slot="description"
		><SkeletonText /></span
	>

	<SkeletonLogo slot="icon" />
</Card>
