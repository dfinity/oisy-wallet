import EarningsList from '$lib/components/earning/EarningsList.svelte';
import { EARNING_NO_POSITION_PLACEHOLDER } from '$lib/constants/test-ids.constants';
import { render } from '@testing-library/svelte';

describe('EarningsList', () => {
	it('should render the placeholder if there are no earning positions', () => {
		const { getByTestId } = render(EarningsList);

		expect(getByTestId(EARNING_NO_POSITION_PLACEHOLDER)).toBeInTheDocument();
	});
});
