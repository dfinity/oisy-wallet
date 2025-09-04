import FullscreenImgModal from '$lib/components/ui/FullscreenImgModal.svelte';
import { modalStore } from '$lib/stores/modal.store';
import { fireEvent, render } from '@testing-library/svelte';

describe('FullscreenImgModal', () => {
	const closeSpy = vi.spyOn(modalStore, 'close').mockImplementation(() => {});

	it('renders children inside the fullscreen modal container', () => {
		const { container } = render(FullscreenImgModal, {
			props: {
				imageSrc: 'test-image.png'
			}
		});

		const child = container.querySelector('img');

		expect(child).toBeInTheDocument();
	});

	it('shows the close icon in the top-right corner', () => {
		const { container } = render(FullscreenImgModal, {
			props: {
				imageSrc: 'test-image.png'
			}
		});

		const icon = container.querySelector('svg');

		expect(icon).toBeInTheDocument();
	});

	it('calls modalStore.close when backdrop is clicked', async () => {
		const { getByTestId } = render(FullscreenImgModal, {
			props: {
				imageSrc: 'test-image.png'
			}
		});

		const backdrop = getByTestId('backdrop');
		await fireEvent.click(backdrop);

		expect(closeSpy).toHaveBeenCalledTimes(1);
	});

	it('applies max size constraints to the fullscreen-modal container', () => {
		render(FullscreenImgModal, {
			props: {
				imageSrc: 'test-image.png'
			}
		});

		const container = document.querySelector('.fullscreen-modal');

		expect(container).toBeInTheDocument();
		expect(container).toHaveClass('max-h-[90vh]', 'max-w-[90vw]');
	});
});
