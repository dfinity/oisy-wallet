import { signPlugSolMessage } from '$lib/api/plug-helper.api';
import { ZERO } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import { SOLANA_TRANSACTION_FEE_IN_LAMPORTS } from '$sol/constants/sol.constants';
import { sendSol } from '$sol/services/sol-send.services';
import type { SolAddress } from '$sol/types/address';
import { isTokenSpl } from '$sol/utils/spl.utils';
import type { Identity } from '@icp-sdk/core/agent';
import {
	assertIsTransactionPartialSigner,
	assertIsTransactionSigner,
	address as solAddress,
	type Signature,
	type SignatureDictionary,
	type Transaction,
	type TransactionPartialSigner,
	type TransactionWithinSizeLimit,
	type TransactionWithLifetime
} from '@solana/kit';

/**
 * A Solana signer backed by the imported wallet's own canister.
 *
 * Solana signing is raw Ed25519 over the message bytes — no hashing, no recovery
 * id — so the helper canister's `sign_sol` takes the transaction message and
 * returns the signature unchanged, exactly matching what a `TransactionPartialSigner`
 * must produce. Only that canister can sign for this address, so the imported
 * identity, not the signed-in one, must make the call.
 */
const createPlugSolSigner = ({
	identity,
	address
}: {
	identity: Identity;
	address: SolAddress;
}): TransactionPartialSigner => {
	const signer: TransactionPartialSigner = {
		address: solAddress(address),
		signTransactions: async (
			transactions: (Transaction & TransactionWithinSizeLimit & TransactionWithLifetime)[]
		): Promise<SignatureDictionary[]> =>
			await Promise.all(
				transactions.map(
					async (transaction) =>
						({
							[address]: await signPlugSolMessage({
								identity,
								message: Uint8Array.from(transaction.messageBytes)
							})
						}) as SignatureDictionary
				)
			)
	};

	assertIsTransactionSigner(signer);
	assertIsTransactionPartialSigner(signer);

	return signer;
};

/**
 * Sends an imported wallet's Solana balance to the signed-in user's own address.
 *
 * The whole build/sign/broadcast/confirm flow is OISY's own `sendSol`; only the
 * signer is swapped for one backed by the imported wallet's canister.
 *
 * The network fee is paid in SOL from the *imported* account. A native send can
 * therefore only move `balance - fee`, and an SPL send needs SOL there for the
 * fee (and for creating the destination token account when the OISY side does not
 * hold that token yet). The SPL sufficiency beyond the base fee is left to the
 * network, which rejects an underfunded transaction rather than half-applying it.
 */
export const sweepPlugSolBalance = async ({
	identity,
	token,
	balance,
	nativeBalance,
	destination,
	source
}: {
	identity: Identity;
	token: Token;
	balance: bigint;
	nativeBalance: bigint;
	destination: SolAddress;
	source: SolAddress;
}): Promise<Signature> => {
	if (isTokenSpl(token)) {
		if (nativeBalance <= SOLANA_TRANSACTION_FEE_IN_LAMPORTS) {
			throw new Error('Not enough SOL to cover the fee for this token transfer');
		}

		return await runSweep({ identity, token, amount: balance, destination, source });
	}

	const amount = balance - SOLANA_TRANSACTION_FEE_IN_LAMPORTS;

	if (amount <= ZERO) {
		throw new Error('Balance does not cover the network fee for this transfer');
	}

	return await runSweep({ identity, token, amount, destination, source });
};

const runSweep = async ({
	identity,
	token,
	amount,
	destination,
	source
}: {
	identity: Identity;
	token: Token;
	amount: bigint;
	destination: SolAddress;
	source: SolAddress;
}): Promise<Signature> =>
	await sendSol({
		identity,
		token,
		amount,
		prioritizationFee: ZERO,
		destination,
		source,
		signerOverride: createPlugSolSigner({ identity, address: source })
	});
