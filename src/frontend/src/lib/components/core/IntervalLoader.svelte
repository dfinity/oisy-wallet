<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';

	interface Props {
		onLoad: () => Promise<void>;
		interval: number;
		skipInitialLoad?: boolean;
		children?: Snippet;
	}

	let { onLoad, interval, skipInitialLoad = false, children }: Props = $props();

	// A reference to the `onLoad` function that will be scheduled repeatedly.
	// We set this only after the initial load has finished, to avoid race conditions.
	let scheduledLoad = $state<typeof onLoad | undefined>();

	const startTimer = (): NodeJS.Timeout | undefined =>
		setInterval(async () => {
			await scheduledLoad?.();
		}, interval);

	const stopTimer = (timer: NodeJS.Timeout | undefined) => {
		if (isNullish(timer)) {
			return;
		}

		clearInterval(timer);
	};

	// Lifecycle: on component mount
	// 1. If `skipInitialLoad` is false, call `onLoad` once immediately.
	// 2. After the initial call completes, set `scheduledLoad` so it can run repeatedly.
	onMount(async () => {
		if (!skipInitialLoad) {
			await onLoad();
		}

		// Important: we only set `scheduledLoad` *after* the first `onLoad` call finishes.
		// If we set it earlier, the repeating timer could trigger another `onLoad`
		// before the first run has completed, causing overlapping executions.
		scheduledLoad = onLoad;
	});

	// We need a separate onMount here because the first onMount above is async.
	// An async `onMount` cannot return a clean-up function.
	// Using `onDestroy` directly would create a race condition:
	// - `onDestroy` does not wait for the async `onMount` above to finish.
	// - If the component unmounts quickly, the timer could be created after destroy ran,
	//   leaving an interval running with no clean-up.
	// By returning a clean-up function here, Svelte guarantees that the timer
	// will always be stopped after this mount finishes and only when the component unmounts.
	onMount(() => {
		const interval = startTimer();

		return () => stopTimer(interval);
	});
</script>

{@render children?.()}
