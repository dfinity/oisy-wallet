import CollapsibleList from '$lib/components/ui/CollapsibleList.svelte';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';

describe('CollapsibleList', () => {
	it('should render one item initally', () => {
		const { queryByTestId } = render(CollapsibleList, {
			props: {
				items: [createMockSnippet('item1'), createMockSnippet('item2'), createMockSnippet('item3')]
			}
		});

		expect(queryByTestId('item1')).toBeInTheDocument();
		expect(queryByTestId('item2')).not.toBeInTheDocument();
		expect(queryByTestId('item3')).not.toBeInTheDocument();
	});

	it('should render all items when expand button is clicked', async () => {
		const { queryByTestId, getByRole } = render(CollapsibleList, {
			props: {
				items: [createMockSnippet('item1'), createMockSnippet('item2'), createMockSnippet('item3')]
			}
		});

		const button = getByRole('button');

		assertNonNullish(button);

		await fireEvent.click(button);

		expect(queryByTestId('item1')).toBeInTheDocument();
		expect(queryByTestId('item2')).toBeInTheDocument();
		expect(queryByTestId('item3')).toBeInTheDocument();
	});

	it('should render collapse the list to one item again if button is clicked again', async () => {
		const { queryByTestId, getByRole } = render(CollapsibleList, {
			props: {
				items: [createMockSnippet('item1'), createMockSnippet('item2'), createMockSnippet('item3')]
			}
		});

		const button = getByRole('button');

		assertNonNullish(button);

		await fireEvent.click(button);

		expect(queryByTestId('item1')).toBeInTheDocument();
		expect(queryByTestId('item2')).toBeInTheDocument();
		expect(queryByTestId('item3')).toBeInTheDocument();

		await fireEvent.click(button);

		expect(queryByTestId('item2')).not.toBeInTheDocument();
		expect(queryByTestId('item3')).not.toBeInTheDocument();
	});

	it('should render all items by default and not render the expand button if hideExpandButton is passed', () => {
		const { queryByTestId, queryByRole } = render(CollapsibleList, {
			props: {
				items: [createMockSnippet('item1'), createMockSnippet('item2'), createMockSnippet('item3')],
				hideExpandButton: true
			}
		});

		expect(queryByRole('button')).not.toBeInTheDocument();

		expect(queryByTestId('item1')).toBeInTheDocument();
		expect(queryByTestId('item2')).toBeInTheDocument();
		expect(queryByTestId('item3')).toBeInTheDocument();
	});
});
