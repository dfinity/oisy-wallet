import {
	BTC_ECDSA_DERIVATION_PATH,
	BTC_ECDSA_KEY_ID
} from '$btc/constants/wallet-connect.constants';
import type { OptionBtcAddress } from '$btc/types/address';
import type {
	WalletConnectBtcDecodedPsbt,
	WalletConnectBtcDecodedPsbtInput,
	WalletConnectBtcDecodedPsbtOutput
} from '$btc/types/wallet-connect';
import {
	bitcoinSignedMessageHash,
	buildBtcAccountAddresses,
	deriveBtcPublicKey,
	encodeRecoverableSignature
} from '$btc/utils/wallet-connect.utils';
import { BIP122_CHAINS } from '$env/bip122-chains.env';
import { BTC_MAINNET_NETWORK_ID, BTC_TESTNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { genericSignWithEcdsa } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
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
import { address as btcAddressLib, networks, payments, Psbt, type Network } from 'bitcoinjs-lib';
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

// Reown bitcoin `signPsbt` request parameters —
// https://docs.reown.com/advanced/multichain/rpc-reference/bitcoin-rpc
interface WalletConnectSignPsbtRequestParams {
	psbt?: string;
	signInputs?: { address?: string; index?: number; sighashTypes?: number[] }[];
	broadcast?: boolean;
}

const bitcoinJsNetwork = (chainId: string | undefined): Network => {
	const networkId = nonNullish(chainId) ? BIP122_CHAINS[chainId]?.networkId : undefined;

	if (networkId === BTC_MAINNET_NETWORK_ID) {
		return networks.bitcoin;
	}

	if (networkId === BTC_TESTNET_NETWORK_ID) {
		return networks.testnet;
	}

	// Regtest (local-only) shares testnet address parameters; default to it for non-mainnet chains.
	return networks.regtest;
};

const safeOutputAddress = ({
	script,
	network
}: {
	script: Uint8Array;
	network: Network;
}): string | undefined => {
	try {
		return btcAddressLib.fromOutputScript(Buffer.from(script), network);
	} catch (_: unknown) {
		// Non-standard / unparsable scripts (e.g. OP_RETURN) have no address representation.
	}
};

/**
 * Decode a Reown bitcoin `signPsbt` request for the review screen.
 *
 * Parses the base64 PSBT with bitcoinjs-lib and surfaces the inputs, outputs, the total value of the
 * wallet-owned inputs being signed, the fee and the `broadcast` flag, so the user never blind-signs.
 * Throws if the PSBT is missing or cannot be parsed.
 */
export const decodePsbt = ({
	request,
	address
}: {
	request: WalletKitTypes.SessionRequest;
	address: OptionBtcAddress;
}): WalletConnectBtcDecodedPsbt => {
	const { psbt, broadcast } = request.params.request.params as WalletConnectSignPsbtRequestParams;

	if (isNullish(psbt)) {
		throw new Error('Missing PSBT in the WalletConnect signPsbt request.');
	}

	const network = bitcoinJsNetwork(request.params.chainId);
	const parsed = Psbt.fromBase64(psbt, { network });

	const inputs: WalletConnectBtcDecodedPsbtInput[] = parsed.data.inputs.map((input) => {
		const { witnessUtxo } = input;
		const inputAddress = nonNullish(witnessUtxo)
			? safeOutputAddress({ script: witnessUtxo.script, network })
			: undefined;

		return {
			address: inputAddress,
			value: nonNullish(witnessUtxo) ? BigInt(witnessUtxo.value) : undefined,
			signedByWallet: nonNullish(address) && inputAddress === address
		};
	});

	const outputs: WalletConnectBtcDecodedPsbtOutput[] = parsed.txOutputs.map(
		({ value, address: outputAddress, script }) => ({
			address: outputAddress ?? safeOutputAddress({ script, network }),
			value: BigInt(value)
		})
	);

	const totalSignedInputs = inputs.reduce(
		(acc, { value, signedByWallet }) => (signedByWallet && nonNullish(value) ? acc + value : acc),
		ZERO
	);

	// Fee is only knowable when every input carries its UTXO value (P2WPKH inputs always do).
	const allInputsHaveValue = inputs.every(({ value }) => nonNullish(value));
	const fee = allInputsHaveValue
		? inputs.reduce((acc, { value }) => acc + (value ?? ZERO), ZERO) -
			outputs.reduce((acc, { value }) => acc + value, ZERO)
		: undefined;

	return {
		inputs,
		outputs,
		totalSignedInputs,
		fee,
		broadcast: broadcast ?? false
	};
};

type WalletConnectSignPsbtParams = WalletConnectExecuteParams & {
	listener: OptionWalletConnectListener;
	address: OptionBtcAddress;
	modalNext: () => void;
	progress: (step: ProgressStepsSign) => void;
	identity: NullishIdentity;
};

/**
 * Sign a Reown bitcoin `signPsbt` request (sign-only, `broadcast: false`).
 *
 * Only the wallet's own P2WPKH inputs listed in `signInputs` are signed. bitcoinjs-lib computes the
 * BIP-143 sighash (SIGHASH_ALL) internally and we delegate the raw secp256k1 signature to
 * `generic_sign_with_ecdsa` via a custom async signer whose public key is the caller's derived
 * P2WPKH key. We attach the partial signatures and return the updated PSBT WITHOUT finalizing or
 * broadcasting — the dApp finalizes/broadcasts. `broadcast: true` is rejected (deferred work) and
 * non-P2WPKH inputs (e.g. Taproot/ordinals) are out of scope and rejected.
 */
export const signPsbt = ({
	address,
	modalNext,
	progress,
	identity,
	...params
}: WalletConnectSignPsbtParams): Promise<ResultSuccess> =>
	execute({
		params,
		callback: async ({
			request,
			listener
		}: WalletConnectCallBackParams): Promise<ResultSuccess> => {
			const { id, topic } = request;

			const {
				psbt,
				signInputs,
				broadcast = false
			} = request.params.request.params as WalletConnectSignPsbtRequestParams;

			if (isNullish(address)) {
				toastsError({ msg: { text: get(i18n).wallet_connect.error.wallet_not_initialized } });
				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });
				return { success: false };
			}

			if (isNullish(psbt)) {
				toastsError({ msg: { text: get(i18n).wallet_connect.error.unknown_parameter } });
				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });
				return { success: false };
			}

			if (isNullish(identity)) {
				toastsError({ msg: { text: get(i18n).auth.error.no_internet_identity } });
				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });
				return { success: false };
			}

			if (broadcast) {
				toastsError({ msg: { text: get(i18n).wallet_connect.error.btc_broadcast_not_supported } });
				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });
				return { success: false };
			}

			// TODO(security): temporary workaround — restrict signPsbt to BTC mainnet.
			// OISY derives a single ECDSA key for all BTC networks, so the P2WPKH script and the
			// BIP-143 sighash are identical across mainnet/testnet/regtest; a signature obtained via a
			// non-mainnet request is therefore valid for a mainnet spend of the same key. Until BTC keys
			// are network-segregated (or the UTXO's network can be cryptographically proven), reject
			// non-mainnet signPsbt. This guard is independent of the approved WC namespaces because
			// incoming session_request chainIds are NOT validated against them.
			// `bitcoinJsNetwork` is the single chainId→network mapping; unknown/non-mainnet chains
			// resolve to a non-`networks.bitcoin` value, so this also covers unknown chain ids.
			const network = bitcoinJsNetwork(request.params.chainId);

			if (network !== networks.bitcoin) {
				toastsError({
					msg: { text: get(i18n).wallet_connect.error.btc_non_mainnet_sign_not_supported }
				});
				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });
				return { success: false };
			}

			modalNext();

			try {
				progress(ProgressStepsSign.SIGN);

				const parsed = Psbt.fromBase64(psbt, { network });

				const publicKey = Buffer.from(deriveBtcPublicKey({ principal: identity.getPrincipal() }));

				// Expected P2WPKH script for the wallet's own key — used to confirm an input is ours and
				// of the only address type we can sign (the signer manages a single P2WPKH key).
				const walletWitnessScript = payments.p2wpkh({ pubkey: publicKey, network }).output;

				const signer = {
					publicKey,
					sign: async (hash: Buffer): Promise<Buffer> => {
						const rawSignature = await genericSignWithEcdsa({
							identity,
							derivationPath: BTC_ECDSA_DERIVATION_PATH,
							keyId: BTC_ECDSA_KEY_ID,
							messageHash: Uint8Array.from(hash)
						});

						return Buffer.from(rawSignature);
					}
				};

				// Reown's `signInputs` selects which inputs to sign; if absent, sign every input that is
				// ours. Each must be a P2WPKH input owned by this wallet — anything else is rejected.
				const indicesToSign = nonNullish(signInputs)
					? signInputs
							.map(({ index }) => index)
							.filter((index): index is number => nonNullish(index))
					: parsed.data.inputs.map((_, index) => index);

				for (const index of indicesToSign) {
					const input = parsed.data.inputs[index];

					if (isNullish(input?.witnessUtxo)) {
						toastsError({
							msg: { text: get(i18n).wallet_connect.error.btc_psbt_input_not_segwit }
						});
						await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });
						return { success: false };
					}

					if (
						isNullish(walletWitnessScript) ||
						Buffer.compare(
							Buffer.from(input.witnessUtxo.script),
							Buffer.from(walletWitnessScript)
						) !== 0
					) {
						toastsError({
							msg: { text: get(i18n).wallet_connect.error.btc_psbt_input_not_owned }
						});
						await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });
						return { success: false };
					}

					await parsed.signInputAsync(index, signer);
				}

				progress(ProgressStepsSign.APPROVE_WALLET_CONNECT);

				await listener.approveRequest({
					id,
					topic,
					message: { psbt: parsed.toBase64() }
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
