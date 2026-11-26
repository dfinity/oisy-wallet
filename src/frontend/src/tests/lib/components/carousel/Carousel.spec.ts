import { CAROUSEL_CONTAINER } from '$lib/constants/test-ids.constants';
import CarouselTestHost from '$tests/lib/components/carousel/CarouselTestHost.svelte';
import { render } from '@testing-library/svelte';

describe('Carousel', () => {
	it('keeps the bottom padding for the controls when there are several slides', () => {
		const { getByTestId } = render(CarouselTestHost, { props: { count: 2 } });

		const container = getByTestId(CAROUSEL_CONTAINER);

		expect(container).toHaveClass('pb-10');
		expect(container).not.toHaveClass('pb-3');
	});

	it('only uses the small bottom padding when there is a single slide', () => {
		// With both classes on the element, `pb-10` wins in the built CSS and the
		// card keeps an empty band where the hidden controls would be.
		const { getByTestId } = render(CarouselTestHost, { props: { count: 1 } });

		const container = getByTestId(CAROUSEL_CONTAINER);

		expect(container).toHaveClass('pb-3');
		expect(container).not.toHaveClass('pb-10');
	});
});
