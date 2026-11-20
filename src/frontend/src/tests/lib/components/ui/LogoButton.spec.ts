import LogoButton from '$lib/components/ui/LogoButton.svelte';
import type { Nullish } from '@dfinity/zod-schemas';
import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

describe('LogoButton', () => {
	// The row paints its hover and pressed fill on the wrapper around the button.
	const row = (container: HTMLElement): Nullish<HTMLElement> =>
		container.querySelector('button')?.parentElement;

	it('should darken the row at once while pressed when it has a click', () => {
		const { container } = render(LogoButton, { props: { onClick: vi.fn() } });

		expect(row(container)).toHaveClass(
			'child-pressed:bg-brand-subtle-20',
			'child-pressed:duration-0'
		);
	});

	it('should not show a pressed state when there is nothing to click', () => {
		const { container } = render(LogoButton, { props: {} });

		expect(row(container)).not.toHaveClass('child-pressed:bg-brand-subtle-20');
	});

	it('should hover by default', () => {
		const { container } = render(LogoButton, { props: { onClick: vi.fn() } });

		expect(row(container)).toHaveClass('hover:bg-brand-subtle-10');
	});

	it('should not hover when hover is off', () => {
		const { container } = render(LogoButton, { props: { onClick: vi.fn(), hover: false } });

		expect(row(container)).not.toHaveClass('hover:bg-brand-subtle-10');
	});

	describe('when disabled', () => {
		// A disabled button takes no click in a browser; jsdom still runs Svelte's delegated handler.
		it('should disable the button', () => {
			const { container } = render(LogoButton, { props: { onClick: vi.fn(), disabled: true } });

			expect(container.querySelector('button')).toBeDisabled();
		});

		it('should dim the row and show no hover or pressed fill', () => {
			const { container } = render(LogoButton, { props: { onClick: vi.fn(), disabled: true } });

			expect(row(container)).toHaveClass('opacity-50');
			expect(row(container)).not.toHaveClass('hover:bg-brand-subtle-10');
			expect(row(container)).not.toHaveClass('child-pressed:bg-brand-subtle-20');
		});
	});

	describe('with a title action', () => {
		const titleAction = createRawSnippet(() => ({
			render: () => '<button type="button">Tag</button>'
		}));

		const title = createRawSnippet(() => ({ render: () => '<span>USDT</span>' }));

		it('keeps the title action out of the row button', () => {
			const { getByRole } = render(LogoButton, {
				props: { onClick: vi.fn(), title, titleAction, testId: 'row' }
			});

			const rowButton = getByRole('button', { name: /USDT/ });

			expect(rowButton).not.toContainElement(getByRole('button', { name: 'Tag' }));
		});

		it('names the row button by its content', () => {
			const { getByTestId } = render(LogoButton, {
				props: { onClick: vi.fn(), title, titleAction, testId: 'row' }
			});

			expect(getByTestId('row')).toHaveAccessibleName(/USDT/);
		});

		it('opens the row only from the row button', async () => {
			const onClick = vi.fn();
			const onTag = vi.fn();
			const tag = createRawSnippet(() => ({
				render: () => '<button type="button">Tag</button>',
				setup: (node: Element) => {
					node.addEventListener('click', onTag);
				}
			}));

			const { getByRole, getByTestId } = render(LogoButton, {
				props: { onClick, title, titleAction: tag, testId: 'row' }
			});

			await fireEvent.click(getByRole('button', { name: 'Tag' }));

			expect(onTag).toHaveBeenCalledOnce();
			expect(onClick).not.toHaveBeenCalled();

			await fireEvent.click(getByTestId('row'));

			expect(onClick).toHaveBeenCalledOnce();
		});

		it('keeps the row fill on the wrapper of the row button', () => {
			const { getByTestId } = render(LogoButton, {
				props: { onClick: vi.fn(), title, titleAction, testId: 'row' }
			});

			expect(getByTestId('row').parentElement).toHaveClass('child-pressed:bg-brand-subtle-20');
		});
	});
});
