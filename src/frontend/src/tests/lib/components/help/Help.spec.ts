import { icrcUnavailableCustomTokensStore } from '$icp/stores/icrc-unavailable-custom-tokens.store';
import Help from '$lib/components/help/Help.svelte';
import { APP_VERSION } from '$lib/constants/app.constants';
import { OISY_NAME } from '$lib/constants/oisy.constants';
import {
	HELP_EXPLORERS_CARD,
	HELP_ICPSWAP_CARD,
	HELP_NETWORK_EXPLORERS_CARD,
	HELP_SUPPORT_CARD,
	HELP_UNAVAILABLE_TOKENS_CARD
} from '$lib/constants/test-ids.constants';
import { trackHelp } from '$lib/services/help-analytics.services';
import { ethAddressStore } from '$lib/stores/address.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { toNullable } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { render } from '@testing-library/svelte';

vi.mock('$lib/services/help-analytics.services', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	trackHelp: vi.fn()
}));

describe('Help', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		ethAddressStore.reset();
		icrcUnavailableCustomTokensStore.set([]);
		mockAuthStore();
	});

	it('puts the unavailable tokens card first while a saved token cannot be loaded', () => {
		const ledgerCanisterId = 'aiw2p-tyaaa-aaaam-aebyq-cai';

		icrcUnavailableCustomTokensStore.set([
			{
				ledgerCanisterId,
				customToken: {
					token: {
						Icrc: { ledger_id: Principal.fromText(ledgerCanisterId), index_id: toNullable() }
					},
					version: toNullable(1n),
					enabled: true,
					section: toNullable(),
					allow_external_content_source: toNullable(),
					allowed_external_content_source_urls: toNullable()
				}
			}
		]);

		const { getByTestId } = render(Help);

		expect(
			getByTestId(HELP_UNAVAILABLE_TOKENS_CARD).compareDocumentPosition(
				getByTestId(HELP_SUPPORT_CARD)
			) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	it('shows no unavailable tokens card while every saved token loads', () => {
		const { queryByTestId } = render(Help);

		expect(queryByTestId(HELP_UNAVAILABLE_TOKENS_CARD)).not.toBeInTheDocument();
	});

	it('renders the four cards in order: Support, networks, providers, ICPSwap', () => {
		// Both explorer cards hide themselves while every address is still nullish.
		ethAddressStore.set({ data: mockEthAddress, certified: false });

		const { getByTestId } = render(Help);

		const cards = [
			getByTestId(HELP_SUPPORT_CARD),
			getByTestId(HELP_NETWORK_EXPLORERS_CARD),
			getByTestId(HELP_EXPLORERS_CARD),
			getByTestId(HELP_ICPSWAP_CARD)
		];

		cards.forEach((card) => expect(card).toBeInTheDocument());

		cards.slice(0, -1).forEach((card, index) => {
			expect(
				card.compareDocumentPosition(cards[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING
			).toBeTruthy();
		});
	});

	it('separates the cards instead of letting them touch', () => {
		const { getByTestId } = render(Help);

		// SettingsCard's own `first-of-type:mt-0` cannot see siblings through the test-id
		// wrappers, so the container supplies the spacing.
		const container = getByTestId(HELP_SUPPORT_CARD).parentElement;

		expect(container?.className).toContain('gap-5');
	});

	it('closes the page with the version block, spaced like the Settings page', () => {
		const { getByText, container } = render(Help);

		// SettingsVersion renders the app name next to a link to its release tag.
		expect(getByText(OISY_NAME)).toBeInTheDocument();
		expect(getByText(`v${APP_VERSION}`)).toBeInTheDocument();

		// The mt-24 wrapper is a sibling of the card stack, not a child: inside the flex
		// container its margin would stack on top of the gap.
		const version = getByText(OISY_NAME).closest('.mt-24');

		expect(version).toBeInTheDocument();
		expect(version?.parentElement).toBe(
			container.querySelector('.flex.flex-col.gap-5')?.parentElement
		);
	});

	it('tracks the page open once', () => {
		render(Help);

		expect(trackHelp).toHaveBeenCalledExactlyOnceWith({
			action: 'open',
			resultStatus: 'success'
		});
	});
});
