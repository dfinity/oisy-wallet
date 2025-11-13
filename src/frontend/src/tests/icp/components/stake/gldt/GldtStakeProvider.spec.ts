import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import GldtStakeProvider from '$icp/components/stake/gldt/GldtStakeProvider.svelte';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeContext
} from '$icp/stores/gldt-stake.store';
import { stakeProvidersConfig } from '$lib/config/stake.config';
import {
	STAKE_PROVIDER_EXTERNAL_URL,
	STAKE_PROVIDER_LOGO
} from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { StakeProvider as StakeProviderType } from '$lib/types/stake';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('GldtStakeProvider', () => {
	const apy = 10;
	const mockContext = () => {
		const store = initGldtStakeStore();
		store.setApy(apy);

		return new Map<symbol, SendContext | GldtStakeContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })],
			[GLDT_STAKE_CONTEXT_KEY, { store }]
		]);
	};

	it('renders provided provider data correctly', () => {
		const { container, getByTestId } = render(GldtStakeProvider, {
			context: mockContext()
		});

		expect(container).toHaveTextContent(stakeProvidersConfig[StakeProviderType.GLDT].name);
		expect(container).toHaveTextContent(
			replacePlaceholders(en.stake.text.current_apy, {
				$apy: '10.0'
			})
		);
		expect(container).toHaveTextContent(
			replacePlaceholders(en.stake.text.current_apy_info, {
				$token: `${ICP_TOKEN.symbol}`
			})
		);
		expect(getByTestId(STAKE_PROVIDER_LOGO)).toBeInTheDocument();
		expect(getByTestId(STAKE_PROVIDER_EXTERNAL_URL)).toBeInTheDocument();
	});
});
