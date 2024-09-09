<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
</script>

<Card>
	<span class="inline-block max-w-full w-[120px] sm:w-[200px]"><slot><SkeletonText /></slot></span>

	<span class="inline-block w-full max-w-[100px]" slot="amount"><SkeletonText /></span>

	<SkeletonLogo slot="icon" />
</Card>
