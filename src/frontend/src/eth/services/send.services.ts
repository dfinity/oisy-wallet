import type { EthSignTransactionRequest } from '$declarations/signer/signer.did';
import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import { infuraCkErc20Providers } from '$eth/providers/infura-ckerc20.providers';
import { infuraCkETHProviders } from '$eth/providers/infura-cketh.providers';
import { infuraErc20IcpProviders } from '$eth/providers/infura-erc20-icp.providers';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import { approve } from '$eth/services/approve.services';
import { processTransactionSent } from '$eth/services/eth-transaction.services';
import { getNonce } from '$eth/services/nonce.services';
import { prepare } from '$eth/services/prepare.services';
import type {
	CkEthPopulateTransaction,
	Erc20PopulateTransaction
} from '$eth/types/contracts-providers';
import type { Erc20ContractAddress, Erc20Token } from '$eth/types/erc20';
import type { EthereumNetwork, NetworkChainId } from '$eth/types/network';
import {
	MobileEthSendPendingError,
	MobileEthSendSessionExpiredError,
	type EthSendTransactionReference,
	type SendParams
} from '$eth/types/send';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { isMobileEthSendDestination, mobileEthSendNetwork } from '$eth/utils/mobile-send.utils';
import { isDestinationContractAddress } from '$eth/utils/send.utils';
import { isErc20Icp } from '$eth/utils/token.utils';
import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
import {
	toCkErc20HelperContractAddress,
	toCkEthHelperContractAddress
} from '$icp-eth/utils/cketh.utils';
import { getEthAddress, signTransaction } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import { MOBILE_SHELL } from '$lib/constants/mobile.constants';
import { ProgressStepsSend } from '$lib/enums/progress-steps';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import { i18n } from '$lib/stores/i18n.store';
import type { NetworkId } from '$lib/types/network';
import type { TransferParams } from '$lib/types/send';
import type { RequiredTransactionFeeData } from '$lib/types/transaction';
import { isNetworkICP } from '$lib/utils/network.utils';
import { assertNonNullish, isNullish, nonNullish, toNullable } from '@dfinity/utils';
import { encodePrincipalToEthAddress } from '@icp-sdk/canisters/cketh';
import { keccak256 } from 'ethers/crypto';
import type { TransactionResponse } from 'ethers/providers';
import { get } from 'svelte/store';

export const ethPrepareTransaction = ({
	to,
	amount,
	maxPriorityFeePerGas: max_priority_fee_per_gas,
	maxFeePerGas: max_fee_per_gas,
	nonce,
	gas,
	data,
	chainId: chain_id
}: TransferParams &
	NetworkChainId & { nonce: number; gas: bigint | undefined }): EthSignTransactionRequest => ({
	to,
	value: amount,
	chain_id,
	nonce: BigInt(nonce),
	gas: gas ?? ETH_BASE_FEE,
	max_fee_per_gas,
	max_priority_fee_per_gas,
	data: toNullable(data)
});

export const erc20PrepareTransaction = async ({
	to,
	amount,
	token,
	populate,
	...rest
}: TransferParams &
	NetworkChainId & {
		nonce: number;
		gas: bigint;
		populate: Erc20PopulateTransaction;
	} & Pick<SendParams, 'token'>): Promise<EthSignTransactionRequest> => {
	const { data } = await populate({
		contract: token as Erc20Token,
		to,
		amount
	});

	if (isNullish(data)) {
		const {
			send: {
				error: { erc20_data_undefined }
			}
		} = get(i18n);

		throw new Error(erc20_data_undefined);
	}

	const { address: contractAddress } = token as Erc20Token;

	return prepare({
		// First, so that a `data` the caller passes along cannot replace the calldata populated here.
		...rest,
		data,
		to: contractAddress,
		amount: ZERO
	});
};

const ethHelperContractPrepareTransaction = async ({
	contract,
	to,
	amount,
	populate,
	...rest
}: TransferParams &
	NetworkChainId & {
		nonce: number;
		gas: bigint;
		populate: CkEthPopulateTransaction;
		contract: Erc20ContractAddress;
	}): Promise<EthSignTransactionRequest> => {
	const { data } = await populate({
		contract,
		to
	});

	if (isNullish(data)) {
		const {
			send: {
				error: { data_undefined }
			}
		} = get(i18n);

		throw new Error(data_undefined);
	}

	const { address: contractAddress } = contract;

	return prepare({
		// First, so that a `data` the caller passes along cannot replace the calldata populated here.
		...rest,
		data,
		to: contractAddress,
		amount
	});
};

/**
 * {@link https://github.com/dfinity/ic/blob/master/rs/ethereum/cketh/docs/ckerc20.adoc#deposit-erc20-to-ckerc20}
 */
