import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import IcSendTokenWizard from '$icp/components/send/IcSendTokenWizard.svelte';
import * as icSendServices from '$icp/services/ic-send.services';
import * as nftSendServices from '$icp/services/nft-send.services';
import { MobileSendSessionExpiredError } from '$icp/types/ic-send';
import { CanisterInternalError } from '$lib/canisters/errors';
import { TRACK_NFT_SEND } from '$lib/constants/analytics.constants';
import * as mobile from '$lib/constants/mobile.constants';
import {
	REVIEW_FORM_SEND_BUTTON,
	SEND_FIRST_TIME_DESTINATION_CONFIRM
} from '$lib/constants/test-ids.constants';
import * as authDerived from '$lib/derived/auth.derived';
import { PLAUSIBLE_EVENT_NFT_SEND_ERROR_TYPES } from '$lib/enums/plausible';
import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
import { WizardStepsSend } from '$lib/enums/wizard-steps';
import * as analytics from '$lib/services/analytics.services';
import * as authServices from '$lib/services/auth.services';
import { initSendContext, SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import * as toasts from '$lib/stores/toasts.store';
import { mockValidDip721Token } from '$tests/mocks/dip721-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import {
	mockAccountIdentifierText,
	mockIdentity,
	mockPrincipalText
} from '$tests/mocks/identity.mock';
import { mockValidDip721Nft } from '$tests/mocks/nfts.mock';
import {
	CertifiedRejectErrorCode,
	RejectError,
	ReplicaRejectCode,
	requestIdOf
} from '@icp-sdk/core/agent';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('IcSendTokenWizard', () => {
	const nft = mockValidDip721Nft;

	const renderReview = () =>
		render(IcSendTokenWizard, {
			props: {
				currentStep: { name: WizardStepsSend.REVIEW, title: WizardStepsSend.REVIEW },
				destination: mockPrincipalText,
				amount: undefined,
				sendProgressStep: ProgressStepsSendIc.INITIALIZATION,
				nft,
				onBack: vi.fn(),
				onClose: vi.fn(),
				onNext: vi.fn(),
				onSendBack: vi.fn(),
				onTokensList: vi.fn()
			},
			context: new Map([[SEND_CONTEXT_KEY, initSendContext({ token: mockValidDip721Token })]])
		});

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(authDerived, 'authIdentity', 'get').mockImplementation(() => readable(mockIdentity));
		vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
		vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));
	});

	describe('when the NFT send fails', () => {
		// As the agent raises it: the message carries the IC request id and the collection's own text.
		const rejectedCall = RejectError.fromCode(
			new CertifiedRejectErrorCode(
				requestIdOf({ method_name: 'transfer' }),
				ReplicaRejectCode.CanisterError,
				`Canister trapped: caller ${mockPrincipalText} is not the owner`,
				'IC0503'
			)
		);

		it.each([
			{
				err: new CanisterInternalError(`Unauthorized account: ${mockAccountIdentifierText}`),
				errorType: PLAUSIBLE_EVENT_NFT_SEND_ERROR_TYPES.CANISTER_ERROR
			},
			{ err: rejectedCall, errorType: PLAUSIBLE_EVENT_NFT_SEND_ERROR_TYPES.CALL_REJECTED },
			{
				err: new Error('Invalid character: "."'),
				errorType: PLAUSIBLE_EVENT_NFT_SEND_ERROR_TYPES.UNKNOWN
			}
		])('tracks $errorType in place of the error message', async ({ err, errorType }) => {
			vi.spyOn(nftSendServices, 'sendNft').mockRejectedValueOnce(err);

			const { getByTestId } = renderReview();

			// The destination was never sent to, so the send button waits for this confirmation.
			await fireEvent.click(getByTestId(SEND_FIRST_TIME_DESTINATION_CONFIRM));
			await fireEvent.click(getByTestId(REVIEW_FORM_SEND_BUTTON));

			await waitFor(() =>
				expect(analytics.trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: TRACK_NFT_SEND,
					metadata: {
						resultStatus: 'error',
						token: mockValidDip721Token.symbol,
						collection: nft.collection.name,
						address: nft.collection.address,
						tokenId: String(nft.id),
						network: mockValidDip721Token.network.name,
						result_error_type: errorType
					}
				})
			);
		});
	});
});

