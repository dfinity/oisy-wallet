import Video from '$lib/components/ui/Video.svelte';
import en from '$tests/mocks/i18n.mock';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';

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

	it('should render the fallback string if the video fails to load', async () => {
		const { container, getByText } = render(Video, {
			props
		});

		const video = container.querySelector('video');

		expect(video).not.toBeNull();

		await fireEvent.error(video as HTMLVideoElement);

		expect(getByText(en.core.warning.video_not_supported)).toBeTruthy();
	});

	it('should render the fallback snippet if the video fails to load', async () => {
		const { container, getByTestId } = render(Video, {
			props: {
				...props,
				fallback: mockSnippet
			}
		});

		const video = container.querySelector('video');

		expect(video).not.toBeNull();

		await fireEvent.error(video as HTMLVideoElement);

		expect(getByTestId(mockSnippetTestId)).toBeTruthy();
	});

	it('should trigger the callback on error', () => {
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

	it('should trigger the call back when loading data', () => {
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

	it('should be accessible', () => {
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
