import { isNullish } from '@dfinity/utils';

interface CommonParams {
	sliderFrame: HTMLElement | undefined;
}

/**
 * A util for building carousel slider frame item.
 */
export const buildCarouselSliderFrameItem = ({
	slide,
	totalSlides
}: {
	slide: Node;
	totalSlides: number;
}): HTMLDivElement => {
	// Create slider frame item and apply styling
	const frameItem = document.createElement('div');
	frameItem.style.width = `${100 / totalSlides}%`;

	frameItem.appendChild(slide);

	return frameItem;
};

/**
 * A util for building carousel slider frame.
 */
export const buildCarouselSliderFrame = ({
	slides,
	slideWidth
}: {
	slides: Node[];
	slideWidth: number;
}): HTMLDivElement => {
	// We add the last slide as the first element to properly animate last-to-first slide transition.
	// The same applies to the last element - we use the first slide as the last item of the array.
	const extendedSlides = [slides[slides.length - 1], ...slides, slides[0]];
	const totalSlides = extendedSlides.length;

	// Create slider frame and apply styling
	const sliderFrame = document.createElement('div');
	sliderFrame.style.width = `${slideWidth * totalSlides}px`;
	sliderFrame.style.display = 'flex';

	extendedSlides.forEach((slide) => {
		sliderFrame.appendChild(
			buildCarouselSliderFrameItem({
				slide: slide.cloneNode(true),
				totalSlides
			})
		);
	});

	return sliderFrame;
};

/**
 * Disable transition for the provided slider frame.
 */
export const disableTransition = ({ sliderFrame }: CommonParams) => {
	if (isNullish(sliderFrame)) {
		return;
	}

	sliderFrame.style.transition = 'none';
};

/**
 * Enable transition for the provided slider frame.
 */
export const enableTransition = ({
	sliderFrame,
	duration,
	easing
}: { duration: number; easing: string } & CommonParams) => {
	if (isNullish(sliderFrame)) {
		return;
	}

	sliderFrame.style.transition = `all ${duration}ms ${easing}`;
};

/**
 * Update visible part of the provided slider frame.
 */
export const updateSliderFrameVisiblePart = ({
	animateTo,
	sliderFrame
}: { animateTo: number } & CommonParams): void => {
	if (isNullish(sliderFrame)) {
		return;
	}

	sliderFrame.style.transform = `translate3d(${animateTo}px, 0, 0)`;
};
