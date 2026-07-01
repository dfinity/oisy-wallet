import ProviderTag from '$lib/components/ui/ProviderTag.svelte';
import { render } from '@testing-library/svelte';

describe('ProviderTag', () => {
	it('renders the provider name', () => {
		const { getByText } = render(ProviderTag, { props: { name: 'OISY TRADE' } });

		expect(getByText('OISY TRADE')).toBeInTheDocument();
	});

	it('forwards the test id', () => {
		const { getByTestId } = render(ProviderTag, {
			props: { name: 'Liquidium', testId: 'provider-tag' }
		});

		expect(getByTestId('provider-tag')).toBeInTheDocument();
	});
});
