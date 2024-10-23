<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import Controls from '$lib/components/carousel/Controls.svelte';
	import Indicators from '$lib/components/carousel/Indicators.svelte';
	import {
		updateSliderFrameVisiblePart,
		extendCarouselSliderFrame,
		disableTransition,
		enableTransition
	} from '$lib/utils/carousel.utils';

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

	/**
	 * Autoplay timer
	 */
	let autoplayTimer: NodeJS.Timeout | undefined = undefined;

	/**
	 * Slide transition timer that needed for last-to-first and first-to-last non-animated transform
	 */
	let slideTransformTimer: NodeJS.Timeout | undefined = undefined;

	/**
	 * A const to be used for enabling transition animation
	 */
	const animationParams = {
		easing,
		duration
	};

	/**
	 * Initialise all required data and attach/detach events
	 */
	onMount(() => {
		initializeCarousel();
		initialiseAutoplayTimer();

		// Resize listener to re-calculate slide frame width
		window.addEventListener('resize', onResize);

		return () => {
			clearAutoplayTimer();
			clearSlideTransformTimer();

			window.removeEventListener('resize', onResize);
		};
	});

	/**
	 * Build slider frame and set required variables
	 */
	const initializeCarousel = () => {
		if (isNullish(container) || isNullish(sliderFrame)) {
			return;
		}

		// Save this data only on mount
		if (isNullish(slides)) {
			slides = [...sliderFrame.children];
			totalSlides = slides.length;
		}

		containerWidth = container.offsetWidth;

		// Clean previous HTML if the frame is being re-built (e.g. in case of window resize)
		sliderFrame.innerHTML = '';

		extendCarouselSliderFrame({
			sliderFrame,
			slides,
			slideWidth: containerWidth
		});

		goToSlide(currentSlide);
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
		if (nonNullish(autoplayTimer)) {
			clearInterval(autoplayTimer);
			autoplayTimer = undefined;
		}
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
		if (nonNullish(slideTransformTimer)) {
			clearInterval(slideTransformTimer);
			slideTransformTimer = undefined;
		}
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

		enableTransition({ sliderFrame, ...animationParams });
		goToSlide(nextCurrentSlide);

		if (nextCurrentSlide >= totalSlides) {
			// Switch to the first slide without animation
			slideTransformTimer = setTimeout(() => {
				disableTransition({ sliderFrame });
				goToSlide(0);
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

		enableTransition({ sliderFrame, ...animationParams });
		goToSlide(nextCurrentSlide);

		if (nextCurrentSlide < 0) {
			// Switch to the last slide without animation
			slideTransformTimer = setTimeout(() => {
				disableTransition({ sliderFrame });
				goToSlide(totalSlides - 1);
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
		enableTransition({ sliderFrame, ...animationParams });
		goToSlide(nextSlideIndex);
	};

	/**
	 * Switch to the provided slide
	 */
	const goToSlide = (nextSlideIndex: number) => {
		currentSlide = nextSlideIndex;

		// We add +1 here to scroll frame to the end of the current slide
		const offset = (currentSlide + 1) * containerWidth;
		updateSliderFrameVisiblePart({ sliderFrame, animateTo: -offset });
	};
</script>

<div class={`${styleClass ?? ''} relative overflow-hidden rounded-3xl bg-white p-4 pb-16 shadow`}>
	<div class="w-full overflow-hidden" bind:this={container}>
		<div class="flex" bind:this={sliderFrame}>
			<slot></slot>
		</div>
	</div>
	<div class="absolute bottom-4 left-0 flex w-full justify-center">
		<Indicators {onIndicatorClick} {totalSlides} {currentSlide} />
		<Controls {onNext} {onPrevious} />
	</div>
</div>
