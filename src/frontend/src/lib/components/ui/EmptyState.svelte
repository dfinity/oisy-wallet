<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import IconOisyEmptyState from '$lib/components/icons/IconOisyEmptyState.svelte';

	interface Props {
		title: string;
		description?: string;
	}

	let { title, description }: Props = $props();
</script>

<div class="my-10 flex flex-col items-center justify-center px-4 text-center" in:fade>
	<IconOisyEmptyState />
	<div class="mb-1 mt-5 font-bold">{title}</div>

	{#if notEmptyString(description)}
		<div class="text-sm">{description}</div>
	{/if}
</div>
