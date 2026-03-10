import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsSendSol } from '$lib/enums/progress-steps';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import { loadTokenAccount } from '$sol/api/solana.api';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import { solanaHttpRpc, solanaWebSocketRpc } from '$sol/providers/sol-rpc.providers';
import {
	calculateAssociatedTokenAddress,
	createAtaInstruction
} from '$sol/services/spl-accounts.services';
import type { OptionSolAddress, SolAddress } from '$sol/types/address';
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
	setTransactionMessageComputeUnitPrice
} from '@solana-program/compute-budget';
import { getTransferSolInstruction } from '@solana-program/system';
import { getTransferCheckedInstruction, getTransferInstruction } from '@solana-program/token';
import {
	assertIsFullySignedTransaction,
	assertIsSuccessfulSingleTransactionPlanResult,
	assertIsTransactionWithBlockhashLifetime,
	assertIsTransactionWithinSizeLimit,
	createTransactionMessage,
	createTransactionPlanExecutor,
	createTransactionPlanner,
	flattenTransactionPlanResult,
	lamports,
	nonDivisibleSequentialInstructionPlan,
	pipe,
	sendTransactionWithoutConfirmingFactory,
	setTransactionMessageFeePayerSigner,
	setTransactionMessageLifetimeUsingBlockhash,
	signTransactionMessageWithSigners,
	address as solAddress,
	type Commitment,
	type InstructionPlan,
	type Rpc,
	type Signature,
	type SolanaRpcApi,
	type TransactionMessage,
	type TransactionMessageWithFeePayer,
	type TransactionPartialSigner,
	type TransactionSigner
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

	return pipe(
		transactionMessage,
		(tx) => setFeePayerToTransaction({ transactionMessage: tx, feePayer }),
		(tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx)
	);
};

const createSolInstructionPlan = ({
	signer,
	destination,
	amount
}: {
	signer: TransactionSigner;
	destination: SolAddress;
	amount: bigint;
}): InstructionPlan =>
	nonDivisibleSequentialInstructionPlan([
		getTransferSolInstruction({
			source: signer,
			destination: solAddress(destination),
			amount: lamports(amount)
		})
	]);

const createSplTokenInstructionPlan = async ({
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
}): Promise<InstructionPlan> => {
	const {
		address: tokenAddress,
		owner: tokenOwnerAddress,
		mintAuthority: tokenMintAuthority,
		decimals: tokenDecimals
	} = token;

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

	// Theoretically, `transferChecked` is available for Token program address too, not only Token 2022 program address.
	// It is indeed safer, and we should use it whenever possible.
	// However, some wallets do not support it yet and the transaction will be rejected.
	// So we use it only when we are sure the token is a Token 2022 one,
	// or if it has a mint authority (which is not the case of locked tokens).
	const useCheckedTransfer =
		tokenOwnerAddress === TOKEN_2022_PROGRAM_ADDRESS || nonNullish(tokenMintAuthority);

	const transferInstruction = useCheckedTransfer
		? getTransferCheckedInstruction(
				{
					...transferParams,
					mint: solAddress(tokenAddress),
					decimals: tokenDecimals
				},
				config
			)
		: getTransferInstruction(transferParams, config);

	return nonDivisibleSequentialInstructionPlan([
		...(mustCreateDestinationTokenAccount ? [ataInstruction] : []),
		transferInstruction
	]);
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

/**
 * Send SOL or SPL tokens from one address to another.
 *
 * Uses Solana Instruction Plans to declaratively compose instructions,
 * then plans them into transactions and executes them.
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

	const instructionPlan = isTokenSpl(token)
		? await createSplTokenInstructionPlan({
				signer,
				destination,
				amount,
				network: solNetwork,
				token
			})
		: createSolInstructionPlan({
				signer,
				destination,
				amount
			});

	const planner = createTransactionPlanner({
		createTransactionMessage: () =>
			pipe(createTransactionMessage({ version: 0 }), (message) =>
				setTransactionMessageFeePayerSigner(signer, message)
			)
	});

	const transactionPlan = await planner(instructionPlan);

	const estimateComputeUnitLimit = estimateComputeUnitLimitFactory({ rpc });

	const executor = createTransactionPlanExecutor({
		// eslint-disable-next-line local-rules/prefer-object-params
		executeTransactionMessage: async (context, message) => {
			const { value: latestBlockhash } = await rpc
				.getLatestBlockhash({ commitment: 'confirmed' })
				.send();

			const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
				latestBlockhash,
				message
			);

			context.message = messageWithLifetime;

			const computeUnitsEstimate = await estimateComputeUnitLimit(messageWithLifetime);

			const finalMessage =
				prioritizationFee > ZERO
					? setTransactionMessageComputeUnitPrice(
							BigInt(Math.ceil(Number(prioritizationFee) / computeUnitsEstimate)),
							messageWithLifetime
						)
					: messageWithLifetime;

			context.message = finalMessage;

			progress?.(ProgressStepsSendSol.SIGN);

			const transaction = await signTransactionMessageWithSigners(finalMessage);

			context.transaction = transaction;

			assertIsTransactionWithBlockhashLifetime(transaction);
			assertIsFullySignedTransaction(transaction);
			assertIsTransactionWithinSizeLimit(transaction);

			progress?.(ProgressStepsSendSol.SEND);

			const sendTransaction = sendTransactionWithoutConfirmingFactory({ rpc });

			await sendTransaction(transaction, { commitment: 'confirmed' });

			progress?.(ProgressStepsSendSol.CONFIRM);

			await waitForRecentTransactionConfirmation({
				transaction,
				commitment: 'confirmed',
				getBlockHeightExceedencePromise: createBlockHeightExceedencePromiseFactory({
					rpc,
					rpcSubscriptions
				}),
				getRecentSignatureConfirmationPromise: createRecentSignatureConfirmationPromiseFactory({
					rpc,
					rpcSubscriptions
				})
			});

			return transaction;
		}
	});

	const result = await executor(transactionPlan);

	progress?.(ProgressStepsSendSol.DONE);

	const [firstResult] = flattenTransactionPlanResult(result);

	assertIsSuccessfulSingleTransactionPlanResult(firstResult);

	return firstResult.context.signature;
};
