import StakeProvider from '$lib/components/stake/StakeProvider.svelte';

import { stakeProvidersConfig } from '$lib/config/stake.config';
import {
	STAKE_PROVIDER_EXTERNAL_URL,
	STAKE_PROVIDER_LOGO
} from '$lib/constants/test-ids.constants';
import { StakeProvider as StakeProviderType } from '$lib/types/stake';
import { render } from '@testing-library/svelte';

describe('StakeProvider', () => {
	const props = {
		provider: StakeProviderType.GLDT
	};

	it('renders provided provider data correctly', () => {
		const { container, getByTestId } = render(StakeProvider, {
			props
		});

		expect(container).toHaveTextContent(stakeProvidersConfig[StakeProviderType.GLDT].name);
		expect(getByTestId(STAKE_PROVIDER_LOGO)).toBeInTheDocument();
		expect(getByTestId(STAKE_PROVIDER_EXTERNAL_URL)).toBeInTheDocument();
	});
});
