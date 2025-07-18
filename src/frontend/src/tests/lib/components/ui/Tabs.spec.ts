import Tabs from '$lib/components/ui/Tabs.svelte';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('Tabs', () => {
	const props = {
		activeTab: 'test1',
		tabs: [
			{ label: 'Test 1', id: 'test1' },
			{ label: 'Test 2', id: 'test2' }
		],
		children: createMockSnippet('snippet')
	};

	it('renders component correctly', () => {
		const { getByText, getByTestId } = render(Tabs, { props });

		expect(getByText(props.tabs[0].label)).toBeInTheDocument();
		expect(getByText(props.tabs[1].label)).toBeInTheDocument();
		expect(getByTestId('snippet')).toBeInTheDocument();
	});
});
