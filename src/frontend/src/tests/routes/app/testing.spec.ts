import TestingPage from '$routes/(app)/testing/+page.svelte';
import { render } from '@testing-library/svelte';

// Testing harness - DO NOT MERGE.
describe('Testing page', () => {
	it('should render the harness page with its title', () => {
		const { getByText } = render(TestingPage);

		expect(getByText('Testing')).toBeInTheDocument();
		expect(getByText(/Scenarios that make failure paths reachable on demand/)).toBeInTheDocument();
	});
});
