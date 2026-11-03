import MenuControlRow from '$lib/components/core/MenuControlRow.svelte';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('MenuControlRow', () => {
	const props = {
		icon: createMockSnippet('row-icon'),
		label: 'Appearance',
		children: createMockSnippet('row-control')
	};

	it('renders the icon, the label and the control', () => {
		const { getByTestId, getByText } = render(MenuControlRow, { props });

		expect(getByTestId('row-icon')).toBeInTheDocument();
		expect(getByText('Appearance')).toBeInTheDocument();
		expect(getByTestId('row-control')).toBeInTheDocument();
	});

	it('keeps the icon and the label together, apart from the control', () => {
		const { getByTestId, getByText } = render(MenuControlRow, { props });

		const label = getByText('Appearance');

		expect(label).toContainElement(getByTestId('row-icon'));
		expect(label).not.toContainElement(getByTestId('row-control'));
	});
});
