import { CMC_CANISTER_ID } from '$env/networks/networks.icp.env';
import { principalToSubAccount } from '@dfinity/utils';
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
