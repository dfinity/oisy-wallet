<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount, type Snippet } from 'svelte';

	interface Props {
		load: () => Promise<void>;
		interval: number;
		children?: Snippet;
	}

	let { load, interval, children }: Props = $props();

	let timer: NodeJS.Timeout | undefined = undefined;

	const startTimer = async () => {
		if (nonNullish(timer)) {
			return;
		}

		await load();

		timer = setInterval(load, interval);
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
