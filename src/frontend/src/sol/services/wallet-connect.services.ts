import {
	TRACK_COUNT_WC_SOL_SEND_ERROR,
	TRACK_COUNT_WC_SOL_SEND_SUCCESS
} from '$lib/constants/analytics.constants';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import { ProgressStepsSendSol, ProgressStepsSign } from '$lib/enums/progress-steps';
import { trackEvent } from '$lib/services/analytics.services';
import {
	execute,
	type WalletConnectCallBackParams,
	type WalletConnectExecuteParams
} from '$lib/services/wallet-connect.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { NullishIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
import { consoleWarn } from '$lib/utils/console.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { estimatePriorityFee, getAccountInfo } from '$sol/api/solana.api';
import { TOKEN_2022_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import {
	SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION,
	SESSION_REQUEST_SOL_SIGN_TRANSACTION
} from '$sol/constants/wallet-connect.constants';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import { loadSolProgramNames } from '$sol/services/sol-program-name.services';
import {
	sendSignedTransaction,
	setLifetimeAndFeePayerToTransaction
} from '$sol/services/sol-send.services';
import { signTransaction as executeSign } from '$sol/services/sol-sign.services';
import { simulateSolTransaction } from '$sol/services/sol-simulation.services';
import { calculateAssociatedTokenAddress } from '$sol/services/spl-accounts.services';
import { loadSplTokenMetadata } from '$sol/services/spl-token-metadata.services';
import type { OptionSolAddress, SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SplTokenAddress } from '$sol/types/spl';
import { convertSolComputeUnitPriceToFee } from '$sol/utils/fee.utils';
import { safeMapNetworkIdToNetwork } from '$sol/utils/safe-network.utils';
import { mapSolInstructionSummaries } from '$sol/utils/sol-instruction-summary.utils';
import { asSolParsedRpcInstructionOrSelf } from '$sol/utils/sol-instructions.utils';
import {
	createSigner,
	signMessage as signMessageBytes,
	signTransaction,
	type CreateSignerParams
} from '$sol/utils/sol-sign.utils';
import {
	decodeTransactionMessage,
	isSolCompiledTransactionMessage,
	mapSolTransactionMessage,
	parseSolBase64TransactionMessage
} from '$sol/utils/sol-transactions.utils';
import {
	deriveSolTransferParties,
	mapSolTransferLegs
} from '$sol/utils/sol-transfer-parties.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { WalletKitTypes } from '@reown/walletkit';
import {
	getBase58Decoder,
	getBase58Encoder,
	getBase64Decoder,
	getTransactionEncoder,
	isTransactionMessageWithBlockhashLifetime,
	address as solAddress,
	type Base64EncodedWireTransaction
} from '@solana/kit';
import { get } from 'svelte/store';

interface WalletConnectDecodeTransactionParams {
	base64EncodedTransactionMessage: string;
	networkId: NetworkId;
	address: OptionSolAddress;
}

type WalletConnectSignTransactionParams = WalletConnectExecuteParams & {
	listener: OptionWalletConnectListener;
	address: OptionSolAddress;
	modalNext: () => void;
	progress: (step: ProgressStepsSign | ProgressStepsSendSol.SEND) => void;
	token: Token;
	identity: NullishIdentity;
};

export const decode = async ({
	base64EncodedTransactionMessage,
	networkId,
	address
}: WalletConnectDecodeTransactionParams) => {
	const solNetwork = safeMapNetworkIdToNetwork(networkId);

	const parsedTransactionMessage = await parseSolBase64TransactionMessage({
		transactionMessage: base64EncodedTransactionMessage,
		rpc: solanaHttpRpc(solNetwork)
	});

	const mappedTransaction = mapSolTransactionMessage(parsedTransactionMessage);

	// The review is synchronous, so both the estimate the requested fee is judged against and the
	// simulation are fetched here, where the request is already being decoded before the modal
	// opens. A simulation that lands after the user has approved would be worthless.
	const [prioritizationFeeEstimate, simulation] = await Promise.all([
		estimateSolPrioritizationFee({
			computeUnitLimit: mappedTransaction.computeUnitLimit,
			network: solNetwork
		}),
		simulateSolTransaction({
			base64EncodedTransactionMessage,
			transactionMessage: parsedTransactionMessage,
			address,
			network: solNetwork
		})
	]);

	const {
		preview,
		instructions: simulatedInstructions,
		messageSummary,
		parties: simulatedParties
	} = simulation ?? {};

	// Name the mints and the programs the review is about to show. Best effort and awaited, since
	// the review is synchronous and a name that landed after the modal opened would arrive too late
	// to read.
	const [namedInstructions] = await Promise.all([
		loadSolProgramNames({ instructions: simulatedInstructions ?? [], network: solNetwork }),
		loadSplTokenMetadata({
			tokenAddresses: (preview?.tokenDeltas ?? []).map(({ tokenAddress }) => tokenAddress),
			network: solNetwork
		})
	]);

	const mapped = {
		...mappedTransaction,
		...(nonNullish(prioritizationFeeEstimate) && { prioritizationFeeEstimate }),
		...(nonNullish(preview) && { preview }),
		...(nonNullish(messageSummary) && { messageSummary })
	};

	// Unchecked SPL `Transfer`/`Approve` instructions do not carry the mint, so it is
	// not surfaced by the mapper. Recover it from the source token account (the account
	// being debited) so the review can still show the correct token instead of native
	// SOL. We deliberately do not look at the destination: a native SOL transfer *to* a
	// token account would otherwise be misread as an SPL transfer.
	const tokenAddress =
		mapped.tokenAddress ??
		(await resolveSplTokenAddress({ address: mapped.source, network: solNetwork }));

	// Read whenever either fallback below needs it. A run always reports its parties but only
	// reports instructions when it produced some, so the two are not missing together, and an
	// instruction list built without the user's own accounts cannot tell a send from a receive.
	const owned =
		nonNullish(simulatedParties) && nonNullish(simulatedInstructions)
			? undefined
			: await ownSolAddresses({ address, tokenAddress });

	const parties = simulatedParties ?? {
		...deriveSolTransferParties({
			legs: mapSolTransferLegs(parsedTransactionMessage.instructions),
			...(owned ?? { ownedAddresses: [], addressToOwner: {} })
		}),
		// Without a simulation the legs are whatever the message states itself, and a routed swap
		// states none of them. The lists stay, because losing the destination the review shows
		// today would be a regression, but they must say that they are partial: an empty list
		// reads as "nothing moves", which is the most dangerous thing this review can claim.
		partial: true
	};

	// The list the Operations tab shows. A simulated run reveals the calls made inside other
	// programs, which the message states none of; without one, the message's own top-level
	// instructions are still worth listing, and the review says which of the two it got.
	//
	// The message carries its instructions as raw bytes, so none of them can be read into an
	// effect and every line here is an unrecognised one naming its program. That is the whole
	// point of listing them: without it this fallback produced nothing at all.
	const instructions = nonNullish(simulatedInstructions)
		? namedInstructions
		: await loadSolProgramNames({
				instructions: mapSolInstructionSummaries({
					instructions: [...parsedTransactionMessage.instructions].map(
						asSolParsedRpcInstructionOrSelf
					),
					innerInstructions: [],
					ownedAddresses: owned?.ownedAddresses ?? [],
					includeUnrecognised: true
				}),
				network: solNetwork
			});

	return {
		...mapped,
		...(instructions.length > 0 && {
			instructions,
			simulatedInstructions: nonNullish(simulatedInstructions)
		}),
		...(nonNullish(tokenAddress) && { tokenAddress }),
		parties
	};
};

/**
 * The accounts the user owns, when there is no simulation to read them from.
 *
 * The wallet address alone would not do: SPL transfers name token accounts, so matching on it
 * would put every token transfer in neither list, for exactly the transactions the lists exist to
 * explain. The user's associated token account is derived locally instead, for both token programs
 * since a mint belongs to one or the other, which costs no round trip. Each derived account maps
 * back to the wallet so that it is shown as one, the way the activity list already shows them.
 */
const ownSolAddresses = async ({
	address,
	tokenAddress
}: {
	address: OptionSolAddress;
	tokenAddress: SplTokenAddress | undefined;
}): Promise<{
	ownedAddresses: SolAddress[];
	addressToOwner: Record<SolAddress, SolAddress>;
}> => {
	if (isNullish(address)) {
		return { ownedAddresses: [], addressToOwner: {} };
	}

	if (isNullish(tokenAddress)) {
		return { ownedAddresses: [address], addressToOwner: {} };
	}

	try {
		const ataAddresses = await Promise.all(
			[TOKEN_PROGRAM_ADDRESS, TOKEN_2022_PROGRAM_ADDRESS].map(
				async (tokenOwnerAddress) =>
					await calculateAssociatedTokenAddress({ owner: address, tokenAddress, tokenOwnerAddress })
			)
		);

		return {
			ownedAddresses: [address, ...ataAddresses],
			addressToOwner: ataAddresses.reduce<Record<SolAddress, SolAddress>>(
				(acc, ata) => ({ ...acc, [ata]: address }),
				{}
			)
		};
	} catch (_: unknown) {
		// Deriving an address needs the subtle crypto the browser only offers in a secure context.
		// Losing it costs the lists their token accounts, which the partial marker already covers;
		// letting it throw would cost the user the whole review.
		return { ownedAddresses: [address], addressToOwner: {} };
	}
};

/**
 * What OISY would pay to prioritise this message, so the review can say whether the fee the dApp
 * asks for is in line with the network or far above it.
 *
 * `getRecentPrioritizationFees` quotes micro-lamports per compute unit, so it only becomes a
 * comparable lamport figure once applied to the very compute unit limit this message resolves to.
 */
const estimateSolPrioritizationFee = async ({
	computeUnitLimit,
	network
}: {
	computeUnitLimit?: bigint;
	network: SolanaNetworkType;
}): Promise<bigint | undefined> => {
	if (isNullish(computeUnitLimit)) {
		return undefined;
	}

	try {
		const computeUnitPrice = await estimatePriorityFee({ network });

		return convertSolComputeUnitPriceToFee({ computeUnitPrice, computeUnitLimit });
	} catch (_: unknown) {
		// Best-effort: without an estimate the review falls back to its fiat floor. A failed
		// lookup must never keep the user from seeing the request.
	}
};

/**
 * Decode a Reown Solana `signMessage` request into the human-readable text shown in the review.
 *
 * Reown sends `params.message` as a base58-encoded byte string; we decode it to bytes and read it
 * as UTF-8 (Solana sign-in messages are UTF-8 text). A malformed (non-base58) value falls back to
 * the raw string so the review screen still renders instead of throwing.
 */
export const decodeMessage = (request: WalletKitTypes.SessionRequest): string => {
	const { message } = request.params.request.params as { message?: string };

	if (isNullish(message)) {
		return '';
	}

	try {
		return new TextDecoder().decode(Uint8Array.from(getBase58Encoder().encode(message)));
	} catch (_: unknown) {
		return message;
	}
};

const resolveSplTokenAddress = async ({
	address,
	network
}: {
	address: OptionSolAddress;
	network: SolanaNetworkType;
}): Promise<SplTokenAddress | undefined> => {
	if (isNullish(address)) {
		return undefined;
	}

	try {
		const { value } = await getAccountInfo({ address, network });

		if (nonNullish(value) && 'parsed' in value.data) {
			const { mint } = value.data.parsed.info as { mint?: SplTokenAddress };

			return mint;
		}
	} catch (_: unknown) {
		// Best-effort: a failed lookup must not break the review, which simply falls
		// back to the native SOL token.
	}

	return undefined;
};

const getSignatureWithoutSending = async ({
	identity,
	base64EncodedTransactionMessage,
	address,
	network
}: CreateSignerParams & { base64EncodedTransactionMessage: string }): Promise<string> => {
	const decodedTransactionMessage = decodeTransactionMessage(base64EncodedTransactionMessage);

	const signaturesMap = await signTransaction({
		identity,
		transaction: decodedTransactionMessage,
		address,
		network
	});

	const customSign = signaturesMap[solAddress(address)];

	return getBase58Decoder().decode(customSign);
};

const getSignatureWithSending = async ({
	identity,
	base64EncodedTransactionMessage,
	address,
	network,
	progress
}: {
	identity: NullishIdentity;
	base64EncodedTransactionMessage: string;
	address: SolAddress;
	network: SolanaNetworkType;
	progress: (step: ProgressStepsSign | ProgressStepsSendSol.SEND) => void;
}): Promise<string | undefined> => {
	const { signatures } = decodeTransactionMessage(base64EncodedTransactionMessage);

	const additionalSigners = Object.entries(signatures).reduce<string[]>(
		(acc, [a, signature]) => [...acc, ...(a !== address && isNullish(signature) ? [a] : [])],
		[]
	);

	// We cannot send transaction with additional signers that have not signed yet
	if (additionalSigners.length > 0) {
		consoleWarn(
			`WalletConnect Solana transaction has additional signers that have not signed yet: ${additionalSigners}`
		);

		return;
	}

	const rpc = solanaHttpRpc(network);

	const transactionMessageRaw = await parseSolBase64TransactionMessage({
		transactionMessage: base64EncodedTransactionMessage,
		rpc
	});

	// It should not happen, since we receive transaction with blockhash lifetime,
	// but just to guarantee the correct type casting
	if (!isTransactionMessageWithBlockhashLifetime(transactionMessageRaw)) {
		consoleWarn(
			'WalletConnect Solana transaction does not have blockhash lifetime, cannot be sent'
		);

		return;
	}

	const signer = createSigner({
		identity,
		address,
		network
	});

	const transactionMessage = await setLifetimeAndFeePayerToTransaction({
		transactionMessage: transactionMessageRaw,
		rpc,
		feePayer: signer
	});

	const { signedTransaction, signature } = await executeSign(transactionMessage);

	const transactionBytes = getBase64Decoder().decode(
		getTransactionEncoder().encode(signedTransaction)
	);

	const { simulateTransaction } = rpc;

	const simulationResult = await simulateTransaction(
		transactionBytes as Base64EncodedWireTransaction,
		{
			encoding: 'base64'
		}
	).send();

	if (nonNullish(simulationResult.value.err)) {
		// In case of simulation error, it is useful to log the error to the console for development purposes
		consoleWarn('WalletConnect Solana transaction simulation error', simulationResult);
	}

	progress(ProgressStepsSendSol.SEND);

	await sendSignedTransaction({ rpc, signedTransaction });

	return signature;
};

export const sign = ({
	address,
	modalNext,
	token,
	progress,
	identity,
	...params
}: WalletConnectSignTransactionParams): Promise<ResultSuccess> =>
	execute({
		params,
		callback: async ({
			request,
			listener
		}: WalletConnectCallBackParams): Promise<
			ResultSuccess & {
				amount?: bigint;
				destination?: SolAddress;
			}
		> => {
			const {
				id,
				topic,
				params: {
					request: {
						method,
						params: { transaction: base64EncodedTransactionMessage }
					}
				}
			} = request;

			const {
				network: { id: networkId }
			} = token;

			if (isNullish(address)) {
				toastsError({
					msg: { text: get(i18n).wallet_connect.error.wallet_not_initialized }
				});
				return { success: false };
			}

			const solNetwork = safeMapNetworkIdToNetwork(networkId);

			const parsedTransactionMessage = await parseSolBase64TransactionMessage({
				transactionMessage: base64EncodedTransactionMessage,
				rpc: solanaHttpRpc(solNetwork)
			});

			const { amount, destination, ambiguous } = mapSolTransactionMessage(parsedTransactionMessage);

			// The review screen collapses the transaction to a single source/destination/amount.
			// When the message bundles instructions that disagree on those fields, that summary
			// would hide part of the fund flow (e.g. a transfer to an attacker alongside a benign
			// one). Refuse to sign anything we cannot display faithfully.
			if (ambiguous) {
				toastsError({
					msg: { text: get(i18n).wallet_connect.error.ambiguous_transaction }
				});

				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				return { success: false };
			}

			// TODO: add assertions checks about amount, payer, source and destination when we will able to properly parse them for ALL the transactions

			modalNext();

			try {
				progress(ProgressStepsSign.SIGN);

				const signature =
					method === SESSION_REQUEST_SOL_SIGN_TRANSACTION
						? await getSignatureWithoutSending({
								identity,
								base64EncodedTransactionMessage,
								address,
								network: solNetwork
							})
						: method === SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION
							? await getSignatureWithSending({
									identity,
									base64EncodedTransactionMessage,
									address,
									network: solNetwork,
									progress
								})
							: undefined;

				if (isNullish(signature)) {
					return { success: false };
				}

				progress(ProgressStepsSign.APPROVE_WALLET_CONNECT);

				await listener.approveRequest({
					id,
					topic,
					message: { signature }
				});

				progress(ProgressStepsSign.DONE);

				trackEvent({
					name: TRACK_COUNT_WC_SOL_SEND_SUCCESS,
					metadata: {
						token: token.symbol
					}
				});

				return { success: true, amount, destination };
			} catch (err: unknown) {
				trackEvent({
					name: TRACK_COUNT_WC_SOL_SEND_ERROR,
					metadata: {
						token: token.symbol
					}
				});

				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				throw err;
			}
		},
		toastMsg: replacePlaceholders(get(i18n).wallet_connect.info.transaction_executed, {
			$method: params.request.params.request.method
		})
	});

/**
 * Reown sends the `signMessage` payload base58-encoded (per the Reown Solana RPC reference). A
 * value that is not base58 carries no bytes to review or sign, so it is reported as an unusable
 * parameter rather than thrown on.
 */
const decodeBase58Message = (message: string): Uint8Array | undefined => {
	try {
		return Uint8Array.from(getBase58Encoder().encode(message));
	} catch (_: unknown) {
		return undefined;
	}
};

type WalletConnectSignMessageParams = WalletConnectExecuteParams & {
	listener: OptionWalletConnectListener;
	address: OptionSolAddress;
	networkId: NetworkId;
	modalNext: () => void;
	progress: (step: ProgressStepsSign) => void;
	identity: NullishIdentity;
};

export const signMessage = ({
	address,
	networkId,
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

			const messageBytes = decodeBase58Message(message);

			if (isNullish(messageBytes)) {
				toastsError({
					msg: { text: get(i18n).wallet_connect.error.unknown_parameter }
				});

				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				return { success: false };
			}

			// What is signed is decided by the requested method, never by what the payload parses as.
			// This method signs messages, so a transaction is refused rather than rendered as text.
			//
			// It has to be refused rather than merely displayed differently: Ed25519 signs the raw
			// bytes, and the transaction flow signs the compiled transaction message bytes with this
			// very key, derivation path and no domain separator or prefix. A signature taken here over
			// a transaction message is therefore byte-for-byte a usable transaction signature, while
			// the review that obtained it shows no amount, destination, fee, decoded instruction,
			// warning or simulation.
			if (isSolCompiledTransactionMessage(messageBytes)) {
				toastsError({
					msg: { text: get(i18n).wallet_connect.error.sol_transaction_as_message }
				});

				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				return { success: false };
			}

			modalNext();

			try {
				progress(ProgressStepsSign.SIGN);

				// Ed25519 signs the raw message bytes, and the response signature is base58 too (per the
				// Reown Solana RPC reference).
				const signatureBytes = await signMessageBytes({
					identity,
					network: safeMapNetworkIdToNetwork(networkId),
					message: messageBytes
				});

				const signature = getBase58Decoder().decode(signatureBytes);

				progress(ProgressStepsSign.APPROVE_WALLET_CONNECT);

				await listener.approveRequest({
					id,
					topic,
					message: { signature }
				});

				progress(ProgressStepsSign.DONE);

				return { success: true };
			} catch (err: unknown) {
				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				throw err;
			}
		},
		toastMsg: get(i18n).wallet_connect.info.sign_executed
	});
