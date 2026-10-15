import Button from '$lib/components/ui/Button.svelte';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('Button', () => {
	const props = {
		children: mockSnippet
	};

	it('should render the children', () => {
		const { getByTestId } = render(Button, { props });

		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();
	});

	it('keeps children mounted through loading', async () => {
		const { getByTestId, getByRole, queryByTestId, rerender } = render(Button, { props });
		const child = getByTestId(mockSnippetTestId);

		await rerender({ ...props, loading: true });

		expect(getByTestId(mockSnippetTestId)).toBe(child);
		expect(child.parentElement).toHaveClass('invisible');
		expect(getByTestId('spinner')).toBeInTheDocument();
		expect(getByRole('button')).toBeDisabled();

		await rerender({ ...props, loading: false });

		expect(getByTestId(mockSnippetTestId)).toBe(child);
		expect(child.parentElement).toHaveClass('contents');
		expect(child.parentElement).not.toHaveClass('invisible');
		expect(queryByTestId('spinner')).toBeNull();
		expect(getByRole('button')).toBeEnabled();
	});

	describe('static prop', () => {
		it('should press by default', () => {
			const { getByRole } = render(Button, { props });

			expect(getByRole('button')).not.toHaveClass('no-press');
		});

		it('should opt out of the press shrink', () => {
			const { getByRole } = render(Button, { props: { ...props, static: true } });

			expect(getByRole('button')).toHaveClass('no-press');
		});
	});
});
