import Popover from '$lib/components/ui/Popover.svelte';
import PopoverTest from '$tests/lib/components/ui/PopoverTest.svelte';
import { render, waitFor } from '@testing-library/svelte';

describe('Popover', () => {
	it('should be closed by default', () => {
		const { getByRole } = render(Popover);

		expect(() => getByRole('dialog')).toThrow();
	});

	it('should be visible', async () => {
		const { getByRole } = render(Popover, { props: { visible: true } });

		await waitFor(() => expect(getByRole('dialog')).not.toBeNull());
	});

	it('should render a backdrop', () => {
		const { container } = render(Popover, { props: { visible: true } });

		const backdrop = container.querySelector('div.backdrop');

		expect(backdrop).not.toBeNull();
		expect(backdrop?.classList).toContain('visible');
	});

	it('should render a backdrop invisible', () => {
		const { container } = render(Popover, {
			props: { visible: true, invisibleBackdrop: true }
		});

		const backdrop = container.querySelector('div.backdrop');

		expect(backdrop).not.toBeNull();
		expect(backdrop?.classList).not.toContain('visible');
	});

	it('should render slotted content', () => {
		const { getByTestId } = render(PopoverTest);

		expect(getByTestId('popover-slot')).not.toBeNull();
	});

	it('should render direction classes', () => {
		const { container } = render(Popover, {
			props: { visible: true, direction: 'rtl' }
		});

		expect(container.querySelector('.rtl')).not.toBeNull();
	});

	it('opens below its anchor unless told otherwise', () => {
		// Every popover in the app relied on this before `placement` existed, so
		// the default must stay exactly where it was.
		const { container } = render(Popover, { props: { visible: true } });

		expect(container.querySelector('.wrapper')).not.toBeNull();
		expect(container.querySelector('.wrapper.above')).toBeNull();
	});

	it('opens above its anchor when asked', () => {
		// For anchors pinned to the bottom of the viewport, such as the footer's
		// More menu, where a panel opened downward would have nowhere to go.
		const { container } = render(Popover, { props: { visible: true, placement: 'above' } });

		expect(container.querySelector('.wrapper.above')).not.toBeNull();
	});

	it('keeps the browser focus ring off the panel', () => {
		const { container } = render(Popover, { props: { visible: true } });

		expect(container.querySelector('.wrapper')).toHaveClass('outline-none');
	});

	it('exposes the anchor distance an upward panel is positioned by', () => {
		const { container } = render(Popover, { props: { visible: true, placement: 'above' } });

		const style = container.querySelector<HTMLElement>('.popover')?.getAttribute('style') ?? '';

		expect(style).toContain('--popover-bottom:');
	});

	it('should render the content container', () => {
		const { container } = render(Popover, { props: { visible: true } });

		expect(container.querySelector('.popover-content')).not.toBeNull();
	});

	it('should render the close button only when requested', async () => {
		const { rerender, container } = render(Popover, { props: { visible: true } });

		expect(container.querySelector('button.close')).toBeNull();

		await rerender({ visible: true, closeButton: true });

		expect(container.querySelector('button.close')).not.toBeNull();
	});

	it('lays out a dropdown when asked, and a menu by default', async () => {
		const { container, rerender } = render(Popover, { props: { visible: true } });

		expect(container.querySelector('.wrapper.dropdown')).toBeNull();

		await rerender({ visible: true, dropdown: true });

		expect(container.querySelector('.wrapper.dropdown')).not.toBeNull();
	});
});
