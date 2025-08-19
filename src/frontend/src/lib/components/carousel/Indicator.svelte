<script lang="ts">
	import { fade } from 'svelte/transition';
	import { CAROUSEL_SLIDE_NAVIGATION } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let currentSlide: number;
	export let index: number;
	export let totalSlides: number;

	let isActive: boolean;
	$: isActive =
		currentSlide === index ||
		// set the last indicator as active on last-to-first transition
		// -1 is reserved for temporary appearance of the last slide on the first-to-last transition
		(index === totalSlides - 1 && currentSlide < 0) ||
		// set the first indicator as active on first-to-last transition
		// totalSlides + 1 is reserved for temporary appearance of the first slide on the last-to-first transition
		(index === 0 && currentSlide >= totalSlides);
</script>

<button
	class="{`${isActive ? 'w-7 bg-primary-inverted' : 'w-4 bg-disabled'} mr-1 h-1.5 transition-all duration-300 ease-linear last:mr-0`}}"
	aria-label={replacePlaceholders($i18n.carousel.text.indicator, { $index: `${index + 1}` })}
	data-tid={`${CAROUSEL_SLIDE_NAVIGATION}${index + 1}`}
	on:click
	out:fade
></button>
