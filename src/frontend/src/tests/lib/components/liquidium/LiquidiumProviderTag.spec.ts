import LiquidiumProviderTag from '$lib/components/liquidium/LiquidiumProviderTag.svelte';
import { lendBorrowProvidersConfig } from '$lib/config/lend-borrow.config';
import { LendBorrowProvider } from '$lib/types/lend-borrow';
import { render } from '@testing-library/svelte';

describe('LiquidiumProviderTag', () => {
	it('renders the Liquidium provider name', () => {
		const { container } = render(LiquidiumProviderTag);

		expect(container).toHaveTextContent(
			lendBorrowProvidersConfig[LendBorrowProvider.LIQUIDIUM].name
		);
	});
});
