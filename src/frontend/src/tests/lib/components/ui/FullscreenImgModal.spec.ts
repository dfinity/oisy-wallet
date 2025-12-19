import FullscreenImgModal from '$lib/components/ui/FullscreenImgModal.svelte';
import { MediaType } from '$lib/enums/media-type';
import { extractMediaTypeAndSize } from '$lib/services/url.services';
import { modalStore } from '$lib/stores/modal.store';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

vi.mock('$lib/services/url.services', () => ({
	extractMediaTypeAndSize: vi.fn()
}));

describe('FullscreenImgModal', () => {
	const closeSpy = vi.spyOn(modalStore, 'close').mockImplementation(() => {});

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(extractMediaTypeAndSize).mockResolvedValue({ type: null, size: null });
	});

	it('renders image children inside the fullscreen modal container', async () => {
		vi.mocked(extractMediaTypeAndSize).mockResolvedValue({ type: MediaType.Img, size: null });

		const { container } = render(FullscreenImgModal, {
			props: {
				imageSrc: 'https://www.example.com/test-image.png'
			}
		});

		await waitFor(() => {
			const child: HTMLImageElement | null = container.querySelector('img');

			assertNonNullish(child);

			expect(child.getAttribute('src')).toBe('https://www.example.com/test-image.png');
		});
	});

	it('renders video children inside the fullscreen modal container', async () => {
		vi.mocked(extractMediaTypeAndSize).mockResolvedValue({ type: MediaType.Video, size: null });

		const { container } = render(FullscreenImgModal, {
			props: {
				imageSrc: 'https://www.example.com/test-video.mp4'
			}
		});

		await waitFor(() => {
			expect(container.querySelector('video')).toBeInTheDocument();
			expect(container.querySelector('source')?.getAttribute('src')).toBe(
				'https://www.example.com/test-video.mp4'
			);
		});
	});

	it('shows the close icon in the top-right corner', () => {
		const { container } = render(FullscreenImgModal, {
			props: {
				imageSrc: 'https://www.example.com/test-image.png'
			}
		});

		const icon = container.querySelector('svg');

		expect(icon).toBeInTheDocument();
	});

	it('calls modalStore.close when backdrop is clicked', async () => {
		const { getByTestId } = render(FullscreenImgModal, {
			props: {
				imageSrc: 'https://www.example.com/test-image.png'
			}
		});

		const backdrop = getByTestId('backdrop');
		await fireEvent.click(backdrop);

		expect(closeSpy).toHaveBeenCalledOnce();
	});

	it('applies max size constraints to the fullscreen-modal container', async () => {
		render(FullscreenImgModal, {
			props: {
				imageSrc: 'https://www.example.com/test-image.png'
			}
		});

		await waitFor(() => {
			const container = document.querySelector('img');

			expect(container).toBeInTheDocument();
			expect(container).toHaveClass('max-h-[90dvh]', 'max-w-[90dvw]');
		});
	});
});
