import ToolsUsageCreditsModal from '$lib/components/tools/ToolsUsageCreditsModal.svelte';
import { ZERO } from '$lib/constants/app.constants';
import {
	CONVERT_AMOUNT_EXCHANGE_VALUE,
	TOKEN_INPUT_CURRENCY_TOKEN,
	TOOLS_USAGE_CREDITS_MODAL,
	TOOLS_USAGE_CREDITS_REVIEW_BUTTON,
	TOOLS_USAGE_CREDITS_SET_BUTTON
} from '$lib/constants/test-ids.constants';
import * as exchangeDerived from '$lib/derived/exchange.derived';
import * as ownCyclesServices from '$lib/services/own-cycles.services';
import { modalStore } from '$lib/stores/modal.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockTcyclesToken } from '$tests/mocks/cycles-mint.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';

describe('ToolsUsageCreditsModal', () => {
	// A spending limit of 1 TCYCLES, 2 TCYCLES in the balance; the ledger fee is 0.0001 TCYCLES.
	const ownCycles = { approved: 1_000_000_000_000n, balance: 2_000_000_000_000n };

	const modalId = Symbol();

	const props = { token: mockTcyclesToken, ownCycles, onError: vi.fn() };

	const amountInput = (container: HTMLElement): HTMLInputElement => {
		const input: HTMLInputElement | null = container.querySelector(
			`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`
		);

		assertNonNullish(input);

		return input;
	};

	const enterAmount = async ({ container, value }: { container: HTMLElement; value: string }) =>
		await fireEvent.input(amountInput(container), { target: { value } });

	const review = async ({ value }: { value: string }) => {
		const result = render(ToolsUsageCreditsModal, { props });

		await waitFor(() => {
			expect(amountInput(result.container)).toBeInTheDocument();
		});

		await enterAmount({ container: result.container, value });
		await fireEvent.click(result.getByTestId(TOOLS_USAGE_CREDITS_REVIEW_BUTTON));

		await waitFor(() => {
			expect(result.getByTestId(TOOLS_USAGE_CREDITS_SET_BUTTON)).toBeInTheDocument();
		});

		return result;
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();
		modalStore.openUsageCreditsAdd(modalId);

		vi.spyOn(ownCyclesServices, 'setSpendingLimit').mockResolvedValue();
	});

	it('opens on the current spending limit, with Review disabled until it changes', async () => {
		const { container, getByTestId } = render(ToolsUsageCreditsModal, { props });

		const modal = getByTestId(TOOLS_USAGE_CREDITS_MODAL);

		expect(modal).toHaveTextContent(en.usage_credits.text.add_title);
		expect(modal).toHaveTextContent(en.usage_credits.text.add_description);

		await waitFor(() => {
			expect(amountInput(container).value).toBe('1');
		});

		expect(getByTestId(TOOLS_USAGE_CREDITS_REVIEW_BUTTON)).toBeDisabled();

		await enterAmount({ container, value: '1.5' });

		expect(getByTestId(TOOLS_USAGE_CREDITS_REVIEW_BUTTON)).toBeEnabled();
	});

	it('shows the fiat values of the current limit and of the fee', () => {
		vi.spyOn(exchangeDerived, 'exchanges', 'get').mockReturnValue(
			readable({ [mockTcyclesToken.id]: { usd: 1.4 } })
		);

		const { getAllByTestId } = render(ToolsUsageCreditsModal, { props });

		expect(
			getAllByTestId(CONVERT_AMOUNT_EXCHANGE_VALUE).map(({ textContent }) => textContent?.trim())
		).toEqual(['~$1.40', '< $0.01']);
	});

	it('lets through a limit that leaves the fee in the balance', async () => {
		const { container, getByTestId } = render(ToolsUsageCreditsModal, { props });

		await enterAmount({ container, value: '1.9999' });

		expect(getByTestId(TOOLS_USAGE_CREDITS_REVIEW_BUTTON)).toBeEnabled();
	});

	it('refuses a limit that leaves nothing for the fee', async () => {
		const { container, getByTestId, findByText } = render(ToolsUsageCreditsModal, { props });

		await enterAmount({ container, value: '2' });

		expect(getByTestId(TOOLS_USAGE_CREDITS_REVIEW_BUTTON)).toBeDisabled();
		await expect(
			findByText(en.fee.assertion.insufficient_funds_for_fee)
		).resolves.toBeInTheDocument();
	});

	it('refuses a limit above the balance', async () => {
		const { container, getByTestId, findByText } = render(ToolsUsageCreditsModal, { props });

		await enterAmount({ container, value: '3' });

		expect(getByTestId(TOOLS_USAGE_CREDITS_REVIEW_BUTTON)).toBeDisabled();
		await expect(findByText(en.send.assertion.insufficient_funds)).resolves.toBeInTheDocument();
	});

	it('reviews the current limit, the new one and the fee', async () => {
		const { getByTestId } = await review({ value: '1.5' });

		const modal = getByTestId(TOOLS_USAGE_CREDITS_MODAL);

		expect(modal).toHaveTextContent(en.convert.text.review);
		expect(modal).toHaveTextContent(`${en.usage_credits.text.own_credits_after} 1 TCYCLES`);
		expect(modal).toHaveTextContent(`${en.usage_credits.text.new_limit} 1.5 TCYCLES`);
		expect(modal).toHaveTextContent(`${en.fee.text.approval_fee} 0.0001 TCYCLES`);
		expect(ownCyclesServices.setSpendingLimit).not.toHaveBeenCalled();
	});

	it('goes back to the limit it reviewed', async () => {
		const { container, getByText } = await review({ value: '1.5' });

		await fireEvent.click(getByText(en.core.text.back));

		await waitFor(() => {
			expect(amountInput(container).value).toBe('1.5');
		});
	});

	it('sets the new limit, then closes with a toast', async () => {
		const toastsShowSpy = vi.spyOn(toastsStore, 'toastsShow');

		const { getByTestId } = await review({ value: '0.5' });

		await fireEvent.click(getByTestId(TOOLS_USAGE_CREDITS_SET_BUTTON));

		expect(ownCyclesServices.setSpendingLimit).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			approved: ownCycles.approved,
			limit: 500_000_000_000n
		});

		await waitFor(() => {
			expect(get(modalStore)).toBeNull();
		});

		expect(toastsShowSpy).toHaveBeenCalledExactlyOnceWith({
			text: replacePlaceholders(en.usage_credits.text.added, {
				$amount: '0.5',
				$token: 'TCYCLES'
			}),
			level: 'success',
			duration: 4000
		});
		expect(props.onError).not.toHaveBeenCalled();
	});

	it('revokes the limit with 0', async () => {
		const { getByTestId } = await review({ value: '0' });

		await fireEvent.click(getByTestId(TOOLS_USAGE_CREDITS_SET_BUTTON));

		expect(ownCyclesServices.setSpendingLimit).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			approved: ownCycles.approved,
			limit: ZERO
		});
	});

	it('stays on the review on an error and has the card read the values again', async () => {
		const err = new Error('Allowance changed');
		const toastsErrorSpy = vi.spyOn(toastsStore, 'toastsError');

		vi.spyOn(ownCyclesServices, 'setSpendingLimit').mockRejectedValue(err);

		const { getByTestId } = await review({ value: '0.5' });

		await fireEvent.click(getByTestId(TOOLS_USAGE_CREDITS_SET_BUTTON));

		await waitFor(() => {
			expect(props.onError).toHaveBeenCalledOnce();
		});

		expect(toastsErrorSpy).toHaveBeenCalledExactlyOnceWith({
			msg: { text: en.usage_credits.error.add },
			err
		});
		expect(get(modalStore)?.id).toBe(modalId);
		expect(getByTestId(TOOLS_USAGE_CREDITS_SET_BUTTON)).toBeEnabled();
	});
});
