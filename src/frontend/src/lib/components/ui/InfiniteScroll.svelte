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

	// Svelte workaround: beforeUpdate is called twice when bindings are used -> https://github.com/sveltejs/svelte/issues/6016
	let skipContainerNextUpdate = false;

	// We disconnect previous observer before any update. We do want to trigger an intersection in case of layout shifting.
	$effect.pre(() => {
		if (!skipContainerNextUpdate) {
			observer.disconnect();
		}

		skipContainerNextUpdate = isNullish(intersectionTarget);
	});

	$effect(() => {
		// The DOM has been updated. We reset the observer to the current last HTML element of the infinite list.

		// If no element to observe
		if (isNullish(intersectionTarget)) {
			return;
		}

		// If the infinite scroll is disabled, no observation should happen
		if (disabled) {
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
