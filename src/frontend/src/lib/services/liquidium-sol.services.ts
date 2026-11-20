import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { ProgressStepsSendSol } from '$lib/enums/progress-steps';
import {
	LiquidiumSolBlockhashExpiredError,
	LiquidiumSolTransferRefusedError
} from '$lib/types/errors';
import type { NullishIdentity } from '$lib/types/identity';
import type { LiquidiumSolBlockhash } from '$lib/types/liquidium-active-tx';
import { isBlockhashValid } from '$sol/api/solana.api';
import { sendSol } from '$sol/services/sol-send.services';
import type { SolAddress } from '$sol/types/address';
import { SolanaNetworks } from '$sol/types/network';
import { isSolSendRefusal } from '$sol/utils/sol-error.utils';

/**
 * Sends `amount` lamports from the user's mainnet SOL address to a Liquidium target, and returns the
 * transaction signature that Liquidium lists the inflow under.
 *
 * `beforeBroadcast` gets the signature with its blockhash and a slot where that blockhash is valid,
 * which the poller later needs to tell a transfer that will never land from one a lagging node has not
 * seen yet. Without such a slot nothing is sent, as for SOL → ckSOL.
 *
 * A failure that shows the SOL never left becomes a `LiquidiumSolTransferRefusedError`: anything before
 * the broadcast, or the node refusing it. A refusal answered while confirming comes after the
 * broadcast and says nothing about it, so that and any other failure is thrown as is.
 */
export const sendLiquidiumSol = async ({
	identity,
	source,
	destination,
	amount,
	prioritizationFee,
	beforeBroadcast
}: {
	identity: NullishIdentity;
	source: SolAddress;
	destination: SolAddress;
	amount: bigint;
	prioritizationFee: bigint;
	beforeBroadcast: (params: { txid: string; solBlockhash: LiquidiumSolBlockhash }) => Promise<void>;
}): Promise<string> => {
	let sending = false;
	let broadcast = false;

	try {
		return await sendSol({
			identity,
			token: SOLANA_TOKEN,
			amount,
			prioritizationFee,
			destination,
			source,
			progress: (step) => {
				if (step === ProgressStepsSendSol.SEND) {
					sending = true;
				}

				if (step === ProgressStepsSendSol.CONFIRM) {
					broadcast = true;
				}
			},
			beforeBroadcast: async ({ signature, blockhash }) => {
				const { slot, valid } = await isBlockhashValid({
					blockhash,
					network: SolanaNetworks.mainnet
				});

				if (!valid) {
					throw new LiquidiumSolBlockhashExpiredError(blockhash);
				}

				await beforeBroadcast({ txid: signature, solBlockhash: { blockhash, slot } });
			}
		});
	} catch (err: unknown) {
		const neverSent = !sending || (!broadcast && isSolSendRefusal(err));

		throw neverSent ? new LiquidiumSolTransferRefusedError({ cause: err }) : err;
	}
};