const ckErc20HelperContractPrepareTransaction = async ({
	contract,
	to,
	amount,
	networkId,
	token,
	...rest
}: TransferParams &
	NetworkChainId & {
		nonce: number;
		gas: bigint;
		contract: Erc20ContractAddress;
		networkId: NetworkId;
	} & Pick<SendParams, 'token'>): Promise<EthSignTransactionRequest> => {
	const { address: erc20ContractAddress } = token as Erc20Token;

	const { populateTransaction } = infuraCkErc20Providers(networkId);

	const { data } = await populateTransaction({
		contract,
		erc20Contract: { address: erc20ContractAddress },
		to,
		amount
	});

	const { address: contractAddress } = contract;

	return prepare({
		// First, so that a `data` the caller passes along cannot replace the calldata populated here.
		...rest,
		data,
		to: contractAddress,
		amount: ZERO
	});
};

type EthSendParams = Omit<TransferParams, 'maxPriorityFeePerGas' | 'maxFeePerGas'> & {
	customNonce?: number;
	beforeBroadcast?: (transaction: EthSendTransactionReference) => Promise<void>;
	canProceed?: () => boolean;
} & SendParams &
	RequiredTransactionFeeData;

const mobileSendsInFlight = new Set<string>();

const assertMobileSendSession = async ({
	identity,
	canProceed
}: Pick<EthSendParams, 'identity' | 'canProceed'>): Promise<void> => {
	if (!MOBILE_SHELL) {
		return;
	}
	if (canProceed?.() === false) {
		throw new DOMException('Transfer cancelled', 'AbortError');
	}
	const currentIdentity = await AuthClientProvider.getInstance().loadIdentity();
	if (isNullish(currentIdentity) || currentIdentity !== identity) {
		throw new MobileEthSendSessionExpiredError();
	}
	if (canProceed?.() === false) {
		throw new DOMException('Transfer cancelled', 'AbortError');
	}
};

export const send = async (params: EthSendParams): Promise<EthSendTransactionReference> => {
	const key = `${params.identity?.getPrincipal().toText()}:${params.sourceNetwork.chainId}`;
	if (MOBILE_SHELL && mobileSendsInFlight.has(key)) {
		throw new Error(get(i18n).send.error.unexpected);
	}
	if (MOBILE_SHELL) {
		mobileSendsInFlight.add(key);
	}
	try {
		return await executeSend(params);
	} finally {
		mobileSendsInFlight.delete(key);
	}
};

const executeSend = async ({
	lastProgressStep = ProgressStepsSend.DONE,
	progress,
	token,
	identity,
	customNonce,
	beforeBroadcast,
	canProceed,
	...rest
}: EthSendParams): Promise<EthSendTransactionReference> => {
	if (MOBILE_SHELL) {
		const network = mobileEthSendNetwork(token);
		if (
			isNullish(network) ||
			network.id !== rest.sourceNetwork.id ||
			network.chainId !== rest.sourceNetwork.chainId ||
			(nonNullish(rest.targetNetwork) && rest.targetNetwork.id !== network.id) ||
			!isMobileEthSendDestination({ token, destination: rest.to, minterInfo: rest.minterInfo }) ||
			rest.amount <= ZERO ||
			(nonNullish(rest.data) && rest.data !== '0x') ||
			nonNullish(customNonce) ||
			isNullish(beforeBroadcast)
		) {
			throw new Error(get(i18n).send.error.unexpected);
		}
		await assertMobileSendSession({ identity, canProceed });
		// The source address is owned by the active signer, not merely an address left in a store.
		const signerAddress = await getEthAddress({ identity });
		await assertMobileSendSession({ identity, canProceed });
		if (signerAddress.toLowerCase() !== rest.from.toLowerCase()) {
			throw new Error(get(i18n).send.assertion.address_unknown);
		}
	}

	progress?.(ProgressStepsSend.INITIALIZATION);

	// Direct mobile transfers cannot request allowances or a ck-token conversion.
	const { transactionNeededApproval, nonce } = MOBILE_SHELL
		? {
				transactionNeededApproval: false,
				nonce: await getNonce({ from: rest.from, networkId: rest.sourceNetwork.id })
			}
		: await approve({
				progress,
				progressSteps: ProgressStepsSend,
				token,
				identity,
				customNonce,
				...rest
			});

	const nonceTransaction = transactionNeededApproval ? nonce + 1 : nonce;
	const transactionSent = await sendTransaction({
		progress,
		nonce: nonceTransaction,
		token,
		identity,
		beforeBroadcast,
		canProceed,
		...rest
	});

	// The broadcast already succeeded. Failure to refresh the shared activity must not invite a
	// second payment or produce an unhandled rejection containing wallet data.
	Promise.resolve(processTransactionSent({ identity, token, transaction: transactionSent })).catch(
		() => undefined
	);
	progress?.(lastProgressStep);
	return { hash: transactionSent.hash, nonce: nonceTransaction };
};

