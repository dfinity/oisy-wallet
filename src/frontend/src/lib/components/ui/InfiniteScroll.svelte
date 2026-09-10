<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onDestroy, type Snippet, tick } from 'svelte';

	interface Props {
		/**
		 * Resolve `true` when the call made progress the list's height may not show, such as history
		 * loaded behind a filter, so the end of the list is checked again.
		 */
		onIntersect: () => Promise<void | boolean>;
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

	let busy = false;

	// The browser only reports a change of intersection, and `observe` on a target the observer
	// already holds is a no-op. So while the end of the list stays on screen, which on a tall window
	// is the case after revealing one more page, nothing is ever reported again and the list stops
	// until the user scrolls away and back. Disconnecting first makes the browser deliver a fresh
	// initial entry.
	const arm = () => {
		observer.disconnect();

		if (isNullish(intersectionTarget) || disabled) {
			return;
		}

		observer.observe(intersectionTarget);
	};

	const onIntersection = async (entries: IntersectionObserverEntry[]) => {
		const intersecting: IntersectionObserverEntry | undefined = entries.find(
			({ isIntersecting }: IntersectionObserverEntry) => isIntersecting
		);

		if (isNullish(intersecting) || busy) {
			return;
		}

		busy = true;

		const endBefore = intersectionTarget?.offsetTop;

		let progressed = false;

		try {
			progressed = (await onIntersect()) === true;
			await tick();
		} finally {
			busy = false;
		}

		// Re-armed only after progress: the end of the list moved, or the caller says it loaded more.
		// That keeps loading while there is more to show and the end is still on screen, and cannot
		// spin: a call that changed nothing is not asked again until the user scrolls or the list is
		// re-enabled.
		if (progressed || intersectionTarget?.offsetTop !== endBefore) {
			arm();
		}
	};

	// svelte-ignore state_referenced_locally
	const observer: IntersectionObserver = new IntersectionObserver(onIntersection, options);

	$effect(arm);

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
