import { signSchnorrPublicKey } from '$lib/api/signer.api';
import { solAddressLocal } from '$lib/derived/address.derived';
import { i18n } from '$lib/stores/i18n.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Amount } from '$lib/types/send';
import type { Token } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { SOLANA_DERIVATION_PATH_PREFIX } from '$sol/constants/sol.constants';
import { SolanaNetworks } from '$sol/types/network';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import { assertNonNullish } from '@dfinity/utils';
import { getTransferSolInstruction } from '@solana-program/system';
import { address as solAddress, type Address } from '@solana/addresses';
import { pipe } from '@solana/functional';
import type { SignatureBytes } from '@solana/keys';
import { createSolanaRpc } from '@solana/rpc';
import { createSolanaRpcSubscriptions } from '@solana/rpc-subscriptions';
import { lamports } from '@solana/rpc-types';
import {
	assertIsTransactionMessageWithSingleSendingSigner,
	assertIsTransactionPartialSigner,
	assertIsTransactionSigner,
	getSignersFromTransactionMessage,
	isTransactionModifyingSigner,
	isTransactionPartialSigner,
	isTransactionSendingSigner,
	isTransactionSigner,
	type ITransactionMessageWithSigners,
	type MessageSigner,
	type SignatureDictionary,
	type TransactionModifyingSigner,
	type TransactionModifyingSignerConfig,
	type TransactionPartialSigner,
	type TransactionPartialSignerConfig,
	type TransactionSendingSigner,
	type TransactionSendingSignerConfig,
	type TransactionSigner
} from '@solana/signers';
import {
	appendTransactionMessageInstructions,
	createTransactionMessage,
	setTransactionMessageFeePayer,
	setTransactionMessageLifetimeUsingBlockhash,
	type CompilableTransactionMessage,
	type TransactionMessageWithBlockhashLifetime,
	type TransactionMessageWithDurableNonceLifetime
} from '@solana/transaction-messages';
import {
	assertTransactionIsFullySigned,
	compileTransaction,
	getSignatureFromTransaction,
	type FullySignedTransaction,
	type Transaction,
	type TransactionWithBlockhashLifetime,
	type TransactionWithDurableNonceLifetime,
	type TransactionWithLifetime
} from '@solana/transactions';
import {
	SOLANA_ERROR__SIGNER__ADDRESS_CANNOT_HAVE_MULTIPLE_SIGNERS,
	SOLANA_ERROR__SIGNER__TRANSACTION_SENDING_SIGNER_MISSING,
	SolanaError,
	sendAndConfirmTransactionFactory
} from '@solana/web3.js';
import { install } from '@solana/webcrypto-ed25519-polyfill';
import { get } from 'svelte/store';

// Calling this will shim methods on `SubtleCrypto`, adding Ed25519 support.
install();

type CompilableTransactionMessageWithSigners = CompilableTransactionMessage &
	ITransactionMessageWithSigners;

export function deduplicateSigners<TSigner extends MessageSigner | TransactionSigner>(
	signers: readonly TSigner[]
): readonly TSigner[] {
	const deduplicated: Record<Address, TSigner> = {};
	signers.forEach((signer) => {
		if (!deduplicated[signer.address]) {
			deduplicated[signer.address] = signer;
		} else if (deduplicated[signer.address] !== signer) {
			throw new SolanaError(SOLANA_ERROR__SIGNER__ADDRESS_CANNOT_HAVE_MULTIPLE_SIGNERS, {
				address: signer.address
			});
		}
	});
	return Object.values(deduplicated);
}

export async function signAndSendTransactionMessageWithSigners<
	TTransactionMessage extends
		CompilableTransactionMessageWithSigners = CompilableTransactionMessageWithSigners
>(
	transaction: TTransactionMessage,
	config?: TransactionSendingSignerConfig
): Promise<SignatureBytes> {
	assertIsTransactionMessageWithSingleSendingSigner(transaction);

	const abortSignal = config?.abortSignal;
	const { partialSigners, modifyingSigners, sendingSigner } = categorizeTransactionSigners(
		deduplicateSigners(getSignersFromTransactionMessage(transaction).filter(isTransactionSigner))
	);

	abortSignal?.throwIfAborted();
	const signedTransaction = await signModifyingAndPartialTransactionSigners(
		transaction,
		modifyingSigners,
		partialSigners,
		config
	);

	if (!sendingSigner) {
		throw new SolanaError(SOLANA_ERROR__SIGNER__TRANSACTION_SENDING_SIGNER_MISSING);
	}

	abortSignal?.throwIfAborted();
	const [signature] = await sendingSigner.signAndSendTransactions([signedTransaction], config);
	abortSignal?.throwIfAborted();

	return signature;
}

