import * as cyclesMintEnv from '$env/cycles-mint.env';
import * as cmcApi from '$icp/api/cmc.api';
import * as icrcDerived from '$icp/derived/icrc.derived';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import ToolsUsageCredits from '$lib/components/tools/ToolsUsageCredits.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { OISY_USAGE_CREDITS_DOCS_URL } from '$lib/constants/oisy.constants';
import {
	CONVERT_AMOUNT_EXCHANGE_VALUE,
	TOKEN_INPUT_CURRENCY_TOKEN,
	TOOLS_USAGE_CREDITS_ADD_MORE_BUTTON,
	TOOLS_USAGE_CREDITS_BALANCE,
	TOOLS_USAGE_CREDITS_BALANCE_SHORT,
	TOOLS_USAGE_CREDITS_FREE_SIGNATURES,
	TOOLS_USAGE_CREDITS_GET_CYCLES_BUTTON,
	TOOLS_USAGE_CREDITS_MODAL,
	TOOLS_USAGE_CREDITS_OWN_CREDITS,
	TOOLS_USAGE_CREDITS_REVIEW_BUTTON,
	TOOLS_USAGE_CREDITS_SET_BUTTON
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
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get, readable, writable } from 'svelte/store';

describe('ToolsUsageCredits', () => {
	const ownCycles = { approved: 1_500_000_000_000n, balance: 3_250_000_000_000n };

	// The cycles ledger's index, where the card finds the limit set last.
	const indexCanisterId = 'ul4oc-4iaaa-aaaaq-qaabq-cai';
	const token = { ...mockTcyclesToken, enabled: true, indexCanisterId };

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
		vi.spyOn(icrcDerived, 'icrcTokens', 'get').mockReturnValue(readable([token]));
		vi.spyOn(ownCyclesServices, 'loadOwnCycles').mockResolvedValue(ownCycles);
		vi.spyOn(ownCyclesServices, 'loadPreviousSpendingLimit').mockResolvedValue(undefined);
		// 30 signatures at the backend's 0.081 TCYCLES each.
		vi.spyOn(ownCyclesServices, 'loadFreeAllowance').mockResolvedValue(2_430_000_000_000n);
		vi.spyOn(cmcApi, 'getIcpXdrConversionRate').mockResolvedValue(mockXdrPermyriadPerIcp);
		vi.spyOn(cyclesMintAnalytics, 'trackCyclesMint').mockImplementation(() => undefined);
		vi.spyOn(cyclesMintEnv, 'CYCLES_MINT_ENABLED', 'get').mockReturnValue(true);
	});

	it('shows its title and text, with a Learn more link to the docs', () => {
		const { container, getByRole, getByText } = render(ToolsUsageCredits);

		expect(getByText(en.usage_credits.text.title)).toBeInTheDocument();
		expect(container).toHaveTextContent(en.usage_credits.text.description);
		expect(getByRole('link', { name: en.settings.text.learn_more })).toHaveAttribute(
			'href',
			OISY_USAGE_CREDITS_DOCS_URL
		);
	});

	it('shows the free signatures left, the spending limit and the ICP Cycles balance it reads', async () => {
		const { container, getByTestId, getByText } = await renderLoaded();

		expect(getByText(en.usage_credits.text.free_signatures)).toBeInTheDocument();
		expect(getByTestId(TOOLS_USAGE_CREDITS_FREE_SIGNATURES)).toHaveTextContent('~30');
		expect(getByText(en.usage_credits.text.own_credits)).toBeInTheDocument();
		expect(getByTestId(TOOLS_USAGE_CREDITS_OWN_CREDITS)).toHaveTextContent('1.5 TCYCLES');
		expect(container).toHaveTextContent('~18 signatures');
		expect(getByText(en.usage_credits.text.balance)).toBeInTheDocument();
		expect(getByTestId(TOOLS_USAGE_CREDITS_BALANCE)).toHaveTextContent('3.25 TCYCLES');

		// With a query first, then certified.
		for (const certified of [false, true]) {
			expect(ownCyclesServices.loadOwnCycles).toHaveBeenCalledWith({
				identity: mockIdentity,
				certified
			});
			expect(ownCyclesServices.loadFreeAllowance).toHaveBeenCalledWith({
				identity: mockIdentity,
				certified
			});
			expect(ownCyclesServices.loadPreviousSpendingLimit).toHaveBeenCalledWith({
				identity: mockIdentity,
				indexCanisterId,
				certified
			});
		}
	});

	describe('Spending limit', () => {
		const previousLimit = 2_000_000_000_000n;

		it('shows what is left of the limit set last, with the fiat value of what is left', async () => {
			vi.spyOn(ownCyclesServices, 'loadPreviousSpendingLimit').mockResolvedValue(previousLimit);
			vi.spyOn(exchangeDerived, 'exchanges', 'get').mockReturnValue(
				readable({ [mockTcyclesToken.id]: { usd: 1.4 } })
			);

			const { getAllByTestId, getByTestId } = await renderLoaded();

			await waitFor(() => {
				expect(getByTestId(TOOLS_USAGE_CREDITS_OWN_CREDITS)).toHaveTextContent(
					'1.5 of 2 TCYCLES left'
				);
			});

			expect(
				getAllByTestId(CONVERT_AMOUNT_EXCHANGE_VALUE).map(({ textContent }) => textContent?.trim())
			).toEqual(['~$2.10', '~$4.55']);
		});

		// The index follows the ledger a few seconds behind, so it can still list the limit before.
		it('shows only what is left when the limit found is below it', async () => {
			vi.spyOn(ownCyclesServices, 'loadPreviousSpendingLimit').mockResolvedValue(
				1_000_000_000_000n
			);

			const { getByTestId } = await renderLoaded();

			expect(getByTestId(TOOLS_USAGE_CREDITS_OWN_CREDITS)).toHaveTextContent('1.5 TCYCLES');
		});

		it('shows only what is left for a revoked limit', async () => {
			vi.spyOn(ownCyclesServices, 'loadOwnCycles').mockResolvedValue({
				...ownCycles,
				approved: ZERO
			});
			vi.spyOn(ownCyclesServices, 'loadPreviousSpendingLimit').mockResolvedValue(ZERO);

			const { getByTestId } = await renderLoaded();

			expect(getByTestId(TOOLS_USAGE_CREDITS_OWN_CREDITS)).toHaveTextContent('0 TCYCLES');
		});

		it('shows what is left, with no error, when the limit set last can’t be read', async () => {
			const toastsErrorSpy = vi.spyOn(toastsStore, 'toastsError');

			vi.spyOn(ownCyclesServices, 'loadPreviousSpendingLimit').mockRejectedValue(
				new Error('Index unreachable')
			);

			const { getByTestId } = await renderLoaded();

			expect(getByTestId(TOOLS_USAGE_CREDITS_OWN_CREDITS)).toHaveTextContent('1.5 TCYCLES');
			expect(toastsErrorSpy).not.toHaveBeenCalled();
		});

		it('reads again once the token has an index, but not for each new token list', async () => {
			const tokens = writable<IcrcCustomToken[]>([{ ...token, indexCanisterId: undefined }]);

			vi.spyOn(icrcDerived, 'icrcTokens', 'get').mockReturnValue(tokens);

			await renderLoaded();

			expect(ownCyclesServices.loadPreviousSpendingLimit).not.toHaveBeenCalled();

			tokens.set([token]);

			await waitFor(() => {
				expect(ownCyclesServices.loadPreviousSpendingLimit).toHaveBeenCalledTimes(2);
			});

			const reads = vi.mocked(ownCyclesServices.loadOwnCycles).mock.calls.length;

			tokens.set([{ ...token }]);

			await tick();

			expect(ownCyclesServices.loadOwnCycles).toHaveBeenCalledTimes(reads);
		});

		it('does not look for the limit set last without an index', async () => {
			vi.spyOn(icrcDerived, 'icrcTokens', 'get').mockReturnValue(
				readable([{ ...token, indexCanisterId: undefined }])
			);

			const { getByTestId } = await renderLoaded();

			expect(getByTestId(TOOLS_USAGE_CREDITS_OWN_CREDITS)).toHaveTextContent('1.5 TCYCLES');
			expect(ownCyclesServices.loadPreviousSpendingLimit).not.toHaveBeenCalled();
		});

		// 0.5 TCYCLES pays 6 signatures at 0.081 TCYCLES each, though 1.2 TCYCLES are left.
		it('counts the signatures the balance can pay, and says why', async () => {
			vi.spyOn(ownCyclesServices, 'loadOwnCycles').mockResolvedValue({
				approved: 1_200_000_000_000n,
				balance: 500_000_000_000n
			});

			const { container, getByTestId } = await renderLoaded();

			expect(container).toHaveTextContent('~6 signatures');
			expect(getByTestId(TOOLS_USAGE_CREDITS_BALANCE_SHORT)).toHaveTextContent(
				replacePlaceholders(en.usage_credits.text.balance_short, {
					$amount: '0.5',
					$token: 'TCYCLES'
				})
			);
		});

		it('says the balance is empty', async () => {
			vi.spyOn(ownCyclesServices, 'loadOwnCycles').mockResolvedValue({
				approved: 1_200_000_000_000n,
				balance: ZERO
			});

			const { container, getByTestId } = await renderLoaded();

			expect(container).toHaveTextContent('~0 signatures');
			expect(getByTestId(TOOLS_USAGE_CREDITS_BALANCE_SHORT)).toHaveTextContent(
				en.usage_credits.text.balance_empty
			);
		});

		it('shows no warning while the balance covers what is left', async () => {
			const { queryByTestId } = await renderLoaded();

			expect(queryByTestId(TOOLS_USAGE_CREDITS_BALANCE_SHORT)).not.toBeInTheDocument();
		});

		it('starts the step at the limit set last, and shows the limit just set until the index lists it', async () => {
			vi.spyOn(ownCyclesServices, 'loadPreviousSpendingLimit').mockResolvedValue(previousLimit);
			vi.spyOn(ownCyclesServices, 'setSpendingLimit').mockResolvedValue();

			const { container, findByTestId, getByTestId } = await renderLoaded();

			await waitFor(() => {
				expect(getByTestId(TOOLS_USAGE_CREDITS_ADD_MORE_BUTTON)).toBeEnabled();
			});

			await fireEvent.click(getByTestId(TOOLS_USAGE_CREDITS_ADD_MORE_BUTTON));

			const input: HTMLInputElement | null = container.querySelector(
				`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`
			);

			assertNonNullish(input);

			await waitFor(() => {
				expect(input.value).toBe('2');
			});

			// Once set, 3 TCYCLES are left, while the index still lists the limit before.
			vi.spyOn(ownCyclesServices, 'loadOwnCycles').mockResolvedValue({
				approved: 3_000_000_000_000n,
				balance: 3_249_900_000_000n
			});

			await fireEvent.input(input, { target: { value: '3' } });
			await fireEvent.click(getByTestId(TOOLS_USAGE_CREDITS_REVIEW_BUTTON));
			await fireEvent.click(await findByTestId(TOOLS_USAGE_CREDITS_SET_BUTTON));

			await waitFor(() => {
				expect(getByTestId(TOOLS_USAGE_CREDITS_OWN_CREDITS)).toHaveTextContent(
					'3 of 3 TCYCLES left'
				);
			});
		});
	});

	// A replica that has not caught up with an approval just made answers the query with the one
	// from before; the certified answer must win, even when the query answers last.
	it('shows the certified values over a query that lags behind', async () => {
		vi.spyOn(ownCyclesServices, 'loadOwnCycles').mockImplementation(({ certified }) =>
			certified
				? Promise.resolve(ownCycles)
				: new Promise((resolve) =>
						setTimeout(() => resolve({ ...ownCycles, approved: 500_000_000_000n }), 10)
					)
		);

		const { getByTestId } = await renderLoaded();

		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(getByTestId(TOOLS_USAGE_CREDITS_OWN_CREDITS)).toHaveTextContent('1.5 TCYCLES');
	});

	it('says signature, not signatures, for one', async () => {
		vi.spyOn(ownCyclesServices, 'loadOwnCycles').mockResolvedValue({
			...ownCycles,
			approved: 100_000_000_000n
		});

		const { container } = await renderLoaded();

		expect(container).toHaveTextContent(en.usage_credits.text.signatures_one);
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
		expect(getByTestId(TOOLS_USAGE_CREDITS_FREE_SIGNATURES)).toHaveTextContent(
			en.core.text.not_available
		);
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
		expect(ownCyclesServices.loadFreeAllowance).not.toHaveBeenCalled();
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

			expect(ownCyclesServices.loadOwnCycles).toHaveBeenCalledTimes(2);

			modalStore.close();

			await waitFor(() => {
				expect(ownCyclesServices.loadOwnCycles).toHaveBeenCalledTimes(4);
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
				expect(ownCyclesServices.loadOwnCycles).toHaveBeenCalledTimes(4);
			});
		});

		it('is not shown while Mint is off', async () => {
			vi.spyOn(cyclesMintEnv, 'CYCLES_MINT_ENABLED', 'get').mockReturnValue(false);

			const { queryByTestId } = await renderLoaded();

			expect(queryByTestId(TOOLS_USAGE_CREDITS_GET_CYCLES_BUTTON)).not.toBeInTheDocument();
		});
	});
});
