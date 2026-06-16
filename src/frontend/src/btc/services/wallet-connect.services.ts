import {
	BTC_ECDSA_DERIVATION_PATH,
	BTC_ECDSA_KEY_ID
} from '$btc/constants/wallet-connect.constants';
import type { OptionBtcAddress } from '$btc/types/address';
import {
	bitcoinSignedMessageHash,
	deriveBtcPublicKey,
	encodeRecoverableSignature
} from '$btc/utils/wallet-connect.utils';
import { genericSignWithEcdsa } from '$lib/api/signer.api';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import { ProgressStepsSign } from '$lib/enums/progress-steps';
import {
	execute,
	type WalletConnectCallBackParams,
	type WalletConnectExecuteParams
} from '$lib/services/wallet-connect.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { NullishIdentity } from '$lib/types/identity';
import type { ResultSuccess } from '$lib/types/utils';
import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { isNullish } from '@dfinity/utils';
import type { WalletKitTypes } from '@reown/walletkit';
import { get } from 'svelte/store';

type WalletConnectSignMessageParams = WalletConnectExecuteParams & {
	listener: OptionWalletConnectListener;
	address: OptionBtcAddress;
	modalNext: () => void;
	progress: (step: ProgressStepsSign) => void;
	identity: NullishIdentity;
};

/**
 * Extract the message of a Reown bitcoin `signMessage` request.
 *
 * Reown sends the message as a UTF-8 string in `params.message`; we keep the raw value for both
 * the review screen and the Bitcoin signed-message hashing.
 */
export const decodeMessage = (request: WalletKitTypes.SessionRequest): string => {
	const { message } = request.params.request.params as { message?: string };

	return message ?? '';
};

export const sign = ({
	address,
	modalNext,
	progress,
	identity,
	...params
}: WalletConnectSignMessageParams): Promise<ResultSuccess> =>
	execute({
		params,
		callback: async ({
			request,
			listener
		}: WalletConnectCallBackParams): Promise<ResultSuccess> => {
			const { id, topic } = request;

			const { message } = request.params.request.params as { message?: string };

			if (isNullish(address)) {
				toastsError({
					msg: { text: get(i18n).wallet_connect.error.wallet_not_initialized }
				});

				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				return { success: false };
			}

			if (isNullish(message)) {
				toastsError({
					msg: { text: get(i18n).wallet_connect.error.unknown_parameter }
				});

				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				return { success: false };
			}

			if (isNullish(identity)) {
				toastsError({
					msg: { text: get(i18n).auth.error.no_internet_identity }
				});

				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				return { success: false };
			}

			modalNext();

			try {
				progress(ProgressStepsSign.SIGN);

				const messageHash = bitcoinSignedMessageHash(message);

				const rawSignature = await genericSignWithEcdsa({
					identity,
					derivationPath: BTC_ECDSA_DERIVATION_PATH,
					keyId: BTC_ECDSA_KEY_ID,
					messageHash
				});

				const publicKey = deriveBtcPublicKey({ principal: identity.getPrincipal() });

				const signature = encodeRecoverableSignature({
					signature: rawSignature,
					messageHash,
					publicKey
				});

				progress(ProgressStepsSign.APPROVE_WALLET_CONNECT);

				await listener.approveRequest({
					id,
					topic,
					message: { signature, address }
				});

				progress(ProgressStepsSign.DONE);

				return { success: true };
			} catch (err: unknown) {
				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				throw err;
			}
		},
		toastMsg: replacePlaceholders(get(i18n).wallet_connect.info.transaction_executed, {
			$method: params.request.params.request.method
		})
	});
