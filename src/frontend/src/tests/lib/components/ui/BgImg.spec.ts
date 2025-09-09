import BgImg from '$lib/components/ui/BgImg.svelte';
import { render } from '@testing-library/svelte';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';

const IMG = 'https://example.com/pic.png';

describe('BgImg', () => {
	it('renders with aria-label and background image style', () => {
		const { getByLabelText } = render(BgImg, {
			imageUrl: IMG,
			ariaLabel: 'hero image',
			styleClass: 'rounded'
		});

		const el = getByLabelText('hero image');

		expect(el).toBeInTheDocument();
		expect(el).toHaveStyle(`background-image: url(${IMG})`);
		// default shadow is "inset"
		expect(el).toHaveStyle('box-shadow: inset 0px 0px 5px 1px #0000000D');
	});

	it('applies correct size classes (cover / contain / auto)', async () => {
		const { rerender, getByLabelText } = render(BgImg, {
			imageUrl: IMG,
			ariaLabel: 'sized',
			size: 'cover',
			styleClass: ''
		});
		let el = getByLabelText('sized');

		expect(el).toHaveClass('bg-cover');
		expect(el).not.toHaveClass('bg-contain');
		expect(el).not.toHaveClass('bg-auto');

		// contain
		await rerender({ imageUrl: IMG, ariaLabel: 'sized', size: 'contain', styleClass: '' });
		el = getByLabelText('sized');

		expect(el).toHaveClass('bg-contain');
		expect(el).not.toHaveClass('bg-cover');
		expect(el).not.toHaveClass('bg-auto');

		// auto (default too)
		await rerender({ imageUrl: IMG, ariaLabel: 'sized', size: 'auto', styleClass: '' });
		el = getByLabelText('sized');

		expect(el).toHaveClass('bg-auto');
		expect(el).not.toHaveClass('bg-cover');
		expect(el).not.toHaveClass('bg-contain');
	});

	it('shows loading styles when imageUrl is nullish', () => {
		const { getByLabelText } = render(BgImg, {
			ariaLabel: 'loading',
			imageUrl: undefined
		});

		const el = getByLabelText('loading');

		expect(el).toHaveClass('animate-pulse');
		expect(el).toHaveClass('bg-disabled-alt');
	});

	it('omits loading styles when imageUrl is provided', () => {
		const { getByLabelText } = render(BgImg, {
			ariaLabel: 'loaded',
			imageUrl: IMG
		});

		const el = getByLabelText('loaded');

		expect(el).not.toHaveClass('animate-pulse');
		expect(el).not.toHaveClass('bg-disabled-alt');
	});

	it('adds w-full / h-full when styleClass lacks width/height classes', () => {
		const { getByLabelText } = render(BgImg, {
			ariaLabel: 'auto-size',
			imageUrl: IMG,
			styleClass: 'rounded shadow'
		});

		const el = getByLabelText('auto-size');

		expect(el).toHaveClass('w-full');
		expect(el).toHaveClass('h-full');
	});

	it('does not add w-full if styleClass already contains a width class', () => {
		const { getByLabelText } = render(BgImg, {
			ariaLabel: 'fixed-width',
			imageUrl: IMG,
			styleClass: 'w-10 rounded'
		});

		const el = getByLabelText('fixed-width');

		expect(el).not.toHaveClass('w-full'); // because styleClass contains "w-"
		expect(el).toHaveClass('h-full'); // height fallback still applies
	});

	it('does not add h-full if styleClass already contains a height class', () => {
		const { getByLabelText } = render(BgImg, {
			ariaLabel: 'fixed-height',
			imageUrl: IMG,
			styleClass: 'h-20 rounded'
		});

		const el = getByLabelText('fixed-height');

		expect(el).toHaveClass('w-full'); // width fallback still applies
		expect(el).not.toHaveClass('h-full'); // because styleClass contains "h-"
	});

	it('renders children snippet content', () => {
		const { getByTestId } = render(BgImg, {
			ariaLabel: 'with-children',
			imageUrl: IMG,
			children: mockSnippet
		});

		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();
	});

	it('omits box-shadow when shadow="none"', () => {
		const { getByLabelText } = render(BgImg, {
			ariaLabel: 'no-shadow',
			imageUrl: IMG,
			shadow: 'none'
		});

		const el = getByLabelText('no-shadow');

		expect(el).not.toHaveStyle('box-shadow: inset 0px 0px 5px 1px #0000000D');
	});

	it('merges custom classes with base classes', () => {
		const { getByLabelText } = render(BgImg, {
			ariaLabel: 'classes',
			imageUrl: IMG,
			styleClass: 'rounded-xl p-2'
		});

		const el = getByLabelText('classes');

		expect(el).toHaveClass('flex', 'bg-center'); // base classes
		expect(el).toHaveClass('rounded-xl', 'p-2'); // custom classes
	});
});
