import EmptyState from '$lib/components/ui/EmptyState.svelte';
import { render } from '@testing-library/svelte';

describe('EmptyState', () => {
	const props = {
		title: 'title',
		description: 'description'
	};

	it('renders content correctly with description', () => {
		const { getByText } = render(EmptyState, {
			props
		});

		expect(getByText(props.title)).toBeInTheDocument();
		expect(getByText(props.description)).toBeInTheDocument();
	});

	it('renders content correctly without description', () => {
		const { getByText } = render(EmptyState, {
			props: {
				...props,
				description: undefined
			}
		});

		expect(getByText(props.title)).toBeInTheDocument();
		expect(() => getByText(props.description)).toThrow();
	});
});
