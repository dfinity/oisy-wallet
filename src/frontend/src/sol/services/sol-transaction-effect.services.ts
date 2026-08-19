import { fetchTransactionDetailForSignature } from '$sol/api/solana.api';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolSignature } from '$sol/types/sol-transaction';
import type { SolTransactionEffect } from '$sol/types/sol-transaction-effect';
import { mapSolTransactionEffect } from '$sol/utils/sol-transaction-effect.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * One lookup per transaction, for the lifetime of the session.
 *
 * A bundled row is rendered every time the list is scrolled past it, and the answer never changes:
 * a confirmed transaction is not going to say something different later.
 */
const effects = new Map<string, Promise<SolTransactionEffect | undefined>>();

export const resetSolTransactionEffects = () => effects.clear();

/**
 * What a transaction is, read from the transaction itself.
 *
 * The activity list is served by the backend, which carries the transfers but not the instructions
 * they came from, so the rows alone can say how much moved and never what moved it. The detail is
 * one query away and the API caches it per signature, so this asks for it where it matters: a
 * bundled row, the one place a sentence has to name a swap or a bridge rather than list amounts.
 *
 * Resolves to `undefined` when the transaction cannot be read, and the caller falls back to what
 * the rows already say. Nothing waits on this.
 */
export const loadSolTransactionEffect = ({
	signature,
	network,
	address
}: {
	signature: SolSignature;
	network: SolanaNetworkType;
	address: SolAddress;
}): Promise<SolTransactionEffect | undefined> => {
	const key = `${network}:${signature.signature}`;

	const cached = effects.get(key);

	if (nonNullish(cached)) {
		return cached;
	}

	const pending = (async () => {
		try {
			const transaction = await fetchTransactionDetailForSignature({ signature, network });

			if (isNullish(transaction)) {
				return undefined;
			}

			const {
				transaction: {
					message: { instructions }
				},
				meta
			} = transaction;

			// Inner instructions are where a routed swap actually happens, so a list of the top-level
			// ones alone would describe a Jupiter swap as a single call to Jupiter and nothing else.
			const inner = [...(meta?.innerInstructions ?? [])]
				.sort((a, b) => a.index - b.index)
				.flatMap(({ instructions: nested }) => [...nested]);

			return mapSolTransactionEffect({
				transaction,
				address,
				instructions: [...instructions, ...inner]
			});
		} catch (_err: unknown) {
			// The row is already complete without this; it only ever adds a name to it.
			return undefined;
		}
	})();

	effects.set(key, pending);

	return pending;
};
