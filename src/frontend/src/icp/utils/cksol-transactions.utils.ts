import { CKSOL_ENABLED } from '$env/cksol.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTransactionUi, IcrcTransaction } from '$icp/types/ic-transaction';
import { decodeBurnMemo, decodeMintMemo } from '$icp/utils/cksol-memo.utils';
import { isTokenCkSolLedger } from '$icp/utils/ic-send.utils';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import type { NullishIdentity } from '$lib/types/identity';
import { consoleError } from '$lib/utils/console.utils';
import type { SolAddress } from '$sol/types/address';
import { solAccountExplorerUrl, solTransactionExplorerUrl } from '$sol/utils/sol-explorer.utils';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
import { getBase58Decoder } from '@solana/kit';

/**
 * Whether ckSOL's own Activity applies: only behind its flag, where OISY lists ckSOL. A ckSOL
 * added by hand where it is not listed has no twin token to name its conversions after, so its
 * transactions keep the plain ICRC rows.
 */
export const isCkSolActivityLedger = (token: Partial<IcToken>): boolean =>
	CKSOL_ENABLED && isTokenCkSolLedger(token);

/**
 * ckSOL in Activity, as ckBTC and ckETH: a mint is a conversion from SOL, with the Solana
 * transaction that swept the deposit, and a burn a send to the Solana address in its memo.
 *
 * A mint needs no memo for its label: only the minter mints ckSOL, and only when it converts a
 * deposit, since it reimburses nothing.
 */
export const mapCkSolTransaction = ({
	transaction,
	identity
}: {
	transaction: IcrcTransaction;
	identity: NullishIdentity;
}): IcTransactionUi => {
	const tx = mapIcrcTransaction({ transaction, identity });

	const {
		transaction: { mint: rawMint, burn: rawBurn }
	} = transaction;

	const mint = fromNullable(rawMint);

	if (nonNullish(mint)) {
		const sweepSignature = mintMemoSweepSignature(fromNullable(mint.memo));

		return {
			...tx,
			typeLabel: 'transaction.label.twin_token_converted',
			fromLabel: 'transaction.label.twin_network',
			...(nonNullish(sweepSignature) && {
				twinTransaction: {
					id: sweepSignature,
					explorerUrl: solTransactionExplorerUrl({
						network: SOLANA_MAINNET_NETWORK,
						signature: sweepSignature
					})
				}
			})
		};
	}

	const burn = fromNullable(rawBurn);

	if (isNullish(burn)) {
		return tx;
	}

	const to = burnMemoAddress(fromNullable(burn.memo));

	return {
		...tx,
		typeLabel: 'send.text.send',
		...(nonNullish(to)
			? {
					to,
					toExplorerUrl: solAccountExplorerUrl({ network: SOLANA_MAINNET_NETWORK, address: to })
				}
			: { toLabel: 'transaction.label.twin_network' })
	};
};

const mintMemoSweepSignature = (memo: Uint8Array | undefined): string | undefined => {
	if (isNullish(memo)) {
		return undefined;
	}

	try {
		const { signature } = decodeMintMemo(memo);

		return getBase58Decoder().decode(signature);
	} catch (err: unknown) {
		consoleError('Failed to decode ckSOL mint memo', memo, err);
		return undefined;
	}
};

const burnMemoAddress = (memo: Uint8Array | undefined): SolAddress | undefined => {
	if (isNullish(memo)) {
		return undefined;
	}

	try {
		const { toAddress } = decodeBurnMemo(memo);

		return getBase58Decoder().decode(toAddress);
	} catch (err: unknown) {
		consoleError('Failed to decode ckSOL burn memo', memo, err);
		return undefined;
	}
};
