import {
	BTC_ECDSA_DERIVATION_PATH,
	BTC_ECDSA_KEY_ID
} from '$btc/constants/wallet-connect.constants';
import type { OptionBtcAddress } from '$btc/types/address';
import {
	bitcoinSignedMessageHash,
	buildBtcAccountAddresses,
	deriveBtcPublicKey,
	encodeRecoverableSignature
} from '$btc/utils/wallet-connect.utils';
import { BIP122_CHAINS } from '$env/bip122-chains.env';
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
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
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

interface WalletConnectGetAccountAddressesParams {
	listener: OptionWalletConnectListener;
	request: WalletKitTypes.SessionRequest;
	identity: NullishIdentity;
	// First-external P2WPKH address per BTC network. Keyed by network id so we can resolve the one
	// matching the request's CAIP-2 chain id.
	addresses: Map<NetworkId, OptionBtcAddress>;
}

/**
 * Resolve the BTC network and address the request targets from its CAIP-2 chain id
 * (`bip122:<genesis>`).
 *
 * Falls back to a nullish address when the chain id is unknown or its address is not loaded; the
 * caller then rejects the request. The network id is surfaced so the advertised BIP-84 derivation
 * path can be chosen per network (mainnet vs test networks).
 */
const resolveRequestTarget = ({
	request,
	addresses
}: Pick<WalletConnectGetAccountAddressesParams, 'request' | 'addresses'>): {
	networkId: NetworkId | undefined;
	address: OptionBtcAddress;
} => {
	const { chainId } = request.params;

	const networkId: NetworkId | undefined = BIP122_CHAINS[chainId]?.networkId;

	return {
		networkId,
		address: nonNullish(networkId) ? addresses.get(networkId) : undefined
	};
};

/**
 * Respond to a Reown bitcoin `getAccountAddresses` request directly, without a user modal.
 *
 * The request only reveals the account's already-public BTC address, public key and derivation
 * path — no signing and no spend — so it is answered automatically (mirroring how dApps also read
 * it from `sessionProperties.bip122_getAccountAddresses` on approval). Rejects with the standard
 * WalletConnect error when the targeted address or the identity is missing.
 */
export const getAccountAddresses = ({
	listener,
	request,
	identity,
	addresses
}: WalletConnectGetAccountAddressesParams): Promise<ResultSuccess> =>
	execute({
		params: { request, listener },
		callback: async ({
			request,
			listener
		}: WalletConnectCallBackParams): Promise<ResultSuccess> => {
			const { id, topic } = request;

			const { address, networkId } = resolveRequestTarget({ request, addresses });

			if (isNullish(address) || isNullish(networkId)) {
				toastsError({
					msg: { text: get(i18n).wallet_connect.error.wallet_not_initialized }
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

			try {
				const message = buildBtcAccountAddresses({
					address,
					principal: identity.getPrincipal(),
					networkId
				});

				await listener.approveRequest({ id, topic, message });

				return { success: true };
			} catch (err: unknown) {
				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				throw err;
			}
		},
		toastMsg: replacePlaceholders(get(i18n).wallet_connect.info.transaction_executed, {
			$method: request.params.request.method
		})
	});

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
