import { toastsStore } from '$lib/stores/toasts.store';
import ToastsTest from '$tests/lib/components/ui/ToastsTest.svelte';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('Toasts', () => {
	beforeEach(() => {
		toastsStore.reset();
	});

	it('renders nothing when there are no toasts', () => {
		const { queryByTestId } = render(ToastsTest);

		expect(queryByTestId('toasts-component')).toBeNull();
	});

	it('renders a toast message', () => {
		toastsStore.show({ level: 'info', text: 'Hello toast' });

		const { getByTestId } = render(ToastsTest);

		expect(getByTestId('toasts-component')).toBeInTheDocument();
		expect(getByTestId('toast-message').textContent).toContain('Hello toast');
	});

	it('applies the error class when a toast is an error or warning', () => {
		toastsStore.show({ level: 'error', text: 'boom' });

		const { container } = render(ToastsTest);

		expect(container.querySelector('.wrapper')?.classList).toContain('error');
	});

	it('renders a toast per level with its icon', () => {
		(['success', 'warn', 'error', 'info'] as const).forEach((level) =>
			toastsStore.show({ level, text: level })
		);

		const { getAllByTestId, container } = render(ToastsTest);

		expect(getAllByTestId('toast-component')).toHaveLength(4);
		// each toast renders a level icon (svg) inside the .icon wrapper
		expect(container.querySelectorAll('.icon svg')).toHaveLength(4);
	});

	it('renders a spinner instead of an icon when requested', () => {
		toastsStore.show({ level: 'info', text: 'loading', spinner: true });

		const { container } = render(ToastsTest);

		expect(container.querySelector('[data-tid="spinner"]')).toBeInTheDocument();
	});

	it('renders a title and html content', () => {
		toastsStore.show({ level: 'info', text: '<b>bold</b>', title: 'A title', renderAsHtml: true });

		const { container } = render(ToastsTest);

		expect(container.querySelector('.title')?.textContent).toBe('A title');
		expect(container.querySelector('.msg b')?.textContent).toBe('bold');
	});

	it('filters by position', () => {
		toastsStore.show({ level: 'info', text: 'bottom one' });
		toastsStore.show({ level: 'info', text: 'top one', position: 'top' });

		const { getAllByTestId } = render(ToastsTest, { props: { position: 'bottom' } });

		const messages = getAllByTestId('toast-message');

		expect(messages).toHaveLength(1);
		expect(messages[0].textContent).toContain('bottom one');
	});

	it('caps the number of visible toasts with maxVisible', () => {
		toastsStore.show({ level: 'info', text: 'a' });
		toastsStore.show({ level: 'info', text: 'b' });
		toastsStore.show({ level: 'info', text: 'c' });

		const { getAllByTestId } = render(ToastsTest, { props: { maxVisible: 2 } });

		expect(getAllByTestId('toast-message')).toHaveLength(2);
	});

	it('hides the toast when the close button is clicked', async () => {
		toastsStore.show({ level: 'success', text: 'closable' });

		const { getByTestId } = render(ToastsTest);

		await fireEvent.click(getByTestId('close-button'));

		expect(get(toastsStore)).toHaveLength(0);
	});
});
