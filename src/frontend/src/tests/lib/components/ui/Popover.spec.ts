import Popover from '$lib/components/ui/Popover.svelte';
import PopoverTest from '$tests/lib/components/ui/PopoverTest.svelte';
import { render, waitFor } from '@testing-library/svelte';

describe('Popover', () => {
	it('should be closed by default', () => {
		const { getByRole } = render(Popover);

		expect(() => getByRole('menu')).toThrow();
	});

	it('should be visible', async () => {
		const { getByRole } = render(Popover, { props: { visible: true } });

		await waitFor(() => expect(getByRole('menu')).not.toBeNull());
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
});
