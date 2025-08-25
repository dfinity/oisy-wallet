import { buildCarouselSliderFrameItem, extendCarouselSliderFrame } from '$lib/utils/carousel.utils';

const slides = [
	document.createTextNode('Slide 1.'),
	document.createTextNode('Slide 2.'),
	document.createTextNode('Slide 3.'),
	document.createTextNode('Slide 4.')
];
const extendedSlides = [slides[slides.length - 1], ...slides, slides[0]];
const slideWidth = 300;

describe('extendCarouselSliderFrame', () => {
	it('puts correct amount of slides in the frame', () => {
		const sliderFrame = document.createElement('div');
		extendCarouselSliderFrame({
			sliderFrame,
			slides,
			slideWidth
		});

		expect(sliderFrame.children.length).toEqual(extendedSlides.length);
	});

	it('sets correct width to frame', () => {
		const sliderFrame = document.createElement('div');
		extendCarouselSliderFrame({
			sliderFrame,
			slides,
			slideWidth
		});

		expect(sliderFrame.style.width).toEqual(`${slideWidth * extendedSlides.length}px`);
	});
});

describe('buildCarouselSliderFrameItem', () => {
	it('sets correct width to frame item', () => {
		const frameItem = buildCarouselSliderFrameItem({
			slide: extendedSlides[0],
			totalSlides: extendedSlides.length
		});

		expect(frameItem.style.width).toEqual(`${100 / extendedSlides.length}%`);
	});
});
