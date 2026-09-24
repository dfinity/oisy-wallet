import { CMC_CANISTER_ID } from '$env/networks/networks.icp.env';
import { IC_CYCLES_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import type { IcToken } from '$icp/types/ic-token';
import { isIcToken } from '$icp/validation/ic-token.validation';
import type { OptionToken } from '$lib/types/token';
import { toCyclesMintCredited } from '$lib/utils/cycles-mint-active-tx.utils';
import { nonNullish, principalToSubAccount } from '@dfinity/utils';
import { AccountIdentifier, SubAccount } from '@icp-sdk/canisters/ledger/icp';
import type { IcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { Principal } from '@icp-sdk/core/principal';

// The CMC looks for a mint deposit in its own account, under the subaccount
// derived from the principal that notifies it.
export const getCyclesMintDepositAccount = (principal: Principal): IcrcAccount => ({
	owner: Principal.fromText(CMC_CANISTER_ID),
	subaccount: principalToSubAccount(principal)
});

// The same account as ICP history names it: the ICP index reports every
// transfer's destination as an account identifier.
export const getCyclesMintDepositAccountIdentifier = (principal: Principal): string =>
	AccountIdentifier.fromPrincipal({
		principal: Principal.fromText(CMC_CANISTER_ID),
		subAccount: SubAccount.fromBytes(principalToSubAccount(principal))
	}).toHex();

// The TCYCLES token the CMC mints into: the mainnet cycles ledger's. No other token has
// a Mint action.
export const isTokenCyclesLedger = (token: OptionToken): token is IcToken =>
	nonNullish(token) && isIcToken(token) && token.ledgerCanisterId === IC_CYCLES_LEDGER_CANISTER_ID;

// Cycles per 1 ICP at a CMC rate: 1 XDR is 10^12 cycles and the rate counts 10,000ths of
// an XDR per ICP, so a rate converts 1 e8 into exactly `xdrPermyriadPerIcp` cycles.
export const toCyclesPerIcp = (xdrPermyriadPerIcp: bigint): bigint =>
	xdrPermyriadPerIcp * 100_000_000n;

/**
 * What minting `amount` ICP e8s credits at a CMC rate: the cycles the CMC mints, minus
 * the cycles ledger's deposit fee. An estimate, because the CMC converts at its rate when
 * the notify runs.
 */
export const estimateCyclesMintCredited = ({
	amount,
	xdrPermyriadPerIcp
}: {
	amount: bigint;
	xdrPermyriadPerIcp: bigint;
}): bigint => toCyclesMintCredited(amount * xdrPermyriadPerIcp);
