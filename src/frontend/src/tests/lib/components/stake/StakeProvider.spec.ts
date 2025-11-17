import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import StakeProvider from '$lib/components/stake/StakeProvider.svelte';
import { stakeProvidersConfig } from '$lib/config/stake.config';
import {
	STAKE_PROVIDER_EXTERNAL_URL,
	STAKE_PROVIDER_LOGO
} from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { StakeProvider as StakeProviderType } from '$lib/types/stake';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('StakeProvider', () => {
	const mockContext = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })]]);
	const props = {
		provider: StakeProviderType.GLDT,
		content: mockSnippet
	};

	it('renders provided provider data correctly', () => {
		const { container, getByTestId } = render(StakeProvider, {
			props,
			context: mockContext()
		});

		expect(container).toHaveTextContent(stakeProvidersConfig[StakeProviderType.GLDT].name);
		expect(getByTestId(STAKE_PROVIDER_LOGO)).toBeInTheDocument();
		expect(getByTestId(STAKE_PROVIDER_EXTERNAL_URL)).toBeInTheDocument();
	});
});
