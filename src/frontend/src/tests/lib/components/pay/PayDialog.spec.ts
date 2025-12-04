import PayDialog from '$lib/components/pay/PayDialog.svelte';
import { render } from '@testing-library/svelte';

describe('PayDialog', () => {
	it('should render the title', () => {
		const { getByTestId } = render(PayDialog);
	});

	it('should render the banner', () => {});

	it('should render the description', () => {});

	it('should render the button', () => {});

	it('should open the scanner modal when the button is clicked', () => {});
});
