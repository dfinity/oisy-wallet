<script lang="ts">
	import { IconWest, IconEast } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';

	export let onNextClick: () => void;
	export let onPreviousClick: () => void;

	const classes =
		'w-7 h-7 bg-white rounded-md shadow p-1 hover:text-blue-ribbon transition-colors duration-700';
</script>

<div class="flex w-[25%] items-center justify-center">
	<button
		aria-label={$i18n.carousel.text.prev_slide}
		class={`${classes} mr-1`}
		on:click={() => onPreviousClick()}
	>
		<IconWest />
	</button>
	<button
		aria-label={$i18n.carousel.text.next_slide}
		class={classes}
		on:click={() => onNextClick()}
	>
		<IconEast />
	</button>
</div>