describe('fungible ICP Send confirmation', () => {
	const close = vi.fn();
	const back = vi.fn();
	const next = vi.fn();
	const renderReview = () =>
		render(IcSendTokenWizard, {
			props: {
				currentStep: { name: WizardStepsSend.REVIEW, title: 'Review' },
				destination: mockPrincipalText,
				amount: 0.0025,
				sendProgressStep: ProgressStepsSendIc.INITIALIZATION,
				onBack: back,
				onClose: close,
				onNext: next,
				onSendBack: vi.fn(),
				onTokensList: vi.fn()
			},
			context: new Map([
				[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN, customSendBalance: 100_000_000n })]
			])
		});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(readable(mockIdentity));
		vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
		vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));
	});

	afterEach(() => vi.restoreAllMocks());

	it('requires acknowledgement and sends the exact atomic amount once across rapid taps', async () => {
		const pending = Promise.withResolvers<undefined>();
		vi.spyOn(icSendServices, 'sendIc').mockReturnValue(pending.promise);
		const { getByTestId, unmount } = renderReview();
		const button = getByTestId(REVIEW_FORM_SEND_BUTTON);

		expect(button).toBeDisabled();

		await fireEvent.click(getByTestId(SEND_FIRST_TIME_DESTINATION_CONFIRM));
		button.click();
		button.click();

		expect(icSendServices.sendIc).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ amount: 250_000n, identity: mockIdentity, token: ICP_TOKEN })
		);
		expect(next).toHaveBeenCalledOnce();

		await unmount();
		pending.resolve(undefined);
		await pending.promise;

		expect(close).not.toHaveBeenCalled();
	});

	it('Back from review does not send', async () => {
		vi.spyOn(icSendServices, 'sendIc').mockResolvedValue(undefined);
		const { getByText } = renderReview();
		await fireEvent.click(getByText(en.core.text.back));

		expect(back).toHaveBeenCalledOnce();
		expect(icSendServices.sendIc).not.toHaveBeenCalled();
	});

	it('ends an expired mobile session instead of submitting again', async () => {
		vi.spyOn(mobile, 'MOBILE_SHELL', 'get').mockReturnValue(true);
		vi.spyOn(authServices, 'idleSignOut').mockResolvedValue(undefined);
		vi.spyOn(icSendServices, 'sendIc').mockRejectedValue(new MobileSendSessionExpiredError());
		const { getByTestId } = renderReview();
		await fireEvent.click(getByTestId(SEND_FIRST_TIME_DESTINATION_CONFIRM));
		await fireEvent.click(getByTestId(REVIEW_FORM_SEND_BUTTON));
		await waitFor(() => expect(authServices.idleSignOut).toHaveBeenCalledOnce());

		expect(back).not.toHaveBeenCalled();
	});

	it('closes an uncertain mobile result with a history-check message and no immediate retry', async () => {
		vi.spyOn(mobile, 'MOBILE_SHELL', 'get').mockReturnValue(true);
		vi.spyOn(icSendServices, 'sendIc').mockRejectedValue(new Error('Transport lost'));
		const { getByTestId } = renderReview();
		await fireEvent.click(getByTestId(SEND_FIRST_TIME_DESTINATION_CONFIRM));
		await fireEvent.click(getByTestId(REVIEW_FORM_SEND_BUTTON));
		await waitFor(() => expect(close).toHaveBeenCalledOnce());

		expect(toasts.toastsError).toHaveBeenCalledWith({
			msg: { text: en.send.error.mobile_unconfirmed }
		});

		await fireEvent.click(getByTestId(REVIEW_FORM_SEND_BUTTON));

		expect(icSendServices.sendIc).toHaveBeenCalledOnce();
		expect(back).not.toHaveBeenCalled();
	});
});
