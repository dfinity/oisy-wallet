import StakeModal from '$lib/components/stake/StakeModal.svelte';
import type { Token } from '$lib/types/token';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

vi.mock('$eth/services/eth-listener.services', () => ({
	initMinedTransactionsListener: vi.fn(() => ({
		disconnect: vi.fn()
	}))
}));

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
});
