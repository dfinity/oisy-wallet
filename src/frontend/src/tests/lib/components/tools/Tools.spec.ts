import * as canisterTopUpEnv from '$env/canister-top-up.env';
import * as ownCyclesEnv from '$env/own-cycles.env';
import * as icrcDerived from '$icp/derived/icrc.derived';
import Tools from '$lib/components/tools/Tools.svelte';
import { ZERO } from '$lib/constants/app.constants';
import {
	HELP_NETWORK_EXPLORERS_CARD,
	HELP_NETWORK_EXPLORERS_LINK,
	TOOLS_CANISTER_TOP_UP_BUTTON
} from '$lib/constants/test-ids.constants';
import { trackEvent } from '$lib/services/analytics.services';
import * as ownCyclesServices from '$lib/services/own-cycles.services';
import { ethAddressStore } from '$lib/stores/address.store';
import { modalStore } from '$lib/stores/modal.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockTcyclesToken } from '$tests/mocks/cycles-mint.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';

vi.mock('$lib/services/analytics.services', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	trackEvent: vi.fn()
}));

vi.mock('$lib/derived/networks.derived', async (importOriginal) => {
	const { readable } = await import('svelte/store');
	const { ETHEREUM_NETWORK } = await import('$env/networks/networks.eth.env');

	return {
		...(await importOriginal<Record<string, unknown>>()),
		networksMainnets: readable([ETHEREUM_NETWORK])
	};
});

describe('Tools', () => {
	const enableCanisterTopUp = (enabled: boolean) =>
		vi.spyOn(canisterTopUpEnv, 'CANISTER_TOP_UP_ENABLED', 'get').mockReturnValue(enabled);

	const follows = ({ first, second }: { first: HTMLElement; second: HTMLElement }): boolean =>
		(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

	beforeEach(() => {
		vi.clearAllMocks();

		modalStore.close();
		ethAddressStore.reset();
	});

	describe('Blockchain explorers', () => {
		beforeEach(() => {
			ethAddressStore.set({ data: mockEthAddress, certified: false });
		});

		it('comes first, before Canister top-up and Export data', () => {
			enableCanisterTopUp(true);

			const { getByTestId, getByText } = render(Tools);

			const explorers = getByTestId(HELP_NETWORK_EXPLORERS_CARD);
			const topUp = getByTestId(TOOLS_CANISTER_TOP_UP_BUTTON);
			const exportData = getByText(en.settings.text.export_data);

			expect(explorers).toHaveTextContent(en.help.text.network_explorers_title);
			expect(follows({ first: explorers, second: topUp })).toBeTruthy();
			expect(follows({ first: topUp, second: exportData })).toBeTruthy();
		});

		it('reports its link clicks from Tools', async () => {
			const { getByTestId } = render(Tools);

			await fireEvent.click(getByTestId(`${HELP_NETWORK_EXPLORERS_LINK}-eth`));

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'help',
				metadata: expect.objectContaining({
					event_modifier: 'explorer',
					source_location: 'tools_page',
					event_subcontext: 'network_explorers'
				})
			});
		});
	});

	describe('Canister top-up', () => {
		it('offers to top up a canister', () => {
			enableCanisterTopUp(true);

			const { container, getByTestId } = render(Tools);

			expect(container).toHaveTextContent(en.cycles_top_up.text.canister_top_up);
			expect(container).toHaveTextContent(en.tools.text.top_up_canister);

			const button = getByTestId(TOOLS_CANISTER_TOP_UP_BUTTON);

			expect(button).toHaveTextContent(en.cycles_top_up.text.top_up);
			expect(button).toHaveAttribute('aria-label', en.tools.text.top_up_canister);
		});

		it('opens the Canister top-up modal', async () => {
			enableCanisterTopUp(true);

			const { getByTestId } = render(Tools);

			await fireEvent.click(getByTestId(TOOLS_CANISTER_TOP_UP_BUTTON));

			expect(get(modalStore)?.type).toBe('canister-top-up');
		});

		it('is absent while its flag is off', () => {
			enableCanisterTopUp(false);

			const { container, queryByTestId } = render(Tools);

			expect(queryByTestId(TOOLS_CANISTER_TOP_UP_BUTTON)).toBeNull();
			expect(container).not.toHaveTextContent(en.cycles_top_up.text.canister_top_up);
		});
	});

	describe('Usage credits', () => {
		const enableOwnCycles = (enabled: boolean) =>
			vi.spyOn(ownCyclesEnv, 'OWN_CYCLES_ENABLED', 'get').mockReturnValue(enabled);

		beforeEach(() => {
			mockAuthStore();
			vi.spyOn(icrcDerived, 'icrcTokens', 'get').mockReturnValue(
				readable([{ ...mockTcyclesToken, enabled: true }])
			);
			vi.spyOn(ownCyclesServices, 'loadOwnCycles').mockResolvedValue({
				approved: ZERO,
				balance: ZERO
			});
		});

		it('comes after Canister top-up and before Export data', () => {
			enableCanisterTopUp(true);
			enableOwnCycles(true);

			const { getByTestId, getByText } = render(Tools);

			const topUp = getByTestId(TOOLS_CANISTER_TOP_UP_BUTTON);
			const usageCredits = getByText(en.usage_credits.text.title);
			const exportData = getByText(en.settings.text.export_data);

			expect(follows({ first: topUp, second: usageCredits })).toBeTruthy();
			expect(follows({ first: usageCredits, second: exportData })).toBeTruthy();
		});

		it('is absent while its flag is off', () => {
			enableOwnCycles(false);

			const { queryByText } = render(Tools);

			expect(queryByText(en.usage_credits.text.title)).toBeNull();
			expect(ownCyclesServices.loadOwnCycles).not.toHaveBeenCalled();
		});
	});

	it('offers Export data while the Canister top-up flag is off', () => {
		enableCanisterTopUp(false);

		const { getAllByText, getByText } = render(Tools);

		expect(getByText(en.settings.text.export_data)).toBeInTheDocument();
		expect(getAllByText(en.settings.text.export_tokens)).toHaveLength(2);
		expect(getAllByText(en.settings.text.export_transactions)).toHaveLength(2);
	});
});
