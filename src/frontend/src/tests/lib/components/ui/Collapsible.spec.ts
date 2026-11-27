import CollapsibleTest from '$tests/lib/components/ui/CollapsibleTest.svelte';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('Collapsible', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('toggles without submitting a surrounding form', async () => {
		const onSubmit = vi.fn();

		const { getByTestId } = render(CollapsibleTest, { props: { onSubmit } });

		const toggle = getByTestId('collapsible-expand-button');

		// A bare <button> defaults to type="submit". Inside a form, expanding a section would submit
		// it and run the browser's validation over fields the user has not reached yet.
		expect(toggle).toHaveAttribute('type', 'button');

		toggle.click();

		await waitFor(() => {
			expect(onSubmit).not.toHaveBeenCalled();
		});
	});

	it('resizes open content and stops observing it when collapsed', async () => {
		const observe = vi.fn();
		const disconnect = vi.fn();
		let onResize: (() => void) | undefined;

		vi.stubGlobal(
			'ResizeObserver',
			class {
				constructor(callback: () => void) {
					onResize = callback;
				}

				observe = observe;
				disconnect = disconnect;
			}
		);
		const measure = vi
			.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
			.mockReturnValue(new DOMRect(0, 0, 0, 60));
		const { getByTestId } = render(CollapsibleTest, { props: { onSubmit: vi.fn() } });
		const toggle = getByTestId('collapsible-header');
		const wrapper = getByTestId('collapsible-content');

		expect(observe).not.toHaveBeenCalled();

		await fireEvent.click(toggle);

		expect(observe).toHaveBeenCalledExactlyOnceWith(wrapper.firstElementChild);
		expect(wrapper).toHaveStyle({ maxHeight: '60px' });

		measure.mockReturnValue(new DOMRect(0, 0, 0, 120));
		onResize?.();

		await waitFor(() => expect(wrapper).toHaveStyle({ maxHeight: '120px' }));

		await fireEvent.click(toggle);

		expect(wrapper).toHaveStyle({ maxHeight: '0px' });
		expect(disconnect).toHaveBeenCalledOnce();
	});
});
