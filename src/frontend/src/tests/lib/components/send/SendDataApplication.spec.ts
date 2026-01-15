import SendDataApplication from '$lib/components/send/SendDataApplication.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('SendDataApplication', () => {
	const props = {
		application: 'any-application'
	};

	it('renders data correctly', () => {
		const { container } = render(SendDataApplication, {
			props
		});

		expect(container).toHaveTextContent(en.wallet_connect.text.application);

		expect(container).toHaveTextContent(props.application);
	});
});
