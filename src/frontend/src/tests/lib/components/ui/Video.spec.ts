import Video from '$lib/components/ui/Video.svelte';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('Video', () => {
	const mockSource = 'https://www.w3schools.com/html/mov_bbb.mp4';

	const props = {
		src: mockSource
	};

	it('should render a video with the correct source', () => {
		const { container } = render(Video, {
			props
		});

		expect(container.querySelector('video')).toBeInTheDocument();
		expect(container.querySelector('source')?.getAttribute('src')).toBe(mockSource);
	});

	it('should trigger the callback on error', async () => {
		const mockOnError = vi.fn();

		const { container } = render(Video, {
			props: {
				...props,
				onError: mockOnError
			}
		});

		const videoElement = container.querySelector('video');

		assertNonNullish(videoElement);

		// Simulate an error event
		videoElement.dispatchEvent(new Event('error'));

		expect(mockOnError).toHaveBeenCalledOnce();
	});

	it('should trigger the call back when loading data', async () => {
		const mockOnLoading = vi.fn();

		const { container } = render(Video, {
			props: {
				...props,
				onLoad: mockOnLoading
			}
		});

		const videoElement = container.querySelector('video');

		assertNonNullish(videoElement);

		// Simulate a loading event
		videoElement.dispatchEvent(new Event('loadeddata'));

		expect(mockOnLoading).toHaveBeenCalledOnce();
	});

	it('should be accessible', async () => {
		const mockAriaLabel = 'Sample video';

		const { container } = render(Video, {
			props: {
				...props,
				ariaLabel: mockAriaLabel
			}
		});

		const videoElement = container.querySelector('video');

		assertNonNullish(videoElement);

		expect(videoElement.getAttribute('aria-label')).toBe(mockAriaLabel);
	});
});
