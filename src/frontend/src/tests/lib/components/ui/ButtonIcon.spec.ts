import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
import { createMockSnippet, mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('ButtonIcon', () => {
	const mockIconSnippetId = 'mockIconSnippet';
	const mockIconSnippet = createMockSnippet(mockIconSnippetId);

	const props = {
		onclick: vi.fn(),
		ariaLabel: 'test',
		icon: mockIconSnippet,
		children: mockSnippet
	};

	it('should render the icon snippet', () => {
		const { getByTestId } = render(ButtonIcon, { props });

		expect(getByTestId(mockIconSnippetId)).toBeInTheDocument();
		expect(getByTestId(mockIconSnippetId)).toBeVisible();
	});

	it('should render the children but visually hidden', () => {
		const { getByTestId } = render(ButtonIcon, { props });

		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();

		expect(getByTestId(mockSnippetTestId).parentElement).toHaveClass('visually-hidden');
	});

	describe('when the button is loading', () => {
		it('should render the loading spinner', () => {
			const { getByTestId } = render(ButtonIcon, { props: { ...props, loading: true } });

			expect(getByTestId('spinner')).toBeInTheDocument();
		});

		it('should be disabled', () => {
			const { getByRole } = render(ButtonIcon, { props: { ...props, loading: true } });

			expect(getByRole('button')).toBeDisabled();
		});

		it('should render the children but not visible', () => {
			const { getByTestId } = render(ButtonIcon, { props: { ...props, loading: true } });

			expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();
			expect(getByTestId(mockSnippetTestId).parentElement?.parentElement).toHaveClass('invisible');
		});

		it('should render the icon snippet but not visible', () => {
			const { getByTestId } = render(ButtonIcon, { props: { ...props, loading: true } });

			expect(getByTestId(mockIconSnippetId)).toBeInTheDocument();
			expect(getByTestId(mockIconSnippetId).parentElement).toHaveClass('invisible');
		});
	});
});