/**
 * Identifies each provided TransactionSigner and categorizes them into their respective types.
 * When a signer implements multiple interface, it will try to used to most powerful interface
 * but fallback to the least powerful interface when necessary.
 * For instance, if a signer implements TransactionSendingSigner and TransactionModifyingSigner,
 * it will be categorized as a TransactionSendingSigner if and only if no other signers implement
 * the TransactionSendingSigner interface.
 */
function categorizeTransactionSigners(
	signers: readonly TransactionSigner[],
	config: { identifySendingSigner?: boolean } = {}
): Readonly<{
	modifyingSigners: readonly TransactionModifyingSigner[];
	partialSigners: readonly TransactionPartialSigner[];
	sendingSigner: TransactionSendingSigner | null;
}> {
	// Identify the unique sending signer that should be used.
	const identifySendingSigner = config.identifySendingSigner ?? true;
	const sendingSigner = identifySendingSigner ? identifyTransactionSendingSigner(signers) : null;

	// Now, focus on the other signers.
	// I.e. the modifying or partial signers that are not the identified sending signer.
	// Note that any other sending only signers will be discarded.
	const otherSigners = signers.filter(
		(signer): signer is TransactionModifyingSigner | TransactionPartialSigner =>
			signer !== sendingSigner &&
			(isTransactionModifyingSigner(signer) || isTransactionPartialSigner(signer))
	);

	// Identify the modifying signers from the other signers.
	const modifyingSigners = identifyTransactionModifyingSigners(otherSigners);

	// Use any remaining signers as partial signers.
	const partialSigners = otherSigners
		.filter(isTransactionPartialSigner)
		.filter((signer) => !(modifyingSigners as typeof otherSigners).includes(signer));

	return Object.freeze({ modifyingSigners, partialSigners, sendingSigner });
}

/** Identifies the best signer to use as a TransactionSendingSigner, if any */
function identifyTransactionSendingSigner(
	signers: readonly TransactionSigner[]
): TransactionSendingSigner | null {
	// Ensure there are any TransactionSendingSigners in the first place.
	const sendingSigners = signers.filter(isTransactionSendingSigner);
	if (sendingSigners.length === 0) {
		return null;
	}

	// Prefer sending signers that do not offer other interfaces.
	const sendingOnlySigners = sendingSigners.filter(
		(signer) => !isTransactionModifyingSigner(signer) && !isTransactionPartialSigner(signer)
	);
	if (sendingOnlySigners.length > 0) {
		return sendingOnlySigners[0];
	}

	// Otherwise, choose any sending signer.
	return sendingSigners[0];
}

/** Identifies the best signers to use as TransactionModifyingSigners, if any */
function identifyTransactionModifyingSigners(
	signers: readonly (TransactionModifyingSigner | TransactionPartialSigner)[]
): readonly TransactionModifyingSigner[] {
	// Ensure there are any TransactionModifyingSigner in the first place.
	const modifyingSigners = signers.filter(isTransactionModifyingSigner);
	if (modifyingSigners.length === 0) {
		return [];
	}

	// Prefer modifying signers that do not offer partial signing.
	const nonPartialSigners = modifyingSigners.filter(
		(signer) => !isTransactionPartialSigner(signer)
	);
	if (nonPartialSigners.length > 0) {
		return nonPartialSigners;
	}

	// Otherwise, choose only one modifying signer (whichever).
	return [modifyingSigners[0]];
}

async function signModifyingAndPartialTransactionSigners<
	TTransactionMessage extends
		CompilableTransactionMessageWithSigners = CompilableTransactionMessageWithSigners
>(
	transactionMessage: TTransactionMessage,
	modifyingSigners: readonly TransactionModifyingSigner[] = [],
	partialSigners: readonly TransactionPartialSigner[] = [],
	config?: TransactionModifyingSignerConfig
): Promise<Readonly<Transaction & TransactionWithLifetime>> {
	// serialize the transaction
	const transaction = compileTransaction(transactionMessage);

	// Handle modifying signers sequentially.
	const modifiedTransaction = await modifyingSigners.reduce<
		Promise<Readonly<Transaction & TransactionWithLifetime>>
	>(async (transaction, modifyingSigner) => {
		config?.abortSignal?.throwIfAborted();
		const [tx] = await modifyingSigner.modifyAndSignTransactions([await transaction], config);
		return Object.freeze(tx);
	}, Promise.resolve(transaction));

	// Handle partial signers in parallel.
	config?.abortSignal?.throwIfAborted();
	const signatureDictionaries = await Promise.all(
		partialSigners.map(async (partialSigner) => {
			const [signatures] = await partialSigner.signTransactions([modifiedTransaction], config);
			return signatures;
		})
	);
	const signedTransaction: Readonly<Transaction & TransactionWithLifetime> = {
		...modifiedTransaction,
		signatures: Object.freeze(
			signatureDictionaries.reduce(
				(signatures, signatureDictionary) => ({ ...signatures, ...signatureDictionary }),
				modifiedTransaction.signatures ?? {}
			)
		)
	};

	return Object.freeze(signedTransaction);
}

