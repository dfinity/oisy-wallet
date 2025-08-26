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
	let observer: IntersectionObserver | undefined;
	let observed: Element[] = [];

	onMount(() => {
		// Scroll spy to highlight active item
		observer = new IntersectionObserver(
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
				if (nonNullish(el) && nonNullish(observer)) {
					observer.observe(el);
					observed = [...observed, el];
				}
			}
		});

		// cleanup observers
		return () => {
			observed.forEach((el) => observer?.unobserve(el));
			observer?.disconnect();
			observed = [];
		};
	});
</script>

<List condensed styleClass="pr-3">
	{#each headings as { id, text }, index (id)}
		<ListItem>
			<a class="w-full no-underline" href={`#${id}`}>
				<span
					class="text-xs"
					class:text-primary={nonNullish(activeId) ? activeId === id : index === 0}>{text}</span
				>
			</a>
		</ListItem>
	{/each}
</List>
