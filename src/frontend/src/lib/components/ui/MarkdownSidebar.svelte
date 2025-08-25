<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import type { MarkdownBlockType } from '$lib/types/markdown';

	interface Props {
		headings: MarkdownBlockType[];
	}

	const { headings }: Props = $props();

	let activeId: string | undefined = $state();

	onMount(() => {
		// Scroll spy to highlight active item
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						activeId = entry.target.id;
					}
				});
			},
			{ rootMargin: '0px 0px -80% 0px', threshold: 0 }
		);

		headings.forEach(({ id }) => {
			if (nonNullish(id)) {
				const el = document.getElementById(id);
				if (nonNullish(el)) {
					observer.observe(el);
				}
			}
		});
	});
</script>

<List condensed styleClass="pr-3">
	{#each headings as { id, text }, index (id)}
		<ListItem>
			<a href={`#${id}`} class="w-full no-underline">
				<span
					class:text-primary={nonNullish(activeId) ? activeId === id : index === 0}
					class="text-xs">{text}</span
				>
			</a>
		</ListItem>
	{/each}
</List>
