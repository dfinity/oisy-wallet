<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';

	export let rows: number;

	let cards: number[];
	$: cards = Array.from({ length: rows }, (_, i) => i);
</script>

{#each cards as _}
	<Card>
		<span class="inline-block max-w-full w-[120px] sm:w-[200px]"><SkeletonText /></span>

		<span class="inline-block w-full max-w-[100px]" slot="amount"><SkeletonText /></span>

		<SkeletonLogo slot="icon" />
	</Card>
{/each}
