import UnstakeModal from '$lib/components/stake/UnstakeModal.svelte';
import type { Token } from '$lib/types/token';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

describe('UnstakeModal', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should display unsupported staking message', () => {
		const { container } = render(UnstakeModal, {
			props: {
				token: mockValidIcrcToken as Token,
				totalStaked: 1000n
			}
		});

		expect(container).toHaveTextContent(en.stake.text.unsupported_token_staking);
	});
});
