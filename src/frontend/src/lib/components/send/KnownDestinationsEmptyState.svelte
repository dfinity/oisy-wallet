<script lang="ts">
	import { fade } from 'svelte/transition';
	import IconOisyEmptyState from '$lib/components/icons/IconOisyEmptyState.svelte';

	interface Props {
		title: string;
		description: string;
	}

	let { title, description }: Props = $props();
</script>

<div in:fade class="my-10 flex flex-col items-center justify-center px-4 text-center">
	<IconOisyEmptyState />
	<div class="mb-1 mt-5 font-bold">{title}</div>
	<div class="text-sm">{description}</div>
</div>
