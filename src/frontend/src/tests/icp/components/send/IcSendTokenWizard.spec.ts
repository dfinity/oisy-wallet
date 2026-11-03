import IcSendTokenWizard from '$icp/components/send/IcSendTokenWizard.svelte';
import * as nftSendServices from '$icp/services/nft-send.services';
import { CanisterInternalError } from '$lib/canisters/errors';
import { TRACK_NFT_SEND } from '$lib/constants/analytics.constants';
import {
	REVIEW_FORM_SEND_BUTTON,
	SEND_FIRST_TIME_DESTINATION_CONFIRM
} from '$lib/constants/test-ids.constants';
import * as authDerived from '$lib/derived/auth.derived';
import { PLAUSIBLE_EVENT_NFT_SEND_ERROR_TYPES } from '$lib/enums/plausible';
import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
import { WizardStepsSend } from '$lib/enums/wizard-steps';
import * as analytics from '$lib/services/analytics.services';
import { initSendContext, SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import * as toasts from '$lib/stores/toasts.store';
import { mockValidDip721Token } from '$tests/mocks/dip721-tokens.mock';
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
