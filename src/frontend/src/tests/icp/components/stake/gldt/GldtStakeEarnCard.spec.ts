import { GLDT_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import GldtStakeEarnCard from '$icp/components/stake/gldt/GldtStakeEarnCard.svelte';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { render } from '@testing-library/svelte';

describe('GldtStakeEarnCard', () => {
	beforeEach(() => {
		icrcCustomTokensStore.resetAll();

		icrcCustomTokensStore.set({
			data: mockIcrcCustomToken,
			certified: false
		});
	});

	it('should display correct values if GLDT token is not available', () => {
		const { container } = render(GldtStakeEarnCard);

		expect(container).toHaveTextContent(
			replacePlaceholders(en.stake.text.enable_token_button, { $token_symbol: 'GLDT' })
		);
		expect(container).toHaveTextContent(
			replacePlaceholders(en.stake.text.enable_token_text, { $token_symbol: 'GLDT' })
		);
	});

	it('should display correct values if GLDT token is available', () => {
		const { container } = render(GldtStakeEarnCard, {
			props: {
				gldtToken: {
					...mockIcrcCustomToken,
					standard: 'icrc',
					ledgerCanisterId: GLDT_LEDGER_CANISTER_ID,
					symbol: 'GLDT'
				}
			}
		});

		expect(container).toHaveTextContent(
			replacePlaceholders(en.stake.text.stake, { $token_symbol: 'GLDT' })
		);
	});
});
