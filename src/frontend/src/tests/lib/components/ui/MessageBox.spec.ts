import MessageBox from '$lib/components/ui/MessageBox.svelte';
import en from '$tests/mocks/i18n.mock';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

describe('MessageBox', () => {
	const childrenSnippet = createRawSnippet(() => ({
		render: () => `<span data-tid="children">Hello World</span>`
	}));

	it('should render children content', () => {
		const { getByText } = render(MessageBox, {
			props: { children: childrenSnippet }
		});

		expect(getByText('Hello World')).toBeInTheDocument();
	});

	it('should render the default info icon when no custom icon is provided', () => {
		const { container } = render(MessageBox, {
			props: { children: childrenSnippet }
		});

		const iconWrapper = container.querySelector('div.min-w-5');

		expect(iconWrapper).toBeInTheDocument();
	});

	it('should render a custom icon snippet when provided', () => {
		const { queryByTestId } = render(MessageBox, {
			props: {
				children: childrenSnippet,
				icon: createMockSnippet('custom-icon')
			}
		});

		expect(queryByTestId('custom-icon')).toBeInTheDocument();
	});

	it('should not render the default icon when a custom icon is provided', () => {
		const { container } = render(MessageBox, {
			props: {
				children: childrenSnippet,
				icon: createMockSnippet('custom-icon')
			}
		});

		const defaultIconWrapper = container.querySelector('div.min-w-5');

		expect(defaultIconWrapper).not.toBeInTheDocument();
	});

	describe('level styling', () => {
		it('should apply info background by default', () => {
			const { container } = render(MessageBox, {
				props: { children: childrenSnippet }
			});

			const box = container.querySelector('.bg-brand-light');

			expect(box).toBeInTheDocument();
		});

		it.each([
			{ level: 'info', expectedClass: 'bg-brand-light' },
			{ level: 'warning', expectedClass: 'bg-warning-light' },
			{ level: 'error', expectedClass: 'bg-error-light' },
			{ level: 'success', expectedClass: 'bg-success-light' },
			{ level: 'plain', expectedClass: 'bg-primary' }
		] as const)('should apply $expectedClass for level "$level"', ({ level, expectedClass }) => {
			const { container } = render(MessageBox, {
				props: { children: childrenSnippet, level }
			});

			const box = container.querySelector(`.${expectedClass}`);

			expect(box).toBeInTheDocument();
		});
	});

	describe('close button', () => {
		it('should not render a close button when neither onDismiss nor closableKey is provided', () => {
			const { queryByRole } = render(MessageBox, {
				props: { children: childrenSnippet }
			});

			expect(queryByRole('button', { name: en.core.text.close })).not.toBeInTheDocument();
		});

		it('should render a close button when onDismiss is provided', () => {
			const { getByRole } = render(MessageBox, {
				props: { children: childrenSnippet, onDismiss: vi.fn() }
			});

			expect(getByRole('button', { name: en.core.text.close })).toBeInTheDocument();
		});

		it('should render a close button when closableKey is provided', () => {
			const { getByRole } = render(MessageBox, {
				props: { children: childrenSnippet, closableKey: 'oisy_ic_hide_bitcoin_info' }
			});

			expect(getByRole('button', { name: en.core.text.close })).toBeInTheDocument();
		});

		it('should hide the message box when the close button is clicked', async () => {
			const onDismiss = vi.fn();

			const { getByRole, queryByTestId } = render(MessageBox, {
				props: { children: childrenSnippet, testId: 'msg-box', onDismiss }
			});

			expect(queryByTestId('msg-box')).toBeInTheDocument();

			const closeButton = getByRole('button', { name: en.core.text.close });

			await fireEvent.click(closeButton);

			await waitFor(() => {
				expect(queryByTestId('msg-box')).not.toBeInTheDocument();
			});
		});

		it('should call onDismiss when the close button is clicked', async () => {
			const onDismiss = vi.fn();

			const { getByRole } = render(MessageBox, {
				props: { children: childrenSnippet, onDismiss }
			});

			const closeButton = getByRole('button', { name: en.core.text.close });

			await fireEvent.click(closeButton);

			expect(onDismiss).toHaveBeenCalledOnce();
		});

		it('should save to sessionStorage when closableKey is provided and close is clicked', async () => {
			const spySetItem = vi.spyOn(Storage.prototype, 'setItem');

			const { getByRole } = render(MessageBox, {
				props: {
					children: childrenSnippet,
					closableKey: 'oisy_ic_hide_transaction_unavailable_canister'
				}
			});

			const closeButton = getByRole('button', { name: en.core.text.close });

			await fireEvent.click(closeButton);

			expect(spySetItem).toHaveBeenCalledWith(
				'oisy_ic_hide_transaction_unavailable_canister',
				'true'
			);

			spySetItem.mockRestore();
		});

		it('should not be visible when closableKey was previously saved in sessionStorage', () => {
			vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('true');

			const { queryByTestId } = render(MessageBox, {
				props: {
					children: childrenSnippet,
					closableKey: 'oisy_ic_hide_transaction_unavailable_canister',
					testId: 'msg-box'
				}
			});

			expect(queryByTestId('msg-box')).not.toBeInTheDocument();

			vi.restoreAllMocks();
		});
	});

	describe('testId', () => {
		it('should set data-tid attribute when testId is provided', () => {
			const { queryByTestId } = render(MessageBox, {
				props: { children: childrenSnippet, testId: 'my-message' }
			});

			expect(queryByTestId('my-message')).toBeInTheDocument();
		});

		it('should not set data-tid attribute when testId is not provided', () => {
			const { container } = render(MessageBox, {
				props: { children: childrenSnippet }
			});

			const box = container.querySelector('.mb-4');

			assertNonNullish(box);

			expect(box.getAttribute('data-tid')).toBeNull();
		});
	});

	describe('styleClass', () => {
		it('should apply custom style class when provided', () => {
			const { container } = render(MessageBox, {
				props: { children: childrenSnippet, styleClass: 'my-custom-class' }
			});

			const box = container.querySelector('.my-custom-class');

			expect(box).toBeInTheDocument();
		});
	});
});
