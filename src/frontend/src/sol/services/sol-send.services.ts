import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsSendSol } from '$lib/enums/progress-steps';
import type { OptionSolAddress, SolAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import { loadTokenAccount } from '$sol/api/solana.api';
import { solanaHttpRpc, solanaWebSocketRpc } from '$sol/providers/sol-rpc.providers';
import { signTransaction } from '$sol/services/sol-sign.services';
import {
	calculateAssociatedTokenAddress,
	createAtaInstruction
} from '$sol/services/spl-accounts.services';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolTransactionMessage } from '$sol/types/sol-send';
import type { SolSignedTransaction } from '$sol/types/sol-transaction';
import type { SplToken } from '$sol/types/spl';
import { safeMapNetworkIdToNetwork } from '$sol/utils/safe-network.utils';
import { isAtaAddress } from '$sol/utils/sol-address.utils';
import { createSigner } from '$sol/utils/sol-sign.utils';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import {
	estimateComputeUnitLimitFactory,
	getSetComputeUnitPriceInstruction
} from '@solana-program/compute-budget';
import { getTransferSolInstruction } from '@solana-program/system';
import { getTransferCheckedInstruction, getTransferInstruction } from '@solana-program/token';
import {
	appendTransactionMessageInstructions,
	assertIsFullySignedTransaction,
	assertIsTransactionWithinSizeLimit,
	createTransactionMessage,
	lamports,
	pipe,
	prependTransactionMessageInstruction,
	sendTransactionWithoutConfirmingFactory,
	setTransactionMessageFeePayerSigner,
	setTransactionMessageLifetimeUsingBlockhash,
	address as solAddress,
	type Commitment,
	type Rpc,
	type RpcSubscriptions,
	type Signature,
	type SolanaRpcApi,
	type SolanaRpcSubscriptionsApi,
	type TransactionMessage,
	type TransactionMessageWithFeePayer,
	type TransactionPartialSigner,
	type TransactionSigner,
	type TransactionVersion
} from '@solana/kit';
import {
	createBlockHeightExceedencePromiseFactory,
	createRecentSignatureConfirmationPromiseFactory,
	waitForRecentTransactionConfirmation
} from '@solana/transaction-confirmation';

const setFeePayerToTransaction = ({
	transactionMessage,
	feePayer
}: {
	transactionMessage: TransactionMessage;
	feePayer: TransactionSigner;
}): TransactionMessage & TransactionMessageWithFeePayer =>
	pipe(transactionMessage, (tx) => setTransactionMessageFeePayerSigner(feePayer, tx));

export const setLifetimeAndFeePayerToTransaction = async ({
	transactionMessage,
	rpc,
	feePayer
}: {
	transactionMessage: TransactionMessage;
	rpc: Rpc<SolanaRpcApi>;
	feePayer: TransactionSigner;
}): Promise<SolTransactionMessage> => {
	const { getLatestBlockhash } = rpc;
	const { value: latestBlockhash } = await getLatestBlockhash({ commitment: 'confirmed' }).send();

	const correctedLatestBlockhash = {
		...latestBlockhash,
		lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
	};

	return pipe(
		transactionMessage,
		(tx) => setFeePayerToTransaction({ transactionMessage: tx, feePayer }),
		(tx) => setTransactionMessageLifetimeUsingBlockhash(correctedLatestBlockhash, tx)
	);
};

const createDefaultTransaction = async ({
	rpc,
	feePayer,
	version = 0
}: {
	rpc: Rpc<SolanaRpcApi>;
	feePayer: TransactionSigner;
	version?: TransactionVersion;
}): Promise<SolTransactionMessage> =>
	await pipe(
		createTransactionMessage({ version }),
		async (tx) =>
			await setLifetimeAndFeePayerToTransaction({ transactionMessage: tx, rpc, feePayer })
	);

const createSolTransactionMessage = async ({
	signer,
	destination,
	amount,
	network
}: {
	signer: TransactionSigner;
	destination: SolAddress;
	amount: bigint;
	network: SolanaNetworkType;
}): Promise<SolTransactionMessage> => {
	const rpc = solanaHttpRpc(network);

	return pipe(await createDefaultTransaction({ rpc, feePayer: signer }), (tx) =>
		appendTransactionMessageInstructions(
			[
				getTransferSolInstruction({
					source: signer,
					destination: solAddress(destination),
					amount: lamports(amount)
				})
			],
			tx
		)
	);
};

