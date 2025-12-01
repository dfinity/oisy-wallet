import { GLDT_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import GldtStakeEarnCard from '$icp/components/stake/gldt/GldtStakeEarnCard.svelte';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeContext
} from '$icp/stores/gldt-stake.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcToken } from '$icp/types/ic-token';
import { balancesStore } from '$lib/stores/balances.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { render } from '@testing-library/svelte';

describe('GldtStakeEarnCard', () => {
	const mockContext = () =>
		new Map<symbol, GldtStakeContext>([[GLDT_STAKE_CONTEXT_KEY, { store: initGldtStakeStore() }]]);
	const gldtToken = {
		...mockIcrcCustomToken,
		standard: 'icrc',
		ledgerCanisterId: GLDT_LEDGER_CANISTER_ID,
		symbol: 'GLDT'
	} as IcToken;

	beforeEach(() => {
		icrcCustomTokensStore.resetAll();

		icrcCustomTokensStore.set({
			data: mockIcrcCustomToken,
			certified: false
		});
	});

	it('should display correct values if GLDT token is not available', () => {
		const { container } = render(GldtStakeEarnCard, {
			context: mockContext()
		});

		expect(container).toHaveTextContent(
			replacePlaceholders(en.stake.text.enable_token_button, { $token_symbol: 'GLDT' })
		);
		expect(container).toHaveTextContent(
			replacePlaceholders(en.stake.text.enable_token_text, { $token_symbol: 'GLDT' })
		);
	});

	it('should display "no GLDT to stake" if GLDT token is available but no balance', () => {
		const { container } = render(GldtStakeEarnCard, {
			props: {
				gldtToken
			},
			context: mockContext()
		});

		expect(container).toHaveTextContent(
			replacePlaceholders(en.stake.text.not_enough_to_stake, { $token_symbol: gldtToken.symbol })
		);
	});

	it('should display "stake GLDT" if GLDT token is available but no balance', () => {
		balancesStore.set({
			id: gldtToken.id,
			data: { data: 10000000n, certified: true }
		});
		const { container } = render(GldtStakeEarnCard, {
			props: {
				gldtToken
			},
			context: mockContext()
		});

		expect(container).toHaveTextContent(
			replacePlaceholders(en.stake.text.stake_amount, {
				$token_symbol: gldtToken.symbol,
				$amount: '0.1'
			})
		);
	});
});
