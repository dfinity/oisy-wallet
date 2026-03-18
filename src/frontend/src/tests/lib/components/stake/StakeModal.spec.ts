import { BAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_usdc.env';
import StakeModal from '$lib/components/stake/StakeModal.svelte';
import type { Token } from '$lib/types/token';
import type { Vault } from '$lib/types/vaults';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

describe('StakeModal', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should display unsupported staking message', () => {
		const { container } = render(StakeModal, {
			props: {
				token: mockValidIcrcToken as Token
			}
		});

		expect(container).toHaveTextContent(en.stake.text.unsupported_token_staking);
	});

	it('should not display unsupported message when vault is harvest autopilot', () => {
		const mockVault: Vault = {
			token: { ...BAUTOPILOT_USDC_TOKEN, enabled: true },
			apy: '5.5'
		};

		const { container } = render(StakeModal, {
			props: {
				token: BAUTOPILOT_USDC_TOKEN as Token,
				vault: mockVault
			}
		});

		expect(container).not.toHaveTextContent(en.stake.text.unsupported_token_staking);
	});
});
