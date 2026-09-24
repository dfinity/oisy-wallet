import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import * as cmcApi from '$icp/api/cmc.api';
import CyclesMintModal from '$icp/components/cycles-mint/CyclesMintModal.svelte';
import * as cyclesMintServices from '$icp/services/cycles-mint.services';
import { CyclesMintError } from '$icp/types/cycles-mint';
import {
	CYCLES_MINT_FORM_REVIEW_BUTTON,
	CYCLES_MINT_RATE,
	CYCLES_MINT_REVIEW,
	CYCLES_MINT_REVIEW_MINT_BUTTON,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import * as authDerived from '$lib/derived/auth.derived';
import * as cyclesMintAnalytics from '$lib/services/cycles-mint-analytics.services';
import { balancesStore } from '$lib/stores/balances.store';
import * as toastsStore from '$lib/stores/toasts.store';
import * as consoleUtils from '$lib/utils/console.utils';
import { mockTcyclesToken, mockXdrPermyriadPerIcp } from '$tests/mocks/cycles-mint.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('CyclesMintModal', () => {
	let rateSpy: MockInstance;
	let mintSpy: MockInstance;
	let trackSpy: MockInstance;
	let toastsShowSpy: MockInstance;
	let toastsErrorSpy: MockInstance;

	const renderModal = () =>
		render(CyclesMintModal, { props: { destinationToken: mockTcyclesToken } });

	const toReview = async () => {
		const result = renderModal();

		await waitFor(() => {
			expect(result.getByTestId(CYCLES_MINT_RATE)).toBeInTheDocument();
		});

		const input = result.container.querySelector<HTMLInputElement>(
			`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`
		);

		assertNonNullish(input);

		await fireEvent.input(input, { target: { value: '1.5' } });

		await waitFor(() => {
			expect(result.getByTestId(CYCLES_MINT_FORM_REVIEW_BUTTON)).not.toBeDisabled();
		});

		await fireEvent.click(result.getByTestId(CYCLES_MINT_FORM_REVIEW_BUTTON));

		return result;
	};

	const mint = async () => {
		const result = await toReview();

		await fireEvent.click(result.getByTestId(CYCLES_MINT_REVIEW_MINT_BUTTON));

		return result;
	};

	beforeEach(() => {
		vi.restoreAllMocks();

		vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(readable(mockIdentity));
		vi.spyOn(consoleUtils, 'consoleError').mockImplementation(() => undefined);

		rateSpy = vi.spyOn(cmcApi, 'getIcpXdrConversionRate').mockResolvedValue(mockXdrPermyriadPerIcp);
		mintSpy = vi.spyOn(cyclesMintServices, 'mintCycles');
		trackSpy = vi.spyOn(cyclesMintAnalytics, 'trackCyclesMint').mockImplementation(() => undefined);
		toastsShowSpy = vi.spyOn(toastsStore, 'toastsShow');
		toastsErrorSpy = vi.spyOn(toastsStore, 'toastsError');

		balancesStore.set({ id: ICP_TOKEN.id, data: { data: 250_000_000n, certified: true } });
	});

	it('opens on the form, titled after the token, and reports the open', () => {
		const { container } = renderModal();

		expect(container).toHaveTextContent('Mint TCYCLES');
		expect(trackSpy).toHaveBeenCalledExactlyOnceWith({ step: 'open' });
	});

	it('reads the rate from the CMC', async () => {
		renderModal();

		await waitFor(() => {
			expect(rateSpy).toHaveBeenCalledWith({ identity: mockIdentity, certified: false });
		});
	});

	it('says so when the rate cannot be loaded', async () => {
		rateSpy.mockRejectedValue(new Error('CMC unreachable'));

		const { container } = renderModal();

		await waitFor(() => {
			expect(container).toHaveTextContent(
				'The TCYCLES rate could not be loaded. Please try again later.'
			);
		});
	});

	it('re-quotes when Review opens and keeps the amount', async () => {
		const { getByTestId } = await toReview();

		expect(getByTestId(CYCLES_MINT_REVIEW)).toHaveTextContent('1.5 ICP');
		expect(rateSpy).toHaveBeenCalledTimes(2);
	});

	it('mints the entered ICP and shows what was credited', async () => {
		mintSpy.mockResolvedValue({ status: 'minted', credited: 6_749_900_000_000n });

		await mint();

		await waitFor(() => {
			expect(toastsShowSpy).toHaveBeenCalledWith(
				expect.objectContaining({ text: 'Minted 6.7499 TCYCLES.', level: 'success' })
			);
		});

		expect(mintSpy).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				identity: mockIdentity,
				sourceToken: ICP_TOKEN,
				destinationToken: mockTcyclesToken,
				amount: 150_000_000n,
				estimatedCredited: 6_749_900_000_000n
			})
		);
	});

	it('reports a refund with what came back and the CMC’s reason', async () => {
		mintSpy.mockResolvedValue({ status: 'refunded', reason: 'Mint limit reached' });

		await mint();

		await waitFor(() => {
			expect(toastsErrorSpy).toHaveBeenCalledWith({
				msg: {
					text: 'The mint was refunded. Your ICP came back, minus 0.0003 ICP. Reason: Mint limit reached'
				}
			});
		});
	});

	it('reports a final CMC error with its reason', async () => {
		mintSpy.mockResolvedValue({ status: 'failed', reason: 'Invalid transaction' });

		await mint();

		await waitFor(() => {
			expect(toastsErrorSpy).toHaveBeenCalledWith({
				msg: { text: 'The mint failed. Reason: Invalid transaction' }
			});
		});
	});

	// Once the ICP has left the wallet, a mint the CMC has not answered is never a failure.
	it('hands a mint the CMC has not answered to the background', async () => {
		mintSpy.mockResolvedValue({ status: 'pending' });

		await mint();

		await waitFor(() => {
			expect(toastsShowSpy).toHaveBeenCalledWith(expect.objectContaining({ level: 'info' }));
		});

		expect(toastsErrorSpy).not.toHaveBeenCalled();
	});

	it('warns, rather than fails, when the transfer went unanswered', async () => {
		mintSpy.mockRejectedValue(new CyclesMintError('unconfirmed'));

		await mint();

		await waitFor(() => {
			expect(toastsShowSpy).toHaveBeenCalledWith(expect.objectContaining({ level: 'warn' }));
		});

		expect(toastsErrorSpy).not.toHaveBeenCalled();
	});

	// Nothing moved: an ordinary error, and Review is where to try again.
	it('returns to Review when the transfer failed', async () => {
		mintSpy.mockRejectedValue(new CyclesMintError('transfer_failed'));

		const { findByTestId } = await mint();

		await waitFor(() => {
			expect(toastsErrorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					msg: { text: 'The ICP transfer failed. Nothing was sent.' }
				})
			);
		});

		await expect(findByTestId(CYCLES_MINT_REVIEW_MINT_BUTTON)).resolves.toBeInTheDocument();
	});
});
