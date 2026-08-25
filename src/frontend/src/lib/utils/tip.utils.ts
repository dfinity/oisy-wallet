import type { IcToken } from '$icp/types/ic-token';
import { isTokenIcp, isTokenIcrc } from '$icp/utils/icrc.utils';
import type { Token } from '$lib/types/token';

/**
 * The tokens a tip can be issued in.
 *
 * The filter is structural, not a policy we picked: a tip is an ICRC-2
 * allowance, so it only works on ledgers that *have* an allowance primitive —
 * ICP and the ck-assets. A native BTC, ETH or SOL balance cannot be reserved
 * without someone taking custody of it, which is the one thing this feature is
 * built to avoid.
 *
 * Narrowing to `IcToken` is deliberate: the sender's approve needs the token's
 * `ledgerCanisterId`, which only the IC token type carries.
 */
export const tippableTokens = (tokens: Token[]): IcToken[] =>
	tokens.filter((token): token is IcToken => isTokenIcp(token) || isTokenIcrc(token));

/**
 * The two fees a tip costs its sender, both one ledger fee.
 *
 * There are two because the flow touches the ledger twice: once to reserve
 * (`icrc2_approve`) and once when someone claims (`icrc2_transfer_from`). The
 * ledger charges the second to the sender's balance while crediting the claimer
 * the full amount — so the claimer pays nothing, and the sender's spendable
 * balance has to account for both. Measured against a real ledger in the spec's
 * PR-0 spike rather than inferred.
 */
export const tipFees = (fee: bigint): { reserve: bigint; payout: bigint; total: bigint } => ({
	reserve: fee,
	payout: fee,
	total: fee * 2n
});