const createSplTokenTransactionMessage = async ({
	signer,
	destination,
	amount,
	network,
	token
}: {
	signer: TransactionSigner;
	destination: SolAddress;
	amount: bigint;
	network: SolanaNetworkType;
	token: SplToken;
}): Promise<SolTransactionMessage> => {
	const {
		address: tokenAddress,
		owner: tokenOwnerAddress,
		mintAuthority: tokenMintAuthority,
		decimals: tokenDecimals
	} = token;

	const rpc = solanaHttpRpc(network);

	const source = signer.address;

	// To be sure which token account is used, we calculate the associated token account address
	const sourceTokenAccountAddress: SolAddress = await calculateAssociatedTokenAddress({
		owner: source,
		tokenAddress,
		tokenOwnerAddress
	});

	const destinationIsAtaAddress = await isAtaAddress({ address: destination, network });

	const destinationTokenAccountAddress: OptionSolAddress = destinationIsAtaAddress
		? destination
		: await loadTokenAccount({
				address: destination,
				network,
				tokenAddress
			});

	const calculatedDestinationTokenAccountAddress: SolAddress = destinationIsAtaAddress
		? destination
		: await calculateAssociatedTokenAddress({
				owner: destination,
				tokenAddress,
				tokenOwnerAddress
			});

	const mustCreateDestinationTokenAccount = isNullish(destinationTokenAccountAddress);

	// To be sure there was no mistake nor injection, we verify that the destination token account is the same as the calculated one.
	if (
		!mustCreateDestinationTokenAccount &&
		destinationTokenAccountAddress !== calculatedDestinationTokenAccountAddress
	) {
		throw new Error(
			`Destination ATA address is different from the calculated one. Destination: ${destinationTokenAccountAddress}, Calculated: ${calculatedDestinationTokenAccountAddress}`
		);
	}

	const ataInstruction = await createAtaInstruction({
		signer,
		destination,
		tokenAddress,
		tokenOwnerAddress
	});

	const transferParams = {
		source: solAddress(sourceTokenAccountAddress),
		destination: solAddress(
			destinationIsAtaAddress
				? destination
				: mustCreateDestinationTokenAccount
					? calculatedDestinationTokenAccountAddress
					: destinationTokenAccountAddress
		),
		authority: signer,
		amount
	};

	const config = { programAddress: solAddress(tokenOwnerAddress) };

	const transferInstruction = nonNullish(tokenMintAuthority)
		? getTransferCheckedInstruction(
				{
					...transferParams,
					mint: solAddress(tokenAddress),
					decimals: tokenDecimals
				},
				config
			)
		: getTransferInstruction(transferParams, { programAddress: solAddress(tokenOwnerAddress) });

	return pipe(await createDefaultTransaction({ rpc, feePayer: signer }), (tx) =>
		appendTransactionMessageInstructions(
			[...(mustCreateDestinationTokenAccount ? [ataInstruction] : []), transferInstruction],
			tx
		)
	);
};

export const sendSignedTransaction = async ({
	rpc,
	signedTransaction,
	commitment = 'confirmed'
}: {
	rpc: Rpc<SolanaRpcApi>;
	signedTransaction: SolSignedTransaction;
	commitment?: Commitment;
}) => {
	assertIsFullySignedTransaction(signedTransaction);
	assertIsTransactionWithinSizeLimit(signedTransaction);

	const sendTransaction = sendTransactionWithoutConfirmingFactory({ rpc });

	await sendTransaction(signedTransaction, { commitment });
};

const confirmSignedTransaction = async ({
	rpc,
	rpcSubscriptions,
	signedTransaction,
	commitment = 'confirmed'
}: {
	rpc: Rpc<SolanaRpcApi>;
	rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
	signedTransaction: SolSignedTransaction;
	commitment?: Commitment;
}) => {
	assertIsFullySignedTransaction(signedTransaction);

	const getBlockHeightExceedencePromise = createBlockHeightExceedencePromiseFactory({
		rpc,
		rpcSubscriptions
	});

	const getRecentSignatureConfirmationPromise = createRecentSignatureConfirmationPromiseFactory({
		rpc,
		rpcSubscriptions
	});

	await waitForRecentTransactionConfirmation({
		transaction: signedTransaction,
		commitment,
		getBlockHeightExceedencePromise,
		getRecentSignatureConfirmationPromise
	});
};

/**
 * Send SOL or SPL tokens from one address to another.
 *
 * This function will sign the transaction with the provided identity and send it to the network.
 * It is based on the Solana web3.js library.
 * https://solana.com/developers/cookbook/transactions/send-sol
 */
export const sendSol = async ({
	identity,
	progress,
	token,
	amount,
	prioritizationFee,
	destination,
	source
}: {
	identity: OptionIdentity;
	token: Token;
	amount: bigint;
	prioritizationFee: bigint;
	destination: SolAddress;
	source: SolAddress;
	progress?: (step: ProgressStepsSendSol) => void;
}): Promise<Signature> => {
	progress?.(ProgressStepsSendSol.INITIALIZATION);

	const {
		network: { id: networkId }
	} = token;

	const solNetwork = safeMapNetworkIdToNetwork(networkId);

	const rpc = solanaHttpRpc(solNetwork);
	const rpcSubscriptions = solanaWebSocketRpc(solNetwork);

	const signer: TransactionPartialSigner = createSigner({
		identity,
		address: source,
		network: solNetwork
	});

	const transactionMessage = isTokenSpl(token)
		? await createSplTokenTransactionMessage({
				signer,
				destination,
				amount,
				network: solNetwork,
				token
			})
		: await createSolTransactionMessage({
				signer,
				destination,
				amount,
				network: solNetwork
			});

	const getComputeUnitEstimateForTransactionMessage = estimateComputeUnitLimitFactory({
		rpc
	});

	const computeUnitsEstimate =
		await getComputeUnitEstimateForTransactionMessage(transactionMessage);

	const computeUnitPrice = BigInt(Math.ceil(Number(prioritizationFee) / computeUnitsEstimate));

	const transactionMessageWithComputeUnitPrice = prependTransactionMessageInstruction(
		getSetComputeUnitPriceInstruction({ microLamports: computeUnitPrice }),
		transactionMessage
	);

	progress?.(ProgressStepsSendSol.SIGN);

	const { signedTransaction, signature } = await signTransaction(
		prioritizationFee > ZERO ? transactionMessageWithComputeUnitPrice : transactionMessage
	);

	progress?.(ProgressStepsSendSol.SEND);

	await sendSignedTransaction({
		rpc,
		signedTransaction
	});

	progress?.(ProgressStepsSendSol.CONFIRM);

	await confirmSignedTransaction({
		rpc,
		rpcSubscriptions,
		signedTransaction
	});

	progress?.(ProgressStepsSendSol.DONE);

	return signature;
};