export async function partiallySignTransactionMessageWithSigners<
	TTransactionMessage extends CompilableTransactionMessageWithSigners &
		TransactionMessageWithBlockhashLifetime = CompilableTransactionMessageWithSigners &
		TransactionMessageWithBlockhashLifetime
>(
	transactionMessage: TTransactionMessage,
	config?: TransactionPartialSignerConfig
): Promise<Transaction & TransactionWithBlockhashLifetime>;

export async function partiallySignTransactionMessageWithSigners<
	TTransactionMessage extends CompilableTransactionMessageWithSigners &
		TransactionMessageWithDurableNonceLifetime = CompilableTransactionMessageWithSigners &
		TransactionMessageWithDurableNonceLifetime
>(
	transactionMessage: TTransactionMessage,
	config?: TransactionPartialSignerConfig
): Promise<Readonly<Transaction & TransactionWithDurableNonceLifetime>>;

export async function partiallySignTransactionMessageWithSigners<
	TTransactionMessage extends
		CompilableTransactionMessageWithSigners = CompilableTransactionMessageWithSigners
>(
	transactionMessage: TTransactionMessage,
	config?: TransactionPartialSignerConfig
): Promise<Readonly<Transaction & TransactionWithLifetime>>;

export async function partiallySignTransactionMessageWithSigners<
	TTransactionMessage extends
		CompilableTransactionMessageWithSigners = CompilableTransactionMessageWithSigners
>(
	transactionMessage: TTransactionMessage,
	config?: TransactionPartialSignerConfig
): Promise<Readonly<Transaction & TransactionWithLifetime>> {
	const { partialSigners, modifyingSigners, sendingSigner } = categorizeTransactionSigners(
		deduplicateSigners(
			getSignersFromTransactionMessage(transactionMessage).filter(isTransactionSigner)
		),
		{ identifySendingSigner: true }
	);

	console.log('Partial signers:', partialSigners, modifyingSigners, sendingSigner);

	return await signModifyingAndPartialTransactionSigners(
		transactionMessage,
		modifyingSigners,
		partialSigners,
		config
	);
}

export async function signTransactionMessageWithSigners<
	TTransactionMessage extends CompilableTransactionMessageWithSigners &
		TransactionMessageWithBlockhashLifetime = CompilableTransactionMessageWithSigners &
		TransactionMessageWithBlockhashLifetime
>(
	transactionMessage: TTransactionMessage,
	config?: TransactionPartialSignerConfig
): Promise<Readonly<FullySignedTransaction & TransactionWithBlockhashLifetime>>;

export async function signTransactionMessageWithSigners<
	TTransactionMessage extends CompilableTransactionMessageWithSigners &
		TransactionMessageWithDurableNonceLifetime = CompilableTransactionMessageWithSigners &
		TransactionMessageWithDurableNonceLifetime
>(
	transactionMessage: TTransactionMessage,
	config?: TransactionPartialSignerConfig
): Promise<Readonly<FullySignedTransaction & TransactionWithDurableNonceLifetime>>;

export async function signTransactionMessageWithSigners<
	TTransactionMessage extends
		CompilableTransactionMessageWithSigners = CompilableTransactionMessageWithSigners
>(
	transactionMessage: TTransactionMessage,
	config?: TransactionPartialSignerConfig
): Promise<Readonly<FullySignedTransaction & TransactionWithLifetime>>;

export async function signTransactionMessageWithSigners<
	TTransactionMessage extends
		CompilableTransactionMessageWithSigners = CompilableTransactionMessageWithSigners
>(
	transactionMessage: TTransactionMessage,
	config?: TransactionPartialSignerConfig
): Promise<Readonly<FullySignedTransaction & TransactionWithLifetime>> {
	const signedTransaction = await partiallySignTransactionMessageWithSigners(
		transactionMessage,
		config
	);
	console.log('Partially signed transaction:', signedTransaction);
	assertTransactionIsFullySigned(signedTransaction);
	return signedTransaction;
}

