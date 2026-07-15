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

	describe('expanded prop', () => {
		it('should not emit aria-expanded nor the opened class when expanded is undefined', () => {
			const { getByRole } = render(ButtonIcon, { props });

			const button = getByRole('button');

			expect(button).not.toHaveClass('opened');
			expect(button).not.toHaveAttribute('aria-expanded');
		});

		it('should mark the button as collapsed when expanded is false', () => {
			const { getByRole } = render(ButtonIcon, { props: { ...props, expanded: false } });

			const button = getByRole('button');

			expect(button).not.toHaveClass('opened');
			expect(button).toHaveAttribute('aria-expanded', 'false');
		});

		it('should mark the button as opened', () => {
			const { getByRole } = render(ButtonIcon, { props: { ...props, expanded: true } });

			const button = getByRole('button');

			expect(button).toHaveClass('opened');
			expect(button).toHaveAttribute('aria-expanded', 'true');
		});
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
