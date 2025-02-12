<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';

	export let testId: string | undefined = undefined;
</script>

<Card {testId}>
	<span class="sm:w-[200px] inline-block w-[120px] max-w-full"><slot><SkeletonText /></slot></span>

	<span class="inline-block w-full max-w-[100px]" slot="amount"><SkeletonText /></span>

	<SkeletonLogo slot="icon" />
</Card>
