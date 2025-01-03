// import { signSchnorrPublicKey } from '$lib/api/signer.api';
// import type { SolAddress } from '$lib/types/address';
// import type { OptionIdentity } from '$lib/types/identity';
// import type { Amount } from '$lib/types/send';
// import type { Token } from '$lib/types/token';
// import { isSolNetwork } from '$sol/validation/sol-network.validation';
// import { getTransferSolInstruction } from '@solana-program/system';
// import {
// 	appendTransactionMessageInstructions,
// 	createSolanaRpc,
// 	createSolanaRpcSubscriptions,
// 	createTransactionMessage,
// 	generateKeyPairSigner,
// 	getSignatureFromTransaction,
// 	lamports,
// 	pipe,
// 	sendAndConfirmTransactionFactory,
// 	setTransactionMessageFeePayerSigner,
// 	setTransactionMessageLifetimeUsingBlockhash,
// 	signTransactionMessageWithSigners,
// 	address as solAddress,
// 	type FullySignedTransaction,
// 	type TransactionWithBlockhashLifetime
// } from '@solana/web3.js';
//
// export const sendSol = async ({
// 	identity,
// 	token: { network },
// 	amount,
// 	destination,
// 	source,
// 	onProgress
// }: {
// 	identity: OptionIdentity;
// 	token: Token;
// 	amount: Amount;
// 	destination: SolAddress;
// 	source: SolAddress;
// 	onProgress?: () => void;
// }): Promise<void> => {
// 	if (!isSolNetwork(network)) {
// 		return;
// 	}
//
// 	const {
// 		rpc: { httpUrl, wssUrl }
// 	} = network;
//
// 	const rpc = createSolanaRpc(httpUrl);
// 	const rpcSubscriptions = createSolanaRpcSubscriptions(wssUrl);
//
// 	const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });
//
// 	const { getLatestBlockhash } = rpc;
//
// 	const { value: latestBlockhash } = await getLatestBlockhash().send();
//
// 	const sourceAddress = solAddress(source);
//
// 	const bar = await generateKeyPairSigner();
//
// 	bar.keyPair;
//
// 	const transactionMessage = pipe(
// 		createTransactionMessage({ version: 'legacy' }),
// 		(tx) => setTransactionMessageFeePayerSigner(source, tx),
// 		(tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
// 		(tx) =>
// 			appendTransactionMessageInstructions(
// 				[
// 					getTransferSolInstruction({
// 						source: sourceAddress,
// 						destination: solAddress(destination),
// 						amount: lamports(BigInt(amount))
// 					})
// 				],
// 				tx
// 			)
// 	);
//
// 	const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
//
// 	const messageData = signedTransaction.messageBytes;
//
// 	const newSignaturesMapEntries = await Promise.all(
// 		Object.entries(signedTransaction.signatures).map(async ([key, _]) => {
// 			const signedBytes = await signSchnorrPublicKey({
// 				identity,
// 				derivationPath: ['Solana', 'devnet'],
// 				message: Array.from(messageData)
// 			});
//
// 			return [key, Uint8Array.from(signedBytes)];
// 		})
// 	);
//
// 	const newSignedTransaction: FullySignedTransaction & TransactionWithBlockhashLifetime = {
// 		...signedTransaction,
// 		signatures: Object.fromEntries(newSignaturesMapEntries)
// 	};
//
// 	try {
// 		await sendAndConfirmTransaction(newSignedTransaction, {
// 			commitment: 'confirmed',
// 			skipPreflight: true
// 		});
// 		const signature = getSignatureFromTransaction(newSignedTransaction);
// 		console.log('✅ - Transfer transaction:', signature);
// 	} catch (e) {
// 		console.error('Transfer failed:', e);
// 	}
// };
