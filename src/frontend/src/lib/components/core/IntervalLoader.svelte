<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount, type Snippet } from 'svelte';

	interface Props {
		onLoad: () => Promise<void>;
		interval: number;
		skipInitialLoad?: boolean;
		children?: Snippet;
	}

	let { onLoad, interval, skipInitialLoad = false, children }: Props = $props();

	let timer = $state<NodeJS.Timeout | undefined>();

	let isDestroyed = $state(false);

	const run = async () => {
		if (isDestroyed) {
			stopTimer();

			return;
		}

		await onLoad();
	};

	const startTimer = async () => {
		if (isDestroyed) {
			return;
		}

		if (nonNullish(timer)) {
			return;
		}

		if (!skipInitialLoad) {
			await onLoad();
		}

		timer = setInterval(run, interval);
	};

	const stopTimer = () => {
		if (isNullish(timer)) {
			return;
		}

		clearInterval(timer);
		timer = undefined;
	};

	onMount(startTimer);

	onDestroy(() => {
		isDestroyed = true;

		stopTimer();
	});
</script>

{@render children?.()}
