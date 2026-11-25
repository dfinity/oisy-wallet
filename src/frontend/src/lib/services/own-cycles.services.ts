import { CYCLES_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { allowance, approve, balance } from '$icp/api/icrc-ledger.api';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { BACKEND_CANISTER_PRINCIPAL, SIGNER_CANISTER_ID } from '$lib/constants/app.constants';
import type { NullishIdentity } from '$lib/types/identity';
import { assertNonNullish } from '@dfinity/utils';
import type { IcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { Principal } from '@icp-sdk/core/principal';

export interface OwnCycles {
	// What the signer may still charge to the user's TCYCLES: the approval left.
	approved: bigint;
	// The user's TCYCLES balance, which every charge comes from.
	balance: bigint;
}

// A call paid with the caller's own cycles (`CallerPaysIcrc2Cycles`) is charged from the caller's
// main cycles-ledger account, through an approval to the signer's main account.
const signerAccount = (): IcrcAccount => ({ owner: Principal.fromText(SIGNER_CANISTER_ID) });

/**
 * The approval left for the signer and the TCYCLES balance, read with queries unless `certified`:
 * they are only shown, and an approval built on them states the amount it replaces (see
 * `addOwnCycles`). They come from the cycles ledger itself, so they are there whether or not
 * the user has TCYCLES enabled.
 */
export const loadOwnCycles = async ({
	identity,
	certified = false
}: {
	identity: NullishIdentity;
	certified?: boolean;
}): Promise<OwnCycles> => {
	assertNonNullish(identity);

	const owner = identity.getPrincipal();

	const [{ allowance: approved }, ownBalance] = await Promise.all([
		allowance({
			identity,
			certified,
			ledgerCanisterId: CYCLES_LEDGER_CANISTER_ID,
			owner: { owner },
			spender: signerAccount()
		}),
		balance({
			identity,
			certified,
			ledgerCanisterId: CYCLES_LEDGER_CANISTER_ID,
			owner
		})
	]);

	return { approved, balance: ownBalance };
};

/**
 * What is left of the free OISY allowance, read with a query unless `certified`, as it is only
 * shown. The backend's main account approves the signer, with the user's ICP account identifier as
 * the spender's subaccount (`principal2account` in the backend). A granted allowance request can
 * still raise it.
 */
export const loadFreeAllowance = async ({
	identity,
	certified = false
}: {
	identity: NullishIdentity;
	certified?: boolean;
}): Promise<bigint> => {
	assertNonNullish(identity);

	const { allowance: free } = await allowance({
		identity,
		certified,
		ledgerCanisterId: CYCLES_LEDGER_CANISTER_ID,
		owner: { owner: BACKEND_CANISTER_PRINCIPAL },
		spender: {
			owner: Principal.fromText(SIGNER_CANISTER_ID),
			subaccount: getAccountIdentifier(identity.getPrincipal()).toUint8Array()
		}
	});

	return free;
};

/**
 * Raises the signer's approval by `amount`, with no expiry. The approval states the amount it
 * replaces, so the ledger refuses it when the approval left has changed since it was read, for
 * example after a charge or from a wrong query answer: it never allows more than the user
 * added.
 */
export const addOwnCycles = async ({
	identity,
	approved,
	amount
}: {
	identity: NullishIdentity;
	// The approval left, as read.
	approved: bigint;
	amount: bigint;
}): Promise<void> => {
	await approve({
		identity,
		ledgerCanisterId: CYCLES_LEDGER_CANISTER_ID,
		spender: signerAccount(),
		amount: approved + amount,
		expectedAllowance: approved
	});
};
