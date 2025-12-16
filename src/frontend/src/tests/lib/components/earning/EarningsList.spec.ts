import type { StakePositionResponse } from '$declarations/gldt_stake/gldt_stake.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { GLDT_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { gldtStakeStore } from '$icp/stores/gldt-stake.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import EarningsList from '$lib/components/earning/EarningsList.svelte';
import { stakeProvidersConfig } from '$lib/config/stake.config';
import { ZERO } from '$lib/constants/app.constants';
import { EARNING_CARD, EARNING_NO_POSITION_PLACEHOLDER } from '$lib/constants/test-ids.constants';
import { exchangeStore } from '$lib/stores/exchange.store';
import { StakeProvider } from '$lib/types/stake';
import { parseTokenId } from '$lib/validation/token.validation';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { render } from '@testing-library/svelte';

describe('EarningsList', () => {
	beforeEach(() => {
		setupTestnetsStore('reset');
		setupUserNetworksStore('allEnabled');

		gldtStakeStore.reset();

		exchangeStore.reset();
	});

	it('should render the placeholder if there are no earning positions', () => {
		const { getByTestId } = render(EarningsList);

		expect(getByTestId(EARNING_NO_POSITION_PLACEHOLDER)).toBeInTheDocument();
	});

	describe('when there are GLDT staking positions', () => {
		const mockApy = 12;
		const mockStaked = 1000000000n;

		const mockGldtToken: IcrcCustomToken = {
			id: parseTokenId('GOLDAO'),
			symbol: 'GLDT',
			name: 'Gold DAO Token',
			decimals: 8,
			network: ICP_NETWORK,
			enabled: true,
			standard: { code: 'icrc' },
			ledgerCanisterId: GLDT_LEDGER_CANISTER_ID,
			position: 1,
			fee: 100n,
			category: 'custom'
		};

		beforeEach(() => {
			gldtStakeStore.setApy(mockApy);
			gldtStakeStore.setPosition({ staked: mockStaked } as unknown as StakePositionResponse);

			icrcCustomTokensStore.resetAll();
			icrcCustomTokensStore.setAll([{ data: mockGldtToken, certified: true }]);

			exchangeStore.reset();
			exchangeStore.set([{ [mockGldtToken.ledgerCanisterId]: { usd: 1 } }]);
		});

		it('should not render the placeholder', () => {
			const { queryByTestId } = render(EarningsList);

			expect(queryByTestId(EARNING_NO_POSITION_PLACEHOLDER)).toBeNull();
		});

		it('should render the card for the provider', () => {
			const { getByTestId } = render(EarningsList);

			expect(
				getByTestId(`${EARNING_CARD}-${stakeProvidersConfig[StakeProvider.GLDT].name}`)
			).toBeInTheDocument();
		});

		it('should render the placeholder if GLDT token is not enabled', () => {
			icrcCustomTokensStore.resetAll();
			icrcCustomTokensStore.setAll([
				{ data: { ...mockGldtToken, enabled: false }, certified: true }
			]);

			const { getByTestId } = render(EarningsList);

			expect(getByTestId(EARNING_NO_POSITION_PLACEHOLDER)).toBeInTheDocument();
		});

		it('should render the placeholder if GLDT token is not among the tokens', () => {
			icrcCustomTokensStore.resetAll();

			const { getByTestId } = render(EarningsList);

			expect(getByTestId(EARNING_NO_POSITION_PLACEHOLDER)).toBeInTheDocument();
		});

		it('should render the placeholder if the staked amount is zero', () => {
			gldtStakeStore.setPosition({ staked: ZERO } as unknown as StakePositionResponse);

			const { getByTestId } = render(EarningsList);

			expect(getByTestId(EARNING_NO_POSITION_PLACEHOLDER)).toBeInTheDocument();
		});
	});
});
