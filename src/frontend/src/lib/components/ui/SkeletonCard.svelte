<script lang="ts">
	import type { Snippet } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';

	interface Props {
		testId?: string;
		children?: Snippet;
	}

	let { testId = undefined, children }: Props = $props();
</script>

<Card {testId}>
	<span class="inline-block w-[120px] max-w-full sm:w-[200px]"
		>{#if children}{@render children()}{:else}<SkeletonText />{/if}</span
	>

	{#snippet amount()}
		<span class="inline-block w-full max-w-[100px]"><SkeletonText /></span>
	{/snippet}

	{#snippet icon()}
		<SkeletonLogo />
	{/snippet}
</Card>
