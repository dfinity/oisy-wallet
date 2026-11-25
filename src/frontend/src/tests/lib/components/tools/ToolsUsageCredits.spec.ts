import * as cyclesMintEnv from '$env/cycles-mint.env';
import * as cmcApi from '$icp/api/cmc.api';
import * as icrcDerived from '$icp/derived/icrc.derived';
import ToolsUsageCredits from '$lib/components/tools/ToolsUsageCredits.svelte';
import { OISY_DOCS_URL } from '$lib/constants/oisy.constants';
import {
	CONVERT_AMOUNT_EXCHANGE_VALUE,
	TOOLS_USAGE_CREDITS_ADD_MORE_BUTTON,
	TOOLS_USAGE_CREDITS_BALANCE,
	TOOLS_USAGE_CREDITS_GET_CYCLES_BUTTON,
	TOOLS_USAGE_CREDITS_MODAL,
	TOOLS_USAGE_CREDITS_OWN_CREDITS
} from '$lib/constants/test-ids.constants';
import * as exchangeDerived from '$lib/derived/exchange.derived';
import * as cyclesMintAnalytics from '$lib/services/cycles-mint-analytics.services';
import * as ownCyclesServices from '$lib/services/own-cycles.services';
import { modalStore } from '$lib/stores/modal.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockTcyclesToken, mockXdrPermyriadPerIcp } from '$tests/mocks/cycles-mint.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';