const sendTransaction = async ({
	progress,
	token,
	from,
	to,
	maxFeePerGas,
	maxPriorityFeePerGas,
	gas,
	sourceNetwork,
	targetNetwork,
	identity,
	minterInfo,
	nonce,
	beforeBroadcast,
	canProceed,
	...rest
}: Omit<TransferParams, 'maxPriorityFeePerGas' | 'maxFeePerGas'> &
	Omit<SendParams, 'lastProgressStep'> &
	RequiredTransactionFeeData & { nonce: number } & Pick<
		EthSendParams,
		'beforeBroadcast' | 'canProceed'
	>): Promise<TransactionResponse> => {
	const { id: networkId, chainId } = sourceNetwork;

	const { sendTransaction } = infuraProviders(networkId);

	const principalEthAddress = (): string => {
		const {
			send: {
				error: { no_identity_calculate_fee }
			}
		} = get(i18n);

		assertNonNullish(identity, no_identity_calculate_fee);
		return encodePrincipalToEthAddress(identity.getPrincipal());
	};

	const ckEthHelperContractAddress = toCkEthHelperContractAddress(minterInfo);
	const ckErc20HelperContractAddress = toCkErc20HelperContractAddress(minterInfo);

	const transferStandard: 'ethereum' | 'erc20' =
		isSupportedEthTokenId(token.id) || isSupportedEvmNativeTokenId(token.id) ? 'ethereum' : 'erc20';

	const networkICP = isNetworkICP(targetNetwork);

	const convertEthToCkEth =
		transferStandard === 'ethereum' &&
		nonNullish(ckEthHelperContractAddress) &&
		isDestinationContractAddress({
			destination: to,
			contractAddress: ckEthHelperContractAddress
		}) &&
		networkICP;

	const convertErc20ToCkErc20 =
		transferStandard === 'erc20' &&
		nonNullish(ckErc20HelperContractAddress) &&
		isDestinationContractAddress({
			destination: to,
			contractAddress: ckErc20HelperContractAddress
		}) &&
		networkICP;

	const signParams: Pick<TransferParams, 'from'> &
		Pick<EthereumNetwork, 'chainId'> & {
			gas: bigint;
			nonce: number;
		} & Pick<TransferParams, 'maxFeePerGas' | 'maxPriorityFeePerGas'> = {
		from,
		nonce,
		gas,
		maxFeePerGas,
		maxPriorityFeePerGas,
		chainId
	};

	const transaction = await (transferStandard === 'ethereum'
		? // Case Ethereum or Sepolia
			convertEthToCkEth
			? ethHelperContractPrepareTransaction({
					...signParams,
					...rest,
					contract: { address: ckEthHelperContractAddress },
					to: principalEthAddress(),
					populate: infuraCkETHProviders(networkId).populateTransaction
				})
			: ethPrepareTransaction({
					...rest,
					...signParams,
					to
				})
		: // Case Erc20
			convertErc20ToCkErc20
			? ckErc20HelperContractPrepareTransaction({
					...rest,
					...signParams,
					contract: { address: ckErc20HelperContractAddress },
					to: principalEthAddress(),
					networkId,
					token
				})
			: erc20PrepareTransaction({
					...rest,
					...signParams,
					to,
					token,
					populate:
						isErc20Icp(token) && networkICP
							? infuraErc20IcpProviders(networkId).populateTransaction
							: infuraErc20Providers(networkId).populateTransaction
				}));

	await assertMobileSendSession({ identity, canProceed });
	progress?.(ProgressStepsSend.SIGN_TRANSFER);

	const rawTransaction = await signTransaction({
		identity,
		transaction,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	await assertMobileSendSession({ identity, canProceed });
	// Save only the hash and nonce before any broadcast. A transport error must not produce a
	// fresh signature and nonce on retry: this hash remains the source of truth for recovery.
	const reference = { hash: nonNullish(beforeBroadcast) ? keccak256(rawTransaction) : '', nonce };
	await beforeBroadcast?.(reference);
	await assertMobileSendSession({ identity, canProceed });
	progress?.(ProgressStepsSend.TRANSFER);
	try {
		return await sendTransaction(rawTransaction);
	} catch (err: unknown) {
		if (MOBILE_SHELL) {
			throw new MobileEthSendPendingError(reference);
		}
		throw err;
	}
};
