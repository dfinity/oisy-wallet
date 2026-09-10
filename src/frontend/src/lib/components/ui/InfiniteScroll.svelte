<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onDestroy, type Snippet } from 'svelte';

	interface Props {
		onIntersect: () => Promise<void>;
		disabled?: boolean;
		testId?: string;
		options?: IntersectionObserverInit;
		children: Snippet;
	}

	let {
		onIntersect,
		disabled = false,
		testId,
		options = {
			rootMargin: '300px',
			threshold: 0
		},
		children
	}: Props = $props();

	let intersectionTarget: HTMLDivElement | undefined;

	const onIntersection = async (entries: IntersectionObserverEntry[]) => {
		const intersecting: IntersectionObserverEntry | undefined = entries.find(
			({ isIntersecting }: IntersectionObserverEntry) => isIntersecting
		);

		if (isNullish(intersecting)) {
			return;
		}

		await onIntersect();
	};

	// svelte-ignore state_referenced_locally
	const observer: IntersectionObserver = new IntersectionObserver(onIntersection, options);

	// Re-armed from scratch on every change rather than only re-observed: `observe` on a target the
	// observer already holds is a no-op, so an intersection that never ended is never reported again.
	// A list re-enabled while its end sat on screen (a fetch that came back empty, then new rows
	// arriving) therefore stopped loading until the user scrolled away and back. Disconnecting first
	// makes the browser deliver a fresh initial entry.
	$effect(() => {
		observer.disconnect();

		if (isNullish(intersectionTarget) || disabled) {
			return;
		}

		observer.observe(intersectionTarget);
	});

	onDestroy(() => observer.disconnect());
</script>

<ul data-tid={testId}>
	{@render children()}
</ul>

<div bind:this={intersectionTarget} class="intersection-observer-target"></div>

<style lang="scss">
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.intersection-observer-target {
		width: 0;
		height: 0;
		opacity: 0;
		visibility: hidden;
	}
</style>
