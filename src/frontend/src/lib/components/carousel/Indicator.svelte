<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let currentSlide: number;
	export let index: number;

	let isActive: boolean;
	$: isActive = currentSlide === index;
</script>

<button
	on:click
	aria-label={replacePlaceholders($i18n.carousel.text.indicator, { $index: `${index + 1}` })}
	class="{`${isActive ? 'w-7 bg-black' : 'w-4 bg-dust'} mr-1 h-1.5 transition-all duration-300 ease-linear last:mr-0`}}"
></button>
