<script lang="ts">
	import type { Snippet } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<Card noMargin>
	<span class="inline-block w-[120px] max-w-full sm:w-[200px]"
		>{#if children}{@render children()}{:else}<SkeletonText />{/if}</span
	>

	{#snippet description()}
		<span class="mt-1 inline-block w-[120px] max-w-full sm:w-[200px]"><SkeletonText /></span>
	{/snippet}

	{#snippet icon()}
		<SkeletonLogo />
	{/snippet}
</Card>
