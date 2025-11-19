import { getAgent } from '$lib/actors/agents.ic';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';
import { IcrcLedgerCanister, type IcrcStandardRecord } from '@icp-sdk/canisters/ledger/icrc';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

/**
 * Retrieves the ledger ICRC10 supported standards.
 *
 * FIXME: This is a workaround because the NFT ledger canister class doesn't provide a method to get the ICRC10 standards yet.
 * 				So we need to call the ledger canister directly, instead of the NFT ledger canister class.
 * 				This should be fixed when the NFT ledger canister is created based on a candid files that collects the ICRC-7 standard with all possible ICRC-7 extensions too (like ICRC-10 or ICRC-37.
 * 				A similar file is what exists today in the ledger suite to represent an ICRC-1 ledger canister and its extensions.
 *
 * @param {Object} params - The parameters for fetching supported standards.
 * @param {boolean} [params.certified=true] - Whether the data should be certified.
 * @param {OptionIdentity} params.identity - The identity to use for the request.
 * @param {CanisterIdText} params.ledgerCanisterId - The ledger canister ID.
 * @returns {Promise<IcrcStandardRecord[]>} The array of all supported standards.
 */
export const icrc10SupportedStandards = async ({
	certified = true,
	identity,
	ledgerCanisterId
}: {
	identity: OptionIdentity;
	ledgerCanisterId: CanisterIdText;
} & QueryParams): Promise<IcrcStandardRecord[]> => {
	assertNonNullish(identity);

	const { icrc10SupportedStandards } = await ledgerCanister({ identity, ledgerCanisterId });

	return icrc10SupportedStandards({ certified });
};

const ledgerCanister = async ({
	identity,
	ledgerCanisterId
}: {
	identity: Identity;
	ledgerCanisterId: CanisterIdText;
}): Promise<IcrcLedgerCanister> => {
	const agent = await getAgent({ identity });

	return IcrcLedgerCanister.create({
		agent,
		canisterId: Principal.fromText(ledgerCanisterId)
	});
};
