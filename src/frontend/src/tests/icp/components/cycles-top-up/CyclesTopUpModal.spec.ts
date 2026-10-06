import * as canisterStateApi from '$icp/api/canister-state.api';
import CyclesTopUpModal from '$icp/components/cycles-top-up/CyclesTopUpModal.svelte';
import * as cyclesTopUpServices from '$icp/services/cycles-top-up.services';
import {
	CYCLES_TOP_UP_AMOUNT,
	CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON,
	CYCLES_TOP_UP_CANISTER_INPUT,
	CYCLES_TOP_UP_CANISTER_NEXT_BUTTON,
	CYCLES_TOP_UP_REVIEW,
	CYCLES_TOP_UP_REVIEW_BACK_BUTTON,
	CYCLES_TOP_UP_REVIEW_TOP_UP_BUTTON,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import * as authDerived from '$lib/derived/auth.derived';
import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import * as cyclesTopUpAnalytics from '$lib/services/cycles-top-up-analytics.services';
import { balancesStore } from '$lib/stores/balances.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import * as walletUtils from '$lib/utils/wallet.utils';
import { mockTcyclesToken } from '$tests/mocks/cycles-mint.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity, mockPrincipalText } from '$tests/mocks/identity.mock';
import { assertNonNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('CyclesTopUpModal', () => {
	const canister = 'ywcsb-maaaa-aaaai-q6k7a-cai';

	let existenceSpy: MockInstance;
	let topUpSpy: MockInstance;
	let trackSpy: MockInstance;
	let toastsShowSpy: MockInstance;
	let toastsErrorSpy: MockInstance;

	const renderModal = () => render(CyclesTopUpModal, { props: { token: mockTcyclesToken } });

	const enterCanister = async ({
		result,
		text
	}: {
		result: ReturnType<typeof renderModal>;
		text: string;
	}) => {
		await fireEvent.input(result.getByTestId(CYCLES_TOP_UP_CANISTER_INPUT), {
			target: { value: text }
		});
	};

	const toAmount = async () => {
		const result = renderModal();

		await enterCanister({ result, text: canister });

		await fireEvent.click(result.getByTestId(CYCLES_TOP_UP_CANISTER_NEXT_BUTTON));

		await waitFor(() => {
			expect(result.getByTestId(CYCLES_TOP_UP_AMOUNT)).toBeInTheDocument();
		});

		return result;
	};

	const toReview = async (value = '1.5') => {
		const result = await toAmount();

		const input = result.container.querySelector<HTMLInputElement>(
			`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`
		);

		assertNonNullish(input);

		await fireEvent.input(input, { target: { value } });

		await waitFor(() => {
			expect(result.getByTestId(CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON)).toBeEnabled();
		});

		await fireEvent.click(result.getByTestId(CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON));

		await waitFor(() => {
			expect(result.getByTestId(CYCLES_TOP_UP_REVIEW)).toBeInTheDocument();
		});

		return result;
	};

	const topUp = async (result: ReturnType<typeof renderModal>) => {
		await fireEvent.click(result.getByTestId(CYCLES_TOP_UP_REVIEW_TOP_UP_BUTTON));
	};

	const backOnReview = async (result: ReturnType<typeof renderModal>) => {
		await waitFor(() => {
			expect(result.getByTestId(CYCLES_TOP_UP_REVIEW)).toBeInTheDocument();
		});
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(1_000));

		vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(readable(mockIdentity));
		vi.spyOn(walletUtils, 'waitAndTriggerWallet').mockResolvedValue(undefined);

		existenceSpy = vi.spyOn(canisterStateApi, 'getCanisterExistence').mockResolvedValue('exists');
		topUpSpy = vi
			.spyOn(cyclesTopUpServices, 'topUpCanister')
			.mockResolvedValue({ status: 'topped_up', blockIndex: 7n });
		trackSpy = vi
			.spyOn(cyclesTopUpAnalytics, 'trackCyclesTopUp')
			.mockImplementation(() => undefined);
		toastsShowSpy = vi.spyOn(toastsStore, 'toastsShow');
		toastsErrorSpy = vi.spyOn(toastsStore, 'toastsError');

		balancesStore.set({
			id: mockTcyclesToken.id,
			data: { data: 5_000_000_000_000n, certified: true }
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('opens on the canister step and reports the open', () => {
		const { container } = renderModal();

		expect(container).toHaveTextContent(en.cycles_top_up.text.title);
		expect(trackSpy).toHaveBeenCalledExactlyOnceWith({ step: 'open' });
	});

	describe('canister step', () => {
		it('asks for a canister ID when the text is not one', async () => {
			const result = renderModal();

			await enterCanister({ result, text: mockPrincipalText });

			expect(result.container).toHaveTextContent(en.cycles_top_up.error.invalid_canister_id);
			expect(result.getByTestId(CYCLES_TOP_UP_CANISTER_NEXT_BUTTON)).toBeDisabled();
		});

		it('checks that the canister exists before going on', async () => {
			await toAmount();

			expect(existenceSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: Principal.fromText(canister)
			});
		});

		it('refuses a canister that does not exist', async () => {
			existenceSpy.mockResolvedValue('not_found');

			const result = renderModal();

			await enterCanister({ result, text: canister });
			await fireEvent.click(result.getByTestId(CYCLES_TOP_UP_CANISTER_NEXT_BUTTON));

			await waitFor(() => {
				expect(result.container).toHaveTextContent(en.cycles_top_up.error.canister_not_found);
			});

			expect(result.getByTestId(CYCLES_TOP_UP_CANISTER_NEXT_BUTTON)).toBeDisabled();
		});

		it('lets a check that could not be made be tried again', async () => {
			existenceSpy.mockResolvedValueOnce('unknown');

			const result = renderModal();

			await enterCanister({ result, text: canister });
			await fireEvent.click(result.getByTestId(CYCLES_TOP_UP_CANISTER_NEXT_BUTTON));

			await waitFor(() => {
				expect(result.container).toHaveTextContent(en.cycles_top_up.error.canister_check_failed);
			});

			await fireEvent.click(result.getByTestId(CYCLES_TOP_UP_CANISTER_NEXT_BUTTON));

			await waitFor(() => {
				expect(result.getByTestId(CYCLES_TOP_UP_AMOUNT)).toBeInTheDocument();
			});

			expect(existenceSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe('amount step', () => {
		it('refuses an amount that does not exceed the fee', async () => {
			const result = await toAmount();

			const input = result.container.querySelector<HTMLInputElement>(
				`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`
			);

			assertNonNullish(input);

			await fireEvent.input(input, { target: { value: '0.0001' } });

			await waitFor(() => {
				expect(result.container).toHaveTextContent('Enter more than the 0.0001 TCYCLES fee.');
			});

			expect(result.getByTestId(CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON)).toBeDisabled();
		});
	});

	describe('review', () => {
		it('shows the canister in full and the total with the fee', async () => {
			const result = await toReview();

			expect(result.getByTestId(CYCLES_TOP_UP_REVIEW)).toHaveTextContent(canister);
			expect(result.getByTestId(CYCLES_TOP_UP_REVIEW)).toHaveTextContent('1.5001 TCYCLES');
			expect(result.container).toHaveTextContent(en.cycles_top_up.text.one_way);
		});
	});

	describe('top-up', () => {
		it('tops up the canister with the amount and a creation time, and confirms it', async () => {
			const result = await toReview();

			await topUp(result);

			await waitFor(() => {
				expect(toastsShowSpy).toHaveBeenCalledWith(
					expect.objectContaining({
						text: `Topped up ${shortenWithMiddleEllipsis({ text: canister })} with 1.5 TCYCLES.`,
						level: 'success'
					})
				);
			});

			expect(topUpSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: Principal.fromText(canister),
				amount: 1_500_000_000_000n,
				createdAt: 1_000_000_000n
			});
			expect(trackSpy).toHaveBeenNthCalledWith(2, {
				step: 'top_up',
				tokenSymbol: 'TCYCLES',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING
			});
			expect(trackSpy).toHaveBeenNthCalledWith(3, {
				step: 'top_up',
				tokenSymbol: 'TCYCLES',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			});
			expect(walletUtils.waitAndTriggerWallet).toHaveBeenCalledOnce();
		});

		it('says nothing moved when the ledger refuses, and stays on Review', async () => {
			topUpSpy.mockResolvedValue({ status: 'refused', refusal: 'created_in_future' });

			const result = await toReview();

			await topUp(result);

			await backOnReview(result);

			expect(toastsErrorSpy).toHaveBeenCalledWith({
				msg: { text: en.cycles_top_up.error.clock }
			});
			expect(trackSpy).toHaveBeenLastCalledWith({
				step: 'top_up',
				tokenSymbol: 'TCYCLES',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				errorCode: 'refused'
			});
		});

		it('says the cycles came back minus the fees when the deposit fails, and sends a new request next', async () => {
			topUpSpy.mockResolvedValueOnce({ status: 'refunded', refundBlockIndex: 9n });

			const result = await toReview();

			await topUp(result);

			await backOnReview(result);

			expect(toastsErrorSpy).toHaveBeenCalledWith({
				msg: {
					text: replacePlaceholders(en.cycles_top_up.error.refunded, {
						$refund: '1.4999',
						$token: 'TCYCLES',
						$fees: '0.0002'
					})
				}
			});

			vi.setSystemTime(new Date(2_000));

			await topUp(result);

			await waitFor(() => {
				expect(topUpSpy).toHaveBeenCalledTimes(2);
			});

			expect(topUpSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({ createdAt: 2_000_000_000n })
			);
		});

		it('offers the clock as the next step when a first top-up is refused as too old', async () => {
			topUpSpy.mockResolvedValue({ status: 'refused', refusal: 'too_old' });

			const result = await toReview();

			await topUp(result);

			await backOnReview(result);

			expect(toastsErrorSpy).toHaveBeenCalledWith({
				msg: { text: en.cycles_top_up.error.clock }
			});
		});

		it('keeps the outcome unknown when a resent top-up is refused as too old', async () => {
			topUpSpy
				.mockResolvedValueOnce({ status: 'unknown' })
				.mockResolvedValueOnce({ status: 'refused', refusal: 'too_old' });

			const result = await toReview();

			await topUp(result);

			await backOnReview(result);

			await topUp(result);

			await waitFor(() => {
				expect(topUpSpy).toHaveBeenCalledTimes(2);
			});

			await backOnReview(result);

			expect(toastsErrorSpy).not.toHaveBeenCalled();
			expect(result.container).toHaveTextContent(
				replacePlaceholders(en.cycles_top_up.text.unknown, { $token: 'TCYCLES' })
			);
			expect(trackSpy).toHaveBeenLastCalledWith({
				step: 'top_up',
				tokenSymbol: 'TCYCLES',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				errorCode: 'unknown'
			});
			expect(topUpSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({ createdAt: 1_000_000_000n })
			);
		});

		it('warns that a changed top-up can top up again while the last outcome is unknown', async () => {
			topUpSpy.mockResolvedValueOnce({ status: 'unknown' });

			const result = await toReview();

			await topUp(result);

			await backOnReview(result);

			await fireEvent.click(result.getByTestId(CYCLES_TOP_UP_REVIEW_BACK_BUTTON));

			await waitFor(() => {
				expect(result.getByTestId(CYCLES_TOP_UP_AMOUNT)).toBeInTheDocument();
			});

			const input = result.container.querySelector<HTMLInputElement>(
				`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`
			);

			assertNonNullish(input);

			await fireEvent.input(input, { target: { value: '2' } });

			await waitFor(() => {
				expect(result.getByTestId(CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON)).toBeEnabled();
			});

			await fireEvent.click(result.getByTestId(CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON));

			await backOnReview(result);

			expect(result.container).toHaveTextContent(
				replacePlaceholders(en.cycles_top_up.text.unknown_fresh, { $token: 'TCYCLES' })
			);

			vi.setSystemTime(new Date(2_000));

			await topUp(result);

			await waitFor(() => {
				expect(topUpSpy).toHaveBeenCalledTimes(2);
			});

			expect(topUpSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({ amount: 2_000_000_000_000n, createdAt: 2_000_000_000n })
			);
		});

		it('says it cannot tell yet when there is no answer, and resends the same request', async () => {
			topUpSpy.mockResolvedValueOnce({ status: 'unknown' });

			const result = await toReview();

			await topUp(result);

			await backOnReview(result);

			expect(result.container).toHaveTextContent(
				replacePlaceholders(en.cycles_top_up.text.unknown, { $token: 'TCYCLES' })
			);
			expect(toastsErrorSpy).not.toHaveBeenCalled();

			vi.setSystemTime(new Date(2_000));

			await topUp(result);

			await waitFor(() => {
				expect(topUpSpy).toHaveBeenCalledTimes(2);
			});

			expect(topUpSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({ createdAt: 1_000_000_000n })
			);
		});
	});
});
