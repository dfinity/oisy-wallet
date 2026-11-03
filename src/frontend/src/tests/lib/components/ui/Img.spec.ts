import Img from '$lib/components/ui/Img.svelte';
import { render } from '@testing-library/svelte';

describe('Img', () => {
	it('keeps existing callers lazy by default', () => {
		const { getByRole } = render(Img, { props: { src: '/preview.webp' } });

		expect(getByRole('presentation')).toHaveAttribute('loading', 'lazy');
	});

	it('supports eager artwork with intrinsic dimensions and an accessible name', () => {
		const { getByRole } = render(Img, {
			props: {
				src: '/preview.webp',
				loading: 'eager',
				role: 'img',
				alt: 'Wallet preview',
				width: '2160',
				height: '1504'
			}
		});
		const image = getByRole('img', { name: 'Wallet preview' });

		expect(image).toHaveAttribute('loading', 'eager');
		expect(image).toHaveAttribute('width', '2160');
		expect(image).toHaveAttribute('height', '1504');
	});
});