export const sendSolTest = async ({
	identity,
	token: {
		network: { id: networkId }
	},
	amount,
	onProgress
}: {
	identity: OptionIdentity;
	token: Token;
	amount: Amount;
	onProgress?: () => void;
}): Promise<void> => {
	const solNetwork = mapNetworkIdToNetwork(networkId);

	assertNonNullish(
		solNetwork,
		replacePlaceholders(get(i18n).init.error.no_solana_network, {
			$network: networkId.description ?? ''
		})
	);

	const rpc = createSolanaRpc('http://127.0.0.1:8899');
	const rpcSubscriptions = createSolanaRpcSubscriptions('ws://127.0.0.1:8900');

	// const rpc = solanaHttpRpc(solNetwork);
	// const rpcSubscriptions = createSolanaRpcSubscriptions(wssUrl);

	// const airdrop = airdropFactory({ rpc, rpcSubscriptions });

	const derivationPath = [SOLANA_DERIVATION_PATH_PREFIX, SolanaNetworks.local];

	const source = get(solAddressLocal) ?? '';

	const sourceAddress = solAddress(source);

	// const myTransactionSendingSigner: TransactionSendingSigner = {
	// 	address: sourceAddress,
	// 	signAndSendTransactions: async (transactions: Transaction[]): Promise<SignatureBytes[]> =>
	// 		await Promise.all(
	// 			transactions.map(async (transaction) => {
	// 				const signedBytes = await signSchnorrPublicKey({
	// 					identity,
	// 					derivationPath,
	// 					message: Array.from(transaction.messageBytes)
	// 				});
	//
	// 				return Uint8Array.from(signedBytes) as SignatureBytes;
	// 			})
	// };

	// assertIsTransactionSigner(myTransactionSendingSigner);
	// assertIsTransactionSendingSigner(myTransactionSendingSigner);

	const myTransactionPartialSigner: TransactionPartialSigner = {
		address: sourceAddress,
		signTransactions: async (transactions: Transaction[]): Promise<SignatureDictionary[]> =>
			await Promise.all(
				transactions.map(async (transaction) => {
					const signedBytes = await signSchnorrPublicKey({
						identity,
						derivationPath,
						message: Array.from(transaction.messageBytes)
					});

					return { [source]: Uint8Array.from(signedBytes) } as SignatureDictionary;
				})
			)
	};

	assertIsTransactionSigner(myTransactionPartialSigner);
	assertIsTransactionPartialSigner(myTransactionPartialSigner);

	// const keypairSigner = await generateKeyPairSigner();

	// const mySigner = myTransactionSendingSigner;

	const mySigner = myTransactionPartialSigner;

	// const mySigner = keypairSigner;

	// console.log('Created an account with address', mySigner.address);
	// console.log('Requesting airdrop');
	// await airdrop({
	// 	commitment: 'confirmed',
	// 	lamports: lamports(1_234_000_000n),
	// 	recipientAddress: mySigner.address
	// });
	// console.log('Airdrop confirmed');

	const DESTINATION_ACCOUNT_ADDRESS = solAddress('AKUuRxxd2B4TeyStAyBRo9gZ1SJATyEPYLVjGb8uLxdc');

	const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });

	const { getLatestBlockhash } = rpc;

	const { value: latestBlockhash } = await getLatestBlockhash().send();

	const transactionMessage = pipe(
		createTransactionMessage({ version: 0 }),
		(tx) => setTransactionMessageFeePayer(mySigner.address, tx),
		(tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
		(tx) =>
			appendTransactionMessageInstructions(
				[
					getTransferSolInstruction({
						source: mySigner,
						destination: DESTINATION_ACCOUNT_ADDRESS,
						amount: lamports(BigInt(amount))
					})
				],
				tx
			)
	);

	console.log('Transaction message:', transactionMessage);

	const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

	console.log('Signed transaction:', signedTransaction);

	const messageData = signedTransaction.messageBytes;

	const newSignaturesMapEntries = await Promise.all(
		Object.entries(signedTransaction.signatures).map(async ([key, _]) => {
			const signedBytes = await signSchnorrPublicKey({
				identity,
				derivationPath,
				message: Array.from(messageData)
			});

			return [source, Uint8Array.from(signedBytes)];
		})
	);

	const newSignedTransaction: FullySignedTransaction & TransactionWithBlockhashLifetime = {
		...signedTransaction,
		signatures: Object.fromEntries(newSignaturesMapEntries)
	};

	console.log('New signed transaction:', signedTransaction);

	try {
		await sendAndConfirmTransaction(signedTransaction, {
			commitment: 'confirmed'
		});
		const signature = getSignatureFromTransaction(signedTransaction);
		console.log('✅ - Transfer transaction:', signature);
	} catch (e) {
		console.error('Transfer failed:', e);
	}
};

// const sendTest = async () =>
// 	await sendSolTest({
// 		identity: $authIdentity,
// 		token: SOLANA_LOCAL_TOKEN,
// 		amount: 3_000_000_000
// 	});
