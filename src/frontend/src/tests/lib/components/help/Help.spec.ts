import Support from '$lib/components/help/Help.svelte';
import {
	HELP_EXPLORERS_CARD,
	HELP_ICPSWAP_CARD,
	HELP_SUPPORT_CARD
} from '$lib/constants/test-ids.constants';
import { trackHelp } from '$lib/services/help-analytics.services';
import { ethAddressStore } from '$lib/stores/address.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { render } from '@testing-library/svelte';

vi.mock('$lib/services/help-analytics.services', () => ({
	trackHelp: vi.fn()
}));

describe('Support', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		ethAddressStore.reset();
		mockAuthStore();
	});

	it('renders the three cards, Help & Support first and the explorers above ICPSwap', () => {
		// The explorer card hides itself while every address is still nullish.
		ethAddressStore.set({ data: mockEthAddress, certified: false });

		const { getByTestId } = render(Support);

		const help = getByTestId(HELP_SUPPORT_CARD);
		const explorers = getByTestId(HELP_EXPLORERS_CARD);
		const icpSwap = getByTestId(HELP_ICPSWAP_CARD);

		expect(help).toBeInTheDocument();
		expect(explorers).toBeInTheDocument();
		expect(icpSwap).toBeInTheDocument();
		expect(help.compareDocumentPosition(explorers) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(
			explorers.compareDocumentPosition(icpSwap) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	it('separates the cards instead of letting them touch', () => {
		const { getByTestId } = render(Support);

		// SettingsCard's own `first-of-type:mt-0` cannot see siblings through the test-id
		// wrappers, so the container supplies the spacing.
		const container = getByTestId(HELP_SUPPORT_CARD).parentElement;

		expect(container?.className).toContain('gap-5');
	});

	it('tracks the page open once', () => {
		render(Support);

		expect(trackHelp).toHaveBeenCalledExactlyOnceWith({
			action: 'open',
			resultStatus: 'success'
		});
	});
});
