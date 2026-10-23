import Logo from '$lib/components/ui/Logo.svelte';
import { isIOS } from '$lib/utils/device.utils';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';

vi.mock('$lib/utils/device.utils', () => ({ isIOS: vi.fn(() => false) }));

describe('Logo', () => {
	const props = { src: '/logo.svg', alt: 'Provider', testId: 'logo' };

	beforeEach(() => {
		vi.mocked(isIOS).mockReturnValue(false);
	});

	it.each([false, true])('preserves default readiness styling (iOS: %s)', async (ios) => {
		vi.mocked(isIOS).mockReturnValue(ios);
		const { getByTestId } = render(Logo, { props });
		const logo = getByTestId(props.testId);
		const image = logo.querySelector('img');
		assertNonNullish(image);

		expect(image).toHaveAttribute('src', props.src);
		expect(image).toHaveAttribute('alt', props.alt);
		expect(image).toHaveAttribute('loading', 'lazy');
		expect(logo).toHaveClass('opacity-10', 'bg-off-white', 'rounded-full');
		expect(logo.classList.contains('transition-opacity')).toBe(!ios);
		expect(logo.classList.contains('ease-in')).toBe(!ios);

		await fireEvent.load(image);

		expect(logo).not.toHaveClass('opacity-10');
		expect(logo).not.toHaveClass('bg-off-white');
		expect(logo.classList.contains('transition-opacity')).toBe(!ios);
		expect(logo.classList.contains('ease-in')).toBe(!ios);
	});

	it('keeps the default fallback ready when no source is supplied', () => {
		const { getByTestId } = render(Logo, { props: { alt: props.alt, testId: props.testId } });
		const logo = getByTestId(props.testId);

		expect(logo.querySelector('img')).not.toBeInTheDocument();
		expect(logo.querySelector('svg')).toBeInTheDocument();
		expect(logo).not.toHaveClass('opacity-10');
		expect(logo).not.toHaveClass('bg-off-white');
	});

	it('keeps the default ready fallback after an image error', async () => {
		const { getByTestId } = render(Logo, { props });
		const logo = getByTestId(props.testId);
		const image = logo.querySelector('img');
		assertNonNullish(image);

		await fireEvent.error(image);

		expect(logo.querySelector('img')).not.toBeInTheDocument();
		expect(logo.querySelector('svg')).toBeInTheDocument();
		expect(logo).not.toHaveClass('opacity-10');
		expect(logo).not.toHaveClass('bg-off-white');
		expect(logo).toHaveClass('transition-opacity', 'ease-in');
	});

	it('passes an explicit eager loading policy to the shared image', () => {
		const { getByTestId } = render(Logo, { props: { ...props, loading: 'eager' } });

		expect(getByTestId(props.testId).querySelector('img')).toHaveAttribute('loading', 'eager');
	});

	it('lets a parent own visibility without a separate image-readiness fade', async () => {
		const { getByTestId } = render(Logo, { props: { ...props, animateReadiness: false } });
		const logo = getByTestId(props.testId);
		const image = logo.querySelector('img');
		assertNonNullish(image);

		for (const className of ['opacity-10', 'transition-opacity', 'ease-in']) {
			expect(logo).not.toHaveClass(className);
		}

		await fireEvent.load(image);

		for (const className of ['opacity-10', 'transition-opacity', 'ease-in', 'bg-off-white']) {
			expect(logo).not.toHaveClass(className);
		}

		expect(logo.querySelector('img')).toBe(image);
	});
});
