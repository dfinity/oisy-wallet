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

	const props = { token: mockTcyclesToken, ownCycles, onError: vi.fn(), onSet: vi.fn() };

	// The limit set last, 1.5 TCYCLES, of which 1 TCYCLES is left.
	const withPrevious = { ...props, previousLimit: 1_500_000_000_000n };

	const amountInput = (container: HTMLElement): HTMLInputElement => {
		const input: HTMLInputElement | null = container.querySelector(
			`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`
		);

		assertNonNullish(input);

		return input;
	};

	const enterAmount = async ({ container, value }: { container: HTMLElement; value: string }) =>
		await fireEvent.input(amountInput(container), { target: { value } });

	const review = async ({ value, previousLimit }: { value: string; previousLimit?: bigint }) => {
		const result = render(ToolsUsageCreditsModal, { props: { ...props, previousLimit } });

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

	it('opens with an empty limit when none was set before, and Review disabled until one is entered', async () => {
		const { container, getByTestId } = render(ToolsUsageCreditsModal, { props });

		const modal = getByTestId(TOOLS_USAGE_CREDITS_MODAL);

		expect(modal).toHaveTextContent(en.usage_credits.text.add_title);
		expect(modal).toHaveTextContent(en.usage_credits.text.add_description);

		await waitFor(() => {
			expect(amountInput(container).value).toBe('');
		});

		expect(getByTestId(TOOLS_USAGE_CREDITS_REVIEW_BUTTON)).toBeDisabled();

		await enterAmount({ container, value: '1.5' });

		expect(getByTestId(TOOLS_USAGE_CREDITS_REVIEW_BUTTON)).toBeEnabled();
	});

	it('starts at the limit set last, ready to review', async () => {
		const { container, getByTestId } = render(ToolsUsageCreditsModal, { props: withPrevious });

		await waitFor(() => {
			expect(amountInput(container).value).toBe('1.5');
		});

		expect(getByTestId(TOOLS_USAGE_CREDITS_REVIEW_BUTTON)).toBeEnabled();
	});

	it('opens with an empty limit after a revoke', async () => {
		const { container } = render(ToolsUsageCreditsModal, {
			props: { ...props, previousLimit: ZERO }
		});

		await waitFor(() => {
			expect(amountInput(container).value).toBe('');
		});
	});

	it('shows the limit set last and what is left of it', () => {
		const { getByTestId } = render(ToolsUsageCreditsModal, { props: withPrevious });

		const modal = getByTestId(TOOLS_USAGE_CREDITS_MODAL);

		expect(modal).toHaveTextContent(`${en.usage_credits.text.previous_limit} 1.5 TCYCLES`);
		expect(modal).toHaveTextContent(`${en.usage_credits.text.own_credits_after} 1 TCYCLES`);
	});

	it('shows only what is left when the limit set last is not known', () => {
		const { getByTestId } = render(ToolsUsageCreditsModal, { props });

		const modal = getByTestId(TOOLS_USAGE_CREDITS_MODAL);

		expect(modal).not.toHaveTextContent(en.usage_credits.text.previous_limit);
		expect(modal).toHaveTextContent(`${en.usage_credits.text.own_credits_after} 1 TCYCLES`);
	});

	it('shows the fiat values of the limit set last, of what is left and of the fee', () => {
		vi.spyOn(exchangeDerived, 'exchanges', 'get').mockReturnValue(
			readable({ [mockTcyclesToken.id]: { usd: 1.4 } })
		);

		const { getAllByTestId } = render(ToolsUsageCreditsModal, { props: withPrevious });

		expect(
			getAllByTestId(CONVERT_AMOUNT_EXCHANGE_VALUE).map(({ textContent }) => textContent?.trim())
		).toEqual(['~$2.10', '~$1.40', '< $0.01']);
	});

	it('keeps Review disabled for the limit already set', async () => {
		const { container, getByTestId } = render(ToolsUsageCreditsModal, { props });

		await enterAmount({ container, value: '1' });

		expect(getByTestId(TOOLS_USAGE_CREDITS_REVIEW_BUTTON)).toBeDisabled();
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

	it('reviews the limit set last, what is left of it, the new one and the fee', async () => {
		const { getByTestId } = await review({ value: '1.8', previousLimit: 1_500_000_000_000n });

		const modal = getByTestId(TOOLS_USAGE_CREDITS_MODAL);

		const rows = [
			`${en.usage_credits.text.previous_limit} 1.5 TCYCLES`,
			`${en.usage_credits.text.own_credits_after} 1 TCYCLES`,
			`${en.usage_credits.text.new_limit} 1.8 TCYCLES`,
			`${en.fee.text.approval_fee} 0.0001 TCYCLES`
		];

		expect(modal).toHaveTextContent(en.convert.text.review);

		rows.forEach((row) => expect(modal).toHaveTextContent(row));

		// Read top to bottom: what was set, what is left of it, what it becomes.
		const text = (modal.textContent ?? '').replace(/\s+/g, ' ');
		const positions = rows.map((row) => text.indexOf(row));

		expect(positions).toEqual([...positions].sort((x, y) => x - y));
		expect(ownCyclesServices.setSpendingLimit).not.toHaveBeenCalled();
	});

	it('reviews without the limit set last when it is not known', async () => {
		const { getByTestId } = await review({ value: '1.5' });

		const modal = getByTestId(TOOLS_USAGE_CREDITS_MODAL);

		expect(modal).not.toHaveTextContent(en.usage_credits.text.previous_limit);
		expect(modal).toHaveTextContent(`${en.usage_credits.text.own_credits_after} 1 TCYCLES`);
		expect(modal).toHaveTextContent(`${en.usage_credits.text.new_limit} 1.5 TCYCLES`);
	});

	it('goes back to the limit it reviewed', async () => {
		const { container, getByText } = await review({ value: '1.5' });

		await fireEvent.click(getByText(en.core.text.back));

		await waitFor(() => {
			expect(amountInput(container).value).toBe('1.5');
		});
	});

	it('sets the new limit, tells the card, then closes with a toast', async () => {
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
		expect(props.onSet).toHaveBeenCalledExactlyOnceWith(500_000_000_000n);
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
		expect(props.onSet).not.toHaveBeenCalled();
	});
});
