import ToolsUsageCreditsModal from '$lib/components/tools/ToolsUsageCreditsModal.svelte';
import {
	TOKEN_INPUT_CURRENCY_TOKEN,
	TOOLS_USAGE_CREDITS_ADD_BUTTON,
	TOOLS_USAGE_CREDITS_MODAL
} from '$lib/constants/test-ids.constants';
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
import { get } from 'svelte/store';

describe('ToolsUsageCreditsModal', () => {
	// 1 TCYCLES left of the approval, 2 TCYCLES in the balance; the ledger fee is 0.0001 TCYCLES.
	const ownCycles = { approved: 1_000_000_000_000n, balance: 2_000_000_000_000n };

	const modalId = Symbol();

	const props = { token: mockTcyclesToken, ownCycles, onError: vi.fn() };

	const enterAmount = async ({ container, value }: { container: HTMLElement; value: string }) => {
		const input: HTMLInputElement | null = container.querySelector(
			`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`
		);

		assertNonNullish(input);

		await fireEvent.input(input, { target: { value } });
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();
		modalStore.openUsageCreditsAdd(modalId);

		vi.spyOn(ownCyclesServices, 'addOwnCycles').mockResolvedValue();
	});

	it('says the TCYCLES stay in the balance', () => {
		const { getByTestId } = render(ToolsUsageCreditsModal, { props });

		const modal = getByTestId(TOOLS_USAGE_CREDITS_MODAL);

		expect(modal).toHaveTextContent(en.usage_credits.text.add_title);
		expect(modal).toHaveTextContent(
			replacePlaceholders(en.usage_credits.text.add_description, { $token: 'TCYCLES' })
		);
	});

	it('keeps Add disabled without an amount', () => {
		const { getByTestId } = render(ToolsUsageCreditsModal, { props });

		expect(getByTestId(TOOLS_USAGE_CREDITS_ADD_BUTTON)).toBeDisabled();
	});

	it('shows the approval after adding the amount, and the approval fee', async () => {
		const { container, getByTestId, getByText } = render(ToolsUsageCreditsModal, { props });

		expect(getByText('1 TCYCLES')).toBeInTheDocument();
		expect(getByText('0.0001 TCYCLES')).toBeInTheDocument();

		await enterAmount({ container, value: '0.5' });

		expect(getByText('1.5 TCYCLES')).toBeInTheDocument();
		expect(getByTestId(TOOLS_USAGE_CREDITS_ADD_BUTTON)).toBeEnabled();
	});

	it('lets through an amount that leaves the fee in the balance', async () => {
		const { container, getByTestId } = render(ToolsUsageCreditsModal, { props });

		await enterAmount({ container, value: '1.9999' });

		expect(getByTestId(TOOLS_USAGE_CREDITS_ADD_BUTTON)).toBeEnabled();
	});

	it('refuses an amount that leaves nothing for the fee', async () => {
		const { container, getByTestId, findByText } = render(ToolsUsageCreditsModal, { props });

		await enterAmount({ container, value: '2' });

		expect(getByTestId(TOOLS_USAGE_CREDITS_ADD_BUTTON)).toBeDisabled();
		await expect(
			findByText(en.fee.assertion.insufficient_funds_for_fee)
		).resolves.toBeInTheDocument();
	});

	it('refuses an amount above the balance', async () => {
		const { container, getByTestId, findByText } = render(ToolsUsageCreditsModal, { props });

		await enterAmount({ container, value: '3' });

		expect(getByTestId(TOOLS_USAGE_CREDITS_ADD_BUTTON)).toBeDisabled();
		await expect(findByText(en.send.assertion.insufficient_funds)).resolves.toBeInTheDocument();
	});

	it('adds the amount to the approval, then closes with a toast', async () => {
		const toastsShowSpy = vi.spyOn(toastsStore, 'toastsShow');

		const { container, getByTestId } = render(ToolsUsageCreditsModal, { props });

		await enterAmount({ container, value: '0.5' });
		await fireEvent.click(getByTestId(TOOLS_USAGE_CREDITS_ADD_BUTTON));

		expect(ownCyclesServices.addOwnCycles).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			approved: ownCycles.approved,
			amount: 500_000_000_000n
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

	it('stays open on an error and has the card read the values again', async () => {
		const err = new Error('Allowance changed');
		const toastsErrorSpy = vi.spyOn(toastsStore, 'toastsError');

		vi.spyOn(ownCyclesServices, 'addOwnCycles').mockRejectedValue(err);

		const { container, getByTestId } = render(ToolsUsageCreditsModal, { props });

		await enterAmount({ container, value: '0.5' });
		await fireEvent.click(getByTestId(TOOLS_USAGE_CREDITS_ADD_BUTTON));

		await waitFor(() => {
			expect(props.onError).toHaveBeenCalledOnce();
		});

		expect(toastsErrorSpy).toHaveBeenCalledExactlyOnceWith({
			msg: { text: en.usage_credits.error.add },
			err
		});
		expect(get(modalStore)?.id).toBe(modalId);
		expect(getByTestId(TOOLS_USAGE_CREDITS_ADD_BUTTON)).toBeEnabled();
	});
});
