import * as canisterStateApi from '$icp/api/canister-state.api';
import CyclesTopUpModal from '$icp/components/cycles-top-up/CyclesTopUpModal.svelte';
import * as cyclesTopUpServices from '$icp/services/cycles-top-up.services';
import { unansweredCyclesTopUps } from '$icp/stores/cycles-top-up.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { CanisterExistence, CyclesTopUpResult } from '$icp/types/cycles-top-up';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import {
	CYCLES_TOP_UP_AMOUNT,
	CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON,
	CYCLES_TOP_UP_CANISTER_INPUT,
	CYCLES_TOP_UP_CANISTER_NEXT_BUTTON,
	CYCLES_TOP_UP_RECENT_CANISTER,
	CYCLES_TOP_UP_REVIEW,
	CYCLES_TOP_UP_REVIEW_BACK_BUTTON,
	CYCLES_TOP_UP_REVIEW_TOP_UP_BUTTON,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import * as authDerived from '$lib/derived/auth.derived';
import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import * as cyclesTopUpAnalytics from '$lib/services/cycles-top-up-analytics.services';
import { balancesStore } from '$lib/stores/balances.store';
import { modalStore } from '$lib/stores/modal.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import * as walletUtils from '$lib/utils/wallet.utils';
import { mockTcyclesToken } from '$tests/mocks/cycles-mint.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity, mockPrincipal2, mockPrincipalText } from '$tests/mocks/identity.mock';
import { assertNonNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get, readable, writable } from 'svelte/store';
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

	// A canister check whose answer the test gives when it chooses.
	const pendingCheck = (): ((existence: CanisterExistence) => void) => {
		let answer: (existence: CanisterExistence) => void = () => undefined;

		existenceSpy.mockImplementationOnce(
			() =>
				new Promise<CanisterExistence>((resolve) => {
					answer = resolve;
				})
		);

		return (existence) => answer(existence);
	};

	const checkDone = async (result: ReturnType<typeof renderModal>) => {
		await waitFor(() => {
			expect(result.container).not.toHaveTextContent(en.cycles_top_up.text.checking_canister);
		});
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

		unansweredCyclesTopUps.set({});
		icTransactionsStore.reset(mockTcyclesToken.id);
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

		it.each([
			{ name: 'the management canister', text: 'aaaaa-aa' },
			{ name: 'the anonymous principal', text: '2vxsx-fae' }
		])('asks for a canister ID for $name, however short', async ({ text }) => {
			const result = renderModal();

			await enterCanister({ result, text });

			expect(result.container).toHaveTextContent(en.cycles_top_up.error.invalid_canister_id);
			expect(result.getByTestId(CYCLES_TOP_UP_CANISTER_NEXT_BUTTON)).toBeDisabled();
		});

		it('does not flag a canister ID still being typed', async () => {
			const result = renderModal();

			await enterCanister({ result, text: canister.slice(0, 9) });

			expect(result.container).not.toHaveTextContent(en.cycles_top_up.error.invalid_canister_id);
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

		describe('recently topped up', () => {
			const recentTopUp: IcTransactionUi = {
				id: '1',
				type: 'burn',
				typeLabel: 'transaction.label.top_up',
				to: canister,
				value: 1_000_000_000_000n,
				timestamp: 1_700_000_000_000_000_000n,
				status: 'executed'
			};

			const pickRecent = async () => {
				icTransactionsStore.append({
					tokenId: mockTcyclesToken.id,
					transactions: [{ data: recentTopUp, certified: true }]
				});

				const result = renderModal();

				const button = result.getByTestId(CYCLES_TOP_UP_RECENT_CANISTER).querySelector('button');

				assertNonNullish(button);

				await fireEvent.click(button);

				return result;
			};

			it('goes on to the amount when a canister is picked, after checking it', async () => {
				const result = await pickRecent();

				await waitFor(() => {
					expect(result.getByTestId(CYCLES_TOP_UP_AMOUNT)).toBeInTheDocument();
				});

				expect(existenceSpy).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					canisterId: Principal.fromText(canister)
				});
			});

			it('acts only on the latest pick while an earlier check still runs', async () => {
				const other = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

				icTransactionsStore.append({
					tokenId: mockTcyclesToken.id,
					transactions: [
						{ data: recentTopUp, certified: true },
						{
							data: {
								...recentTopUp,
								id: '2',
								to: other,
								timestamp: 1_600_000_000_000_000_000n
							},
							certified: true
						}
					]
				});

				const answerFirst = pendingCheck();
				const answerSecond = pendingCheck();

				const result = renderModal();

				const [first, second] = result
					.getAllByTestId(CYCLES_TOP_UP_RECENT_CANISTER)
					.map((item) => item.querySelector('button'));

				assertNonNullish(first);
				assertNonNullish(second);

				await fireEvent.click(first);
				await fireEvent.click(second);

				answerFirst('exists');

				// Let the first answer be handled before looking.
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(result.container).toHaveTextContent(en.cycles_top_up.text.checking_canister);
				expect(result.queryByTestId(CYCLES_TOP_UP_AMOUNT)).toBeNull();

				answerSecond('not_found');

				await waitFor(() => {
					expect(result.container).toHaveTextContent(en.cycles_top_up.error.canister_not_found);
				});

				expect(result.getByTestId(CYCLES_TOP_UP_CANISTER_INPUT)).toHaveValue(other);
				expect(result.queryByTestId(CYCLES_TOP_UP_AMOUNT)).toBeNull();
			});

			it('stays on the canister step when a picked canister no longer exists', async () => {
				existenceSpy.mockResolvedValue('not_found');

				const result = await pickRecent();

				await waitFor(() => {
					expect(result.container).toHaveTextContent(en.cycles_top_up.error.canister_not_found);
				});

				expect(result.getByTestId(CYCLES_TOP_UP_CANISTER_INPUT)).toHaveValue(canister);
				expect(result.queryByTestId(CYCLES_TOP_UP_AMOUNT)).toBeNull();
			});
		});

		it.each([
			{ name: 'edited', text: 'ryjl3-tyaaa-aaaaa-aaaba-cai' },
			{ name: 'reset', text: '' }
		])('ignores the answer for an ID $name while it was checked', async ({ text }) => {
			const answer = pendingCheck();

			const result = renderModal();

			await enterCanister({ result, text: canister });
			await fireEvent.click(result.getByTestId(CYCLES_TOP_UP_CANISTER_NEXT_BUTTON));

			await enterCanister({ result, text });

			answer('exists');

			await checkDone(result);

			expect(result.queryByTestId(CYCLES_TOP_UP_AMOUNT)).toBeNull();
			expect(result.getByTestId(CYCLES_TOP_UP_CANISTER_INPUT)).toHaveValue(text);
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
		it('focuses the amount, as the send forms do', async () => {
			const result = await toAmount();

			const input = result.container.querySelector<HTMLInputElement>(
				`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`
			);

			await waitFor(() => {
				expect(input).toHaveFocus();
			});
		});

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

		it.each([
			{ name: 'a lone decimal point', value: '.' },
			{ name: 'an amount too large to parse', value: '1'.padEnd(160, '0') }
		])('keeps Next disabled for $name', async ({ value }) => {
			const result = await toAmount();

			const input = result.container.querySelector<HTMLInputElement>(
				`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`
			);

			assertNonNullish(input);

			await fireEvent.input(input, { target: { value } });

			expect(input).toHaveValue(value);
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

		it('opens a new modal on the unanswered top-up and resends it, even after the balance dropped', async () => {
			topUpSpy.mockResolvedValueOnce({ status: 'unknown' });

			const first = await toReview();

			await topUp(first);

			await backOnReview(first);

			first.unmount();

			// The first top-up went through: the refreshed balance no longer covers it.
			balancesStore.set({
				id: mockTcyclesToken.id,
				data: { data: 500_000_000_000n, certified: true }
			});

			vi.setSystemTime(new Date(2_000));

			const second = renderModal();

			await backOnReview(second);

			expect(second.container).toHaveTextContent(canister);
			expect(second.container).toHaveTextContent(
				replacePlaceholders(en.cycles_top_up.text.unknown, { $token: 'TCYCLES' })
			);

			await topUp(second);

			await waitFor(() => {
				expect(topUpSpy).toHaveBeenCalledTimes(2);
			});

			expect(topUpSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({ amount: 1_500_000_000_000n, createdAt: 1_000_000_000n })
			);
			expect(existenceSpy).toHaveBeenCalledOnce();
		});

		it('warns in a new modal that another top-up can top up again while the last outcome is unknown', async () => {
			topUpSpy.mockResolvedValueOnce({ status: 'unknown' });

			const first = await toReview();

			await topUp(first);

			await backOnReview(first);

			first.unmount();

			vi.setSystemTime(new Date(2_000));

			const second = renderModal();

			await backOnReview(second);

			await fireEvent.click(second.getByTestId(CYCLES_TOP_UP_REVIEW_BACK_BUTTON));

			await waitFor(() => {
				expect(second.getByTestId(CYCLES_TOP_UP_AMOUNT)).toBeInTheDocument();
			});

			const input = second.container.querySelector<HTMLInputElement>(
				`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`
			);

			assertNonNullish(input);

			expect(input).toHaveValue('1.5');

			await fireEvent.input(input, { target: { value: '2' } });

			await waitFor(() => {
				expect(second.getByTestId(CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON)).toBeEnabled();
			});

			await fireEvent.click(second.getByTestId(CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON));

			await backOnReview(second);

			expect(second.container).toHaveTextContent(
				replacePlaceholders(en.cycles_top_up.text.unknown_fresh, { $token: 'TCYCLES' })
			);

			await topUp(second);

			await waitFor(() => {
				expect(topUpSpy).toHaveBeenCalledTimes(2);
			});

			expect(topUpSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({ amount: 2_000_000_000_000n, createdAt: 2_000_000_000n })
			);
		});

		it("does not resend another principal's unanswered top-up", async () => {
			topUpSpy.mockResolvedValueOnce({ status: 'unknown' });

			const first = await toReview();

			await topUp(first);

			await backOnReview(first);

			first.unmount();

			vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(
				readable({ ...mockIdentity, getPrincipal: () => mockPrincipal2 })
			);

			vi.setSystemTime(new Date(2_000));

			const second = await toReview();

			expect(second.container).not.toHaveTextContent(
				replacePlaceholders(en.cycles_top_up.text.unknown, { $token: 'TCYCLES' })
			);
			expect(second.container).not.toHaveTextContent(
				replacePlaceholders(en.cycles_top_up.text.unknown_fresh, { $token: 'TCYCLES' })
			);

			await topUp(second);

			await waitFor(() => {
				expect(topUpSpy).toHaveBeenCalledTimes(2);
			});

			expect(topUpSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({ createdAt: 2_000_000_000n })
			);
		});

		it("keeps a principal's unanswered top-up while another principal tops up", async () => {
			topUpSpy.mockResolvedValueOnce({ status: 'unknown' });

			const first = await toReview();

			await topUp(first);

			await backOnReview(first);

			first.unmount();

			const identitySpy = vi
				.spyOn(authDerived, 'authIdentity', 'get')
				.mockReturnValue(readable({ ...mockIdentity, getPrincipal: () => mockPrincipal2 }));

			vi.setSystemTime(new Date(2_000));

			const other = await toReview();

			await topUp(other);

			await waitFor(() => {
				expect(topUpSpy).toHaveBeenCalledTimes(2);
			});

			other.unmount();

			identitySpy.mockReturnValue(readable(mockIdentity));

			vi.setSystemTime(new Date(3_000));

			const back = renderModal();

			await backOnReview(back);

			expect(back.container).toHaveTextContent(
				replacePlaceholders(en.cycles_top_up.text.unknown, { $token: 'TCYCLES' })
			);

			await topUp(back);

			await waitFor(() => {
				expect(topUpSpy).toHaveBeenCalledTimes(3);
			});

			expect(topUpSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({ createdAt: 1_000_000_000n })
			);
		});

		it.each([
			{
				name: 'refunded',
				answer: { status: 'refunded', refundBlockIndex: 9n } as CyclesTopUpResult
			},
			{
				name: 'refused as created in the future',
				answer: { status: 'refused', refusal: 'created_in_future' } as CyclesTopUpResult
			}
		])(
			'starts over with a new request once the resend from a new modal is $name',
			async ({ answer }) => {
				topUpSpy.mockResolvedValueOnce({ status: 'unknown' });

				const first = await toReview();

				await topUp(first);

				await backOnReview(first);

				first.unmount();

				topUpSpy.mockResolvedValueOnce(answer);

				const second = renderModal();

				await backOnReview(second);

				await topUp(second);

				await waitFor(() => {
					expect(toastsErrorSpy).toHaveBeenCalledOnce();
				});

				expect(topUpSpy).toHaveBeenLastCalledWith(
					expect.objectContaining({ createdAt: 1_000_000_000n })
				);

				await backOnReview(second);

				vi.setSystemTime(new Date(3_000));

				await topUp(second);

				await waitFor(() => {
					expect(topUpSpy).toHaveBeenCalledTimes(3);
				});

				expect(topUpSpy).toHaveBeenLastCalledWith(
					expect.objectContaining({ createdAt: 3_000_000_000n })
				);
			}
		);

		describe('while a top-up is in flight', () => {
			const pendingTopUp = (): ((result: CyclesTopUpResult) => void) => {
				let answer: (result: CyclesTopUpResult) => void = () => undefined;

				topUpSpy.mockImplementationOnce(
					() =>
						new Promise<CyclesTopUpResult>((resolve) => {
							answer = resolve;
						})
				);

				return (result) => answer(result);
			};

			// Leaving the page closes the modal, and the call carries on.
			const leaveDuringTopUp = async () => {
				const answerFirst = pendingTopUp();

				const first = await toReview();

				await topUp(first);

				await waitFor(() => {
					expect(topUpSpy).toHaveBeenCalledOnce();
				});

				first.unmount();

				return answerFirst;
			};

			const stored = () => get(unansweredCyclesTopUps)[mockPrincipalText];

			it('opens a later modal on it, and a late unknown answer does not bring it back once resent', async () => {
				const answerFirst = await leaveDuringTopUp();

				const second = renderModal();

				await backOnReview(second);

				expect(second.container).toHaveTextContent(
					replacePlaceholders(en.cycles_top_up.text.unknown, { $token: 'TCYCLES' })
				);

				await topUp(second);

				await waitFor(() => {
					expect(topUpSpy).toHaveBeenCalledTimes(2);
				});

				expect(topUpSpy).toHaveBeenLastCalledWith(
					expect.objectContaining({ createdAt: 1_000_000_000n })
				);

				await waitFor(() => {
					expect(stored()).toBeUndefined();
				});

				answerFirst({ status: 'unknown' });

				// Let the first answer be handled before looking.
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(stored()).toBeUndefined();
			});

			it('resends the top-up it opened on, even once that one answered meanwhile', async () => {
				const answerFirst = await leaveDuringTopUp();

				const second = renderModal();

				await backOnReview(second);

				answerFirst({ status: 'topped_up', blockIndex: 7n });

				await waitFor(() => {
					expect(stored()).toBeUndefined();
				});

				vi.setSystemTime(new Date(2_000));

				await topUp(second);

				await waitFor(() => {
					expect(topUpSpy).toHaveBeenCalledTimes(2);
				});

				expect(topUpSpy).toHaveBeenLastCalledWith(
					expect.objectContaining({ createdAt: 1_000_000_000n })
				);
			});

			it('keeps a newer top-up when the first answers late', async () => {
				const answerFirst = await leaveDuringTopUp();

				vi.setSystemTime(new Date(2_000));

				topUpSpy.mockResolvedValueOnce({ status: 'unknown' });

				const second = renderModal();

				await backOnReview(second);

				await fireEvent.click(second.getByTestId(CYCLES_TOP_UP_REVIEW_BACK_BUTTON));

				await waitFor(() => {
					expect(second.getByTestId(CYCLES_TOP_UP_AMOUNT)).toBeInTheDocument();
				});

				const input = second.container.querySelector<HTMLInputElement>(
					`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`
				);

				assertNonNullish(input);

				await fireEvent.input(input, { target: { value: '2' } });

				await waitFor(() => {
					expect(second.getByTestId(CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON)).toBeEnabled();
				});

				await fireEvent.click(second.getByTestId(CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON));

				await backOnReview(second);

				await topUp(second);

				await waitFor(() => {
					expect(stored()?.createdAt).toBe(2_000_000_000n);
				});

				answerFirst({ status: 'topped_up', blockIndex: 7n });

				// Let the first answer be handled before looking.
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(stored()?.createdAt).toBe(2_000_000_000n);
			});
		});

		describe('when another identity signs in', () => {
			const switchIdentity = async () => {
				const identity = writable(mockIdentity);

				vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(identity);

				const result = await toReview();

				identity.set({ ...mockIdentity, getPrincipal: () => mockPrincipal2 });

				return result;
			};

			// Its own reset, not a global count of `modalStore.close`: earlier tests leave timers
			// that close their modals while this one runs.
			it('closes the modal', async () => {
				const result = await switchIdentity();

				await waitFor(() => {
					expect(result.queryByTestId(CYCLES_TOP_UP_REVIEW)).toBeNull();
				});
			});

			it('leaves a modal opened since alone when the first top-up answers late', async () => {
				let answer: (result: CyclesTopUpResult) => void = () => undefined;

				topUpSpy.mockImplementationOnce(
					() =>
						new Promise<CyclesTopUpResult>((resolve) => {
							answer = resolve;
						})
				);

				const identity = writable(mockIdentity);

				vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(identity);

				const result = await toReview();

				await topUp(result);

				await waitFor(() => {
					expect(topUpSpy).toHaveBeenCalledOnce();
				});

				identity.set({ ...mockIdentity, getPrincipal: () => mockPrincipal2 });

				// The identity change closes this modal, and the page removes it.
				result.unmount();

				const other = Symbol();

				modalStore.openCyclesTopUp(other);

				answer({ status: 'topped_up', blockIndex: 7n });

				// Past the 750 ms a topped-up modal waits before closing.
				await new Promise((resolve) => setTimeout(resolve, 900));

				expect(get(modalStore)?.id).toBe(other);
				expect(toastsShowSpy).toHaveBeenCalledOnce();
			});

			it('sends nothing for it, even before the modal closes', async () => {
				const result = await switchIdentity();

				await topUp(result);

				expect(topUpSpy).not.toHaveBeenCalled();
			});
		});
	});
});
