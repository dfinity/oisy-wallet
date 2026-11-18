import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { TOKEN_MODAL_DELETE_BUTTON } from '$lib/constants/test-ids.constants';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockXrpAddress } from '$tests/mocks/xrp.mock';
import XrpRemoveTokenConfirmation from '$xrp/components/tokens/XrpRemoveTokenConfirmation.svelte';
import type {
	XrpRemoveTokenRefusal,
	XrpRemoveTokenReviewResult
} from '$xrp/services/xrp-remove-token.services';
import * as xrpRemoveTokenServices from '$xrp/services/xrp-remove-token.services';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

vi.mock('$xrp/services/xrp-remove-token.services', () => ({
	loadXrpRemoveTokenReview: vi.fn()
}));

describe('XrpRemoveTokenConfirmation', () => {
	const token = { ...RLUSD_TOKEN, enabled: true };

	const props = () => ({
		token,
		onCancel: vi.fn(),
		onRefused: vi.fn(),
		onConfirm: vi.fn()
	});

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();
		xrpAddressMainnetStore.set({ certified: true, data: mockXrpAddress });

		vi.mocked(xrpRemoveTokenServices.loadXrpRemoveTokenReview).mockResolvedValue({
			review: { fee: 12n }
		});
	});

	afterEach(() => {
		xrpAddressMainnetStore.reset();
	});

	it('checks the removal for the user’s address', async () => {
		render(XrpRemoveTokenConfirmation, { props: props() });

		await waitFor(() => {
			expect(xrpRemoveTokenServices.loadXrpRemoveTokenReview).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				token,
				address: mockXrpAddress
			});
		});
	});

	it('says what removing the token does', () => {
		const { getByText } = render(XrpRemoveTokenConfirmation, { props: props() });

		expect(
			getByText(en.tokens.import.text.xrp_remove_description.replace('$symbol', 'RLUSD'))
		).toBeInTheDocument();
	});

	it('states the network fee and the reserve the removal releases', async () => {
		const { getByText } = render(XrpRemoveTokenConfirmation, { props: props() });

		await waitFor(() => {
			expect(
				getByText(en.tokens.import.text.xrp_remove_reserve.replace('$amount', '0.2'))
			).toBeInTheDocument();
		});

		expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();
	});

	it('offers Delete only once the review has loaded', async () => {
		let resolve: (result: XrpRemoveTokenReviewResult) => void = () => {};

		vi.mocked(xrpRemoveTokenServices.loadXrpRemoveTokenReview).mockReturnValue(
			new Promise((r) => (resolve = r))
		);

		const { getByTestId } = render(XrpRemoveTokenConfirmation, { props: props() });

		expect(getByTestId(TOKEN_MODAL_DELETE_BUTTON)).toBeDisabled();

		resolve({ review: { fee: 12n } });

		await waitFor(() => expect(getByTestId(TOKEN_MODAL_DELETE_BUTTON)).not.toBeDisabled());
	});

	// Signing another fee than the one shown would charge the user something they never saw.
	it('confirms with the fee it showed', async () => {
		const handlers = props();

		const { getByTestId } = render(XrpRemoveTokenConfirmation, { props: handlers });

		await waitFor(() => expect(getByTestId(TOKEN_MODAL_DELETE_BUTTON)).not.toBeDisabled());

		await fireEvent.click(getByTestId(TOKEN_MODAL_DELETE_BUTTON));

		expect(handlers.onConfirm).toHaveBeenCalledExactlyOnceWith(12n);
	});

	it('cancels', async () => {
		const handlers = props();

		const { getByText } = render(XrpRemoveTokenConfirmation, { props: handlers });

		await fireEvent.click(getByText(en.core.text.cancel));

		expect(handlers.onCancel).toHaveBeenCalledOnce();
		expect(handlers.onConfirm).not.toHaveBeenCalled();
	});

	it('keeps both buttons disabled while the removal is sent', async () => {
		const { getByTestId, getByText } = render(XrpRemoveTokenConfirmation, {
			props: { ...props(), loading: true }
		});

		await waitFor(() =>
			expect(xrpRemoveTokenServices.loadXrpRemoveTokenReview).toHaveBeenCalledOnce()
		);

		expect(getByTestId(TOKEN_MODAL_DELETE_BUTTON)).toBeDisabled();
		expect(getByText(en.core.text.cancel).closest('button')).toBeDisabled();
	});

	it.each<[XrpRemoveTokenRefusal, string]>([
		['transaction_in_flight', en.tokens.import.error.xrp_transaction_in_flight],
		['not_guarded', en.tokens.import.error.xrp_not_guarded],
		['not_held', en.tokens.import.error.xrp_remove_not_held.replace('$symbol', 'RLUSD')],
		[
			'balance_not_zero',
			en.tokens.import.error.xrp_remove_balance_not_zero.replace('$symbol', 'RLUSD')
		],
		['insufficient_fee', en.tokens.import.error.xrp_insufficient_fee],
		['state_unavailable', en.tokens.import.error.xrp_state_unavailable]
	])('says why it cannot remove the token (%s) and gives up', async (...[refusal, text]) => {
		vi.mocked(xrpRemoveTokenServices.loadXrpRemoveTokenReview).mockResolvedValue({ refusal });
		const toastsError = vi.spyOn(toastsStore, 'toastsError');
		const handlers = props();

		render(XrpRemoveTokenConfirmation, { props: handlers });

		await waitFor(() => expect(handlers.onRefused).toHaveBeenCalledOnce());

		expect(toastsError).toHaveBeenCalledExactlyOnceWith({ msg: { text } });
		expect(handlers.onConfirm).not.toHaveBeenCalled();
		expect(handlers.onCancel).not.toHaveBeenCalled();
	});
});
