<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';

	interface Props {
		text: string;
	}

	const { text }: Props = $props();

	type HeadingType = {
		title: string;
		id: string;
	};

	let headings: HeadingType[] = $state([]);
	let activeId: string | undefined = $state();

	// Extract ### headings and assign IDs
	onMount(() => {
		const lines = text.split('\n');
		headings = lines.reduce<HeadingType[]>((acc, line) => {
			if (!line.startsWith('###')) return acc;

			const title = line
				.replace(/^###\s*/, '')
				.replace(/\\/g, '')
				.trim();
			const id = title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-') // slug
				.replace(/^-+|-+$/g, ''); // trim hyphens

			acc = [...acc, { id, title }];
			return acc;
		}, []);

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
			const el = document.getElementById(id);
			if (el) {
				observer.observe(el);
			}
		});
	});
</script>

<div class="fixed right-12 top-10 hidden rounded-2xl bg-primary py-2 xl:block 1.5lg:top-28">
	<List condensed styleClass="pr-3">
		{#each headings as { id, title }, index (id)}
			<ListItem>
				<a href={`#${id}`} class="w-full no-underline">
					<span
						class:text-primary={nonNullish(activeId) ? activeId === id : index === 0}
						class="text-xs">{title}</span
					>
				</a>
			</ListItem>
		{/each}
	</List>
</div>
