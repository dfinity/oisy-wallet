<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import Controls from '$lib/components/carousel/Controls.svelte';
	import Indicators from '$lib/components/carousel/Indicators.svelte';
	import { moveSlider, extendCarouselSliderFrame } from '$lib/utils/carousel.utils';

	export let autoplay = 5000;
	export let duration = 300;
	export let easing = 'ease-out';
	export let styleClass: string | undefined = undefined;

	/**
	 * Carousel container element variables
	 */
	let container: HTMLDivElement | undefined;
	let containerWidth = 0;

	/**
	 * Computed slider frame element that wraps all slides
	 */
	let sliderFrame: HTMLDivElement | undefined;

	/**
	 * Variables related to the slides
	 */
	let slides: Node[];
	let currentSlide = 0;
	let totalSlides: number;
	$: totalSlides = slides?.length ?? 0;

	/**
	 * Autoplay timer
	 */
	let autoplayTimer: NodeJS.Timeout | undefined = undefined;

	/**
	 * Slide transition timer that needed for last-to-first and first-to-last non-animated transform
	 */
	let slideTransformTimer: NodeJS.Timeout | undefined = undefined;

	/**
	 * Initialise all required data
	 */
	onMount(() => {
		initializeSlides();
		initializeCarousel();

		return () => {
			clearTimers();
		};
	});

	/**
	 * Initialise slides-related vars on component mount and window resize
	 * Note: the component needs to be adjusted in case it has to handle dynamic change of slides
	 */
	const initializeSlides = () => {
		if (isNullish(sliderFrame)) {
			return;
		}

		slides = [...sliderFrame.children];
	};

	/**
	 * Clear all timers
	 */
	const clearTimers = () => {
		clearAutoplayTimer();
		clearSlideTransformTimer();
	};

	/**
	 * Build slider frame and set required variables
	 */
	const initializeCarousel = () => {
		if (isNullish(container) || isNullish(sliderFrame)) {
			return;
		}

		containerWidth = container.offsetWidth;

		// Clear timers and stop further initialisation in case container is rendered but not visible (e.g. display: none)
		if (containerWidth === 0) {
			clearTimers();
			return;
		}

		// Clean previous HTML if the frame is being re-built (e.g. in case of window resize)
		sliderFrame.innerHTML = '';

		extendCarouselSliderFrame({
			sliderFrame,
			slides,
			slideWidth: containerWidth
		});

		if (nonNullish(sliderFrame.children)) {
			goToSlide({
				slide: currentSlide
			});

			// Start autoplay timer if it is not running
			if (isNullish(autoplayTimer)) {
				initialiseAutoplayTimer();
			}
		}
	};

	/**
	 * Start autoplay timer
	 */
	const initialiseAutoplayTimer = () => {
		autoplayTimer = setInterval(() => {
			goToNextSlide();
		}, autoplay);
	};

	/**
	 * Clear autoplay timer
	 */
	const clearAutoplayTimer = () => {
		clearInterval(autoplayTimer);
		autoplayTimer = undefined;
	};

	/**
	 * Reset autoplay timer
	 */
	const resetAutoplayTimer = () => {
		clearAutoplayTimer();
		initialiseAutoplayTimer();
	};

	/**
	 * Clear slide transform timer
	 */
	const clearSlideTransformTimer = () => {
		clearInterval(slideTransformTimer);
		slideTransformTimer = undefined;
	};

	/**
	 * Re-initialize carousel on resize
	 */
	const onResize = () => {
		initializeCarousel();
	};

	/**
	 * Switch to the next slide
	 */
	const goToNextSlide = () => {
		const nextCurrentSlide = currentSlide + 1;

		goToSlide({
			slide: nextCurrentSlide
		});

		if (nextCurrentSlide >= totalSlides) {
			// Switch to the first slide without animation
			slideTransformTimer = setTimeout(() => {
				goToSlide({ slide: 0, withTransition: false });
			}, duration);
		}
	};

	/**
	 * Reset the autoplay timer and call goToNextSlide
	 */
	const onNext = () => {
		// Do not do anything if last-to-first element transition is on
		if (currentSlide > totalSlides + 1) {
			return;
		}

		resetAutoplayTimer();
		goToNextSlide();
	};

	/**
	 * Switch to the previous slide
	 */
	const goToPreviousSlide = () => {
		const nextCurrentSlide = currentSlide - 1;

		goToSlide({
			slide: nextCurrentSlide
		});

		if (nextCurrentSlide < 0) {
			// Switch to the last slide without animation
			slideTransformTimer = setTimeout(() => {
				goToSlide({
					slide: totalSlides - 1,
					withTransition: false
				});
			}, duration);
		}
	};

	/**
	 * Reset the autoplay timer and call goToPreviousSlide
	 */
	const onPrevious = () => {
		// Do not do anything if first-to-last element transition is on
		if (currentSlide < -1) {
			return;
		}

		resetAutoplayTimer();
		goToPreviousSlide();
	};

	/**
	 * Reset the autoplay timer and go to provided slide index
	 */
	const onIndicatorClick = (nextSlideIndex: number) => {
		resetAutoplayTimer();
		goToSlide({ slide: nextSlideIndex });
	};

	/**
	 * Switch to the provided slide
	 */
	const goToSlide = ({
		slide,
		withTransition = true
	}: {
		slide: number;
		withTransition?: boolean;
	}) => {
		currentSlide = slide;

		// We add +1 here to scroll frame to the end of the current slide
		const offset = (currentSlide + 1) * containerWidth;
		moveSlider({ sliderFrame, animateTo: -offset, withTransition, duration, easing });
	};
</script>

<!-- Resize listener to re-calculate slide frame width -->
<svelte:window on:resize={onResize} />

<div
	class={`${styleClass ?? ''} relative overflow-hidden rounded-3xl bg-white px-3 pb-14 pt-3 shadow`}
>
	<div class="w-full overflow-hidden" bind:this={container}>
		<div class="flex" bind:this={sliderFrame}>
			<slot />
		</div>
	</div>
	<div class="absolute bottom-3 left-0 flex w-full justify-center">
		<Indicators {onIndicatorClick} {totalSlides} {currentSlide} />
		<Controls {onNext} {onPrevious} />
	</div>
</div>
