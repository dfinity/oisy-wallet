import { goto } from '$app/navigation';
import Tabs from '$lib/components/ui/Tabs.svelte';
import type { NonEmptyArray } from '$lib/types/utils';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { fireEvent, render } from '@testing-library/svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn().mockResolvedValue(undefined)
}));

describe('Tabs', () => {
	const props = {
		activeTab: 'test1',
		tabs: [
			{ label: 'Test 1', id: 'test1' },
			{ label: 'Test 2', id: 'test2' }
		] as NonEmptyArray<{
			label: string;
			id: string;
			path?: string | undefined;
		}>,
		children: mockSnippet
	};

	it('renders component correctly', () => {
		const { getByText, getByTestId } = render(Tabs, { props });

		expect(getByText(props.tabs[0].label)).toBeInTheDocument();
		expect(getByText(props.tabs[1].label)).toBeInTheDocument();
		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();
	});

	it('correctly navigates to provided paths', async () => {
		const { getByText, getByTestId } = render(Tabs, {
			props: {
				...props,
				tabs: props.tabs.map((t) => ({ ...t, path: t.id })) as NonEmptyArray<{
					label: string;
					id: string;
					path?: string | undefined;
				}>
			}
		});

		const tab0 = getByText(props.tabs[0].label);
		const tab1 = getByText(props.tabs[1].label);

		expect(tab0).toBeInTheDocument();
		expect(tab1).toBeInTheDocument();
		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();

		await fireEvent.click(tab0);

		expect(goto).toHaveBeenCalledWith('test1');

		await fireEvent.click(tab1);

		expect(goto).toHaveBeenCalledWith('test2');
	});
});
