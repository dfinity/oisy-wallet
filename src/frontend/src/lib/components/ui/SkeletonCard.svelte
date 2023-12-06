<script lang="ts">
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';
</script>

<Card>
	<span class="inline-block w-full"><SkeletonText /></span>

	<span class="inline-block w-full max-w-[100px]" slot="amount"><SkeletonText /></span>

	<SkeletonLogo slot="icon" />
</Card>
