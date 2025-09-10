<script lang="ts">
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';

	interface Props {
		times?: number;
	}

	let { times = 1 }: Props = $props();
</script>

{#each Array.from({ length: times }) as _, index (index)}
	<div class="flex w-full flex-col">
		<div class="mb-2.5 flex aspect-square animate-pulse rounded-xl bg-disabled-alt"></div>
		<span class="mb-1"><SkeletonText /></span>
		<span class="max-w-20"><SkeletonText /></span>
	</div>
{/each}
