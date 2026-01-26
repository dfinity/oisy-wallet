import Responsive from '$lib/components/ui/Responsive.svelte';
import { screensStore } from '$lib/stores/screens.store';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

describe('Responsive', () => {
	const baseProps = {
		children: mockSnippet
	};

	it('should render the children by default', async () => {
		const { getByTestId } = render(Responsive, {
			props: baseProps
		});

		screensStore.set('xs');

		await tick();

		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();

		screensStore.set('md');

		await tick();

		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();

		screensStore.set('lg');

		await tick();

		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();

		screensStore.set('2.5xl');

		await tick();

		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();
	});

	it('should render the children if the screen size is in range', async () => {
		const { getByTestId, queryByTestId } = render(Responsive, {
			props: { ...baseProps, up: 'md', down: 'lg' }
		});

		screensStore.set('md');

		await tick();

		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();

		screensStore.set('xs');

		await tick();

		expect(queryByTestId(mockSnippetTestId)).not.toBeInTheDocument();
	});

	it('should render only up to the upper-bound limit', async () => {
		const { getByTestId, queryByTestId } = render(Responsive, {
			props: { ...baseProps, down: 'lg' }
		});

		screensStore.set('xs');

		await tick();

		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();

		screensStore.set('lg');

		await tick();

		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();

		screensStore.set('2.5xl');

		await tick();

		expect(queryByTestId(mockSnippetTestId)).not.toBeInTheDocument();
	});

	it('should render only from the lower-bound limit', async () => {
		const { getByTestId, queryByTestId } = render(Responsive, {
			props: { ...baseProps, up: 'xl' }
		});

		screensStore.set('2xl');

		await tick();

		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();

		screensStore.set('xl');

		await tick();

		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();

		screensStore.set('lg');

		await tick();

		expect(queryByTestId(mockSnippetTestId)).not.toBeInTheDocument();
	});

	it('should not render the children if the screen size is not in range', () => {
		screensStore.set('xs');

		const { queryByTestId } = render(Responsive, {
			props: {
				...baseProps,
				up: 'sm',
				down: 'md'
			}
		});

		expect(queryByTestId(mockSnippetTestId)).not.toBeInTheDocument();
	});
});
