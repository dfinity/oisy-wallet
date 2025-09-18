<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { type Snippet, onDestroy, onMount, type Snippet } from 'svelte';

	interface Props {
		onLoad: () => Promise<void>;
		interval: number;
		skipInitialLoad?: boolean;
		children?: Snippet;
	}

	let { onLoad, interval, skipInitialLoad = false, children }: Props = $props();

	let timer: NodeJS.Timeout | undefined = undefined;

	const startTimer = async () => {
		if (nonNullish(timer)) {
			return;
		}

		if (!skipInitialLoad) {
			await onLoad();
		}

		timer = setInterval(onLoad, interval);
	};

	const stopTimer = () => {
		if (isNullish(timer)) {
			return;
		}

		clearInterval(timer);
		timer = undefined;
	};

	onMount(startTimer);

	onDestroy(stopTimer);
</script>

{@render children?.()}
