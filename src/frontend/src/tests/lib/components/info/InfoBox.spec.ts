import InfoBox from '$lib/components/info/InfoBox.svelte';
import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
import { assertNonNullish } from '@dfinity/utils';
import { render, waitFor } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

describe('InfoBox', () => {
	const children = createRawSnippet(() => ({
		render: () => `<span data-tid="info-box-children">Hello World</span>`
	}));

	const renderVisible = () =>
		render(InfoBox, {
			props: { hideInfo: false, children, onClick: vi.fn() }
		});

	const getBox = (container: HTMLElement): HTMLElement | null =>
		container.querySelector('div.relative');

	it('should render children content', () => {
		const { getByText } = renderVisible();

		expect(getByText('Hello World')).toBeInTheDocument();
	});

	it('should not render anything when info is hidden', () => {
		const { queryByTestId } = render(InfoBox, {
			props: { hideInfo: true, children, onClick: vi.fn() }
		});

		expect(queryByTestId('info-box-children')).not.toBeInTheDocument();
	});

	describe('slide transition', () => {
		it('should stay mounted and animate while sliding out', async () => {
			const { container, rerender } = renderVisible();

			await rerender({ hideInfo: true, children, onClick: vi.fn() });

			// `overflow: hidden` is the inline style Svelte's slide sets for the duration of the
			// transition, so its presence proves the box animates out instead of vanishing.
			await waitFor(() => {
				const box = getBox(container);

				assertNonNullish(box);

				expect(box.style.overflow).toBe('hidden');
			});
		});

		it('should be removed within the shared slide duration', async () => {
			const { container, rerender } = renderVisible();

			await rerender({ hideInfo: true, children, onClick: vi.fn() });

			const { duration } = SLIDE_PARAMS;

			assertNonNullish(duration);

			await waitFor(
				() => {
					expect(getBox(container)).not.toBeInTheDocument();
				},
				{ timeout: duration + 100 }
			);
		});
	});
});