describe('ToolsUsageCredits', () => {
	const ownCycles = { approved: 1_500_000_000_000n, balance: 3_250_000_000_000n };

	const renderLoaded = async () => {
		const result = render(ToolsUsageCredits);

		await waitFor(() => {
			expect(result.getByTestId(TOOLS_USAGE_CREDITS_OWN_CREDITS)).toBeInTheDocument();
		});

		return result;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		modalStore.close();

		mockAuthStore();
		vi.spyOn(icrcDerived, 'icrcTokens', 'get').mockReturnValue(
			readable([{ ...mockTcyclesToken, enabled: true }])
		);
		vi.spyOn(ownCyclesServices, 'loadOwnCycles').mockResolvedValue(ownCycles);
		vi.spyOn(cmcApi, 'getIcpXdrConversionRate').mockResolvedValue(mockXdrPermyriadPerIcp);
		vi.spyOn(cyclesMintAnalytics, 'trackCyclesMint').mockImplementation(() => undefined);
		vi.spyOn(cyclesMintEnv, 'CYCLES_MINT_ENABLED', 'get').mockReturnValue(true);
	});

	it('shows its title and text, with a Learn more link to the docs', () => {
		const { container, getByRole, getByText } = render(ToolsUsageCredits);

		expect(getByText(en.usage_credits.text.title)).toBeInTheDocument();
		expect(container).toHaveTextContent(
			replacePlaceholders(en.usage_credits.text.description, { $token: 'TCYCLES' })
		);
		expect(getByRole('link', { name: en.settings.text.learn_more })).toHaveAttribute(
			'href',
			OISY_DOCS_URL
		);
	});

	it('shows the approval left and the TCYCLES balance it reads', async () => {
		const { getByTestId } = await renderLoaded();

		expect(getByTestId(TOOLS_USAGE_CREDITS_OWN_CREDITS)).toHaveTextContent('1.5 TCYCLES');
		expect(getByTestId(TOOLS_USAGE_CREDITS_BALANCE)).toHaveTextContent('3.25 TCYCLES');
		expect(ownCyclesServices.loadOwnCycles).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity
		});
	});

	// The reads go to the cycles ledger itself, so the card does not need TCYCLES enabled; only
	// the token's details come from the list of tokens, enabled or not.
	it('shows the fiat value next to both amounts', async () => {
		vi.spyOn(exchangeDerived, 'exchanges', 'get').mockReturnValue(
			readable({ [mockTcyclesToken.id]: { usd: 1.4 } })
		);

		const { getAllByTestId } = await renderLoaded();

		expect(
			getAllByTestId(CONVERT_AMOUNT_EXCHANGE_VALUE).map(({ textContent }) => textContent?.trim())
		).toEqual(['~$2.10', '~$4.55']);
	});

	it('works with TCYCLES not enabled', async () => {
		const disabled = { ...mockTcyclesToken, enabled: false };

		vi.spyOn(icrcDerived, 'icrcTokens', 'get').mockReturnValue(readable([disabled]));

		const { getByTestId } = await renderLoaded();

		expect(getByTestId(TOOLS_USAGE_CREDITS_BALANCE)).toHaveTextContent('3.25 TCYCLES');
	});

	it('is not shown without the TCYCLES token', () => {
		vi.spyOn(icrcDerived, 'icrcTokens', 'get').mockReturnValue(readable([]));

		const { queryByText } = render(ToolsUsageCredits);

		expect(queryByText(en.usage_credits.text.title)).not.toBeInTheDocument();
	});

	it('says the values are not available when they cannot be read', async () => {
		const err = new Error('Ledger unreachable');
		const toastsErrorSpy = vi.spyOn(toastsStore, 'toastsError');

		vi.spyOn(ownCyclesServices, 'loadOwnCycles').mockRejectedValue(err);

		const { getByTestId } = await renderLoaded();

		expect(getByTestId(TOOLS_USAGE_CREDITS_OWN_CREDITS)).toHaveTextContent(
			en.core.text.not_available
		);
		expect(getByTestId(TOOLS_USAGE_CREDITS_BALANCE)).toHaveTextContent(en.core.text.not_available);
		expect(getByTestId(TOOLS_USAGE_CREDITS_ADD_MORE_BUTTON)).toBeDisabled();
		expect(toastsErrorSpy).toHaveBeenCalledExactlyOnceWith({
			msg: { text: en.usage_credits.error.load },
			err
		});
	});

	it('does not read while signed out', () => {
		mockAuthStore(null);

		render(ToolsUsageCredits);

		expect(ownCyclesServices.loadOwnCycles).not.toHaveBeenCalled();
	});

	describe('Add more', () => {
		it('is disabled until the values are read', () => {
			vi.spyOn(ownCyclesServices, 'loadOwnCycles').mockReturnValue(new Promise(() => undefined));

			const { getByTestId } = render(ToolsUsageCredits);

			expect(getByTestId(TOOLS_USAGE_CREDITS_ADD_MORE_BUTTON)).toBeDisabled();
		});

		it('opens the approval step', async () => {
			const { getByTestId } = await renderLoaded();

			await fireEvent.click(getByTestId(TOOLS_USAGE_CREDITS_ADD_MORE_BUTTON));

			expect(get(modalStore)?.type).toBe('usage-credits-add');
			expect(getByTestId(TOOLS_USAGE_CREDITS_MODAL)).toHaveTextContent(
				en.usage_credits.text.add_title
			);
		});

		it('reads the values again once the step closes', async () => {
			const { getByTestId } = await renderLoaded();

			await fireEvent.click(getByTestId(TOOLS_USAGE_CREDITS_ADD_MORE_BUTTON));

			expect(ownCyclesServices.loadOwnCycles).toHaveBeenCalledOnce();

			modalStore.close();

			await waitFor(() => {
				expect(ownCyclesServices.loadOwnCycles).toHaveBeenCalledTimes(2);
			});
		});
	});

	describe('Get cycles', () => {
		it('opens Mint TCYCLES', async () => {
			const { container, getByTestId } = await renderLoaded();

			await fireEvent.click(getByTestId(TOOLS_USAGE_CREDITS_GET_CYCLES_BUTTON));

			expect(get(modalStore)?.type).toBe('cycles-mint');
			expect(container).toHaveTextContent(en.cycles_mint.text.you_mint_estimate);
		});

		it('reads the values again once Mint closes', async () => {
			const { getByTestId } = await renderLoaded();

			await fireEvent.click(getByTestId(TOOLS_USAGE_CREDITS_GET_CYCLES_BUTTON));

			modalStore.close();

			await waitFor(() => {
				expect(ownCyclesServices.loadOwnCycles).toHaveBeenCalledTimes(2);
			});
		});

		it('is not shown while Mint is off', async () => {
			vi.spyOn(cyclesMintEnv, 'CYCLES_MINT_ENABLED', 'get').mockReturnValue(false);

			const { queryByTestId } = await renderLoaded();

			expect(queryByTestId(TOOLS_USAGE_CREDITS_GET_CYCLES_BUTTON)).not.toBeInTheDocument();
		});
	});
});
