import KnownDestinationsEmptyState from '$lib/components/send/KnownDestinationsEmptyState.svelte';
import { render } from '@testing-library/svelte';

describe('KnownDestinationsEmptyState', () => {
	const props = {
		title: 'title',
		description: 'description'
	};

	it('renders content correctly', () => {
		const { getByText } = render(KnownDestinationsEmptyState, {
			props
		});

		expect(getByText(props.title)).toBeInTheDocument();
		expect(getByText(props.description)).toBeInTheDocument();
	});
});
