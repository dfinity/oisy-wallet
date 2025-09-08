import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import { getAgent } from '$lib/actors/agents.ic';
import type { CanisterApiFunctionParams, CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import {
	IcrcLedgerCanister,
	type GetBlocksParams,
	type IcrcAccount,
	type IcrcAllowance,
	type IcrcBlockIndex,
	type IcrcGetBlocksResult,
	type IcrcSubaccount,
	type IcrcTokenMetadataResponse,
	type IcrcTokens
} from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, toNullable, type QueryParams } from '@dfinity/utils';

/**
 * Retrieves metadata for the ICRC token.
 *
 * @param {Object} params - The parameters for fetching metadata.
 * @param {boolean} [params.certified=true] - Whether the data should be certified.
 * @param {OptionIdentity} params.identity - The identity to use for the request.
 * @param {CanisterIdText} params.ledgerCanisterId - The ledger canister ID.
 * @param {QueryParams} params.rest - Additional query parameters.
 * @returns {Promise<IcrcTokenMetadataResponse>} The metadata response for the ICRC token.
 */
export const metadata = async ({
	certified = true,
	identity,
	...rest
}: {
	identity: OptionIdentity;
	ledgerCanisterId: CanisterIdText;
} & QueryParams): Promise<IcrcTokenMetadataResponse> => {
	assertNonNullish(identity);

	const { metadata } = await ledgerCanister({ identity, ...rest });

	return metadata({ certified });
};

/**
 * Retrieves ledger transaction fee for the ICRC token.
 *
 * @param {Object} params - The parameters for fetching transaction fee.
 * @param {boolean} [params.certified=true] - Whether the data should be certified.
 * @param {OptionIdentity} params.identity - The identity to use for the request.
 * @param {CanisterIdText} params.ledgerCanisterId - The ledger canister ID.
 * @param {QueryParams} params.rest - Additional query parameters.
 * @returns {Promise<IcrcTokenMetadataResponse>} The metadata response for the ICRC token.
 */
export const transactionFee = async ({
	certified = true,
	identity,
	...rest
}: {
	identity: OptionIdentity;
	ledgerCanisterId: CanisterIdText;
} & QueryParams): Promise<bigint> => {
	assertNonNullish(identity);

	const { transactionFee } = await ledgerCanister({ identity, ...rest });

	return transactionFee({ certified });
};

/**
 * Retrieves the balance of ICRC tokens for a specified owner.
 *
 * @param {Object} params - The parameters for fetching the balance.
 * @param {boolean} [params.certified=true] - Whether the balance data should be certified.
 * @param {Principal} params.owner - The principal of the account owner.
 * @param {OptionIdentity} params.identity - The identity to use for the request.
 * @param {CanisterIdText} params.ledgerCanisterId - The ledger canister ID.
 * @param {QueryParams} params.rest - Additional query parameters.
 * @returns {Promise<IcrcTokens>} The balance of ICRC tokens.
 */
export const balance = async ({
	certified = true,
	owner,
	identity,
	...rest
}: {
	owner: Principal;
	identity: OptionIdentity;
	ledgerCanisterId: CanisterIdText;
} & QueryParams): Promise<IcrcTokens> => {
	assertNonNullish(identity);

	const { balance } = await ledgerCanister({ identity, ...rest });

	return balance({ certified, ...getIcrcAccount(owner) });
};

/**
 * Executes a transfer of ICRC tokens.
 *
 * @param {Object} params - The parameters for the transfer.
 * @param {OptionIdentity} params.identity - The identity to use for the transfer.
 * @param {IcrcAccount} params.to - The recipient's account.
 * @param {bigint} params.amount - The amount to transfer.
 * @param {bigint} [params.createdAt] - Optional timestamp for when the transfer was created.
 * @param {CanisterIdText} params.ledgerCanisterId - The ledger canister ID.
 * @returns {Promise<IcrcBlockIndex>} The block index of the transfer.
 */
export const transfer = async ({
	identity,
	to,
	amount,
	createdAt,
	ledgerCanisterId
}: {
	identity: OptionIdentity;
	to: IcrcAccount;
	amount: bigint;
	createdAt?: bigint;
	ledgerCanisterId: CanisterIdText;
}): Promise<IcrcBlockIndex> => {
	assertNonNullish(identity);

	const { transfer } = await ledgerCanister({ identity, ledgerCanisterId });

	return transfer({
		to: toAccount(to),
		amount,
		created_at_time: createdAt ?? nowInBigIntNanoSeconds()
	});
};

/**
 * Approves a spender for a specified amount of ICRC tokens.
 *
 * @param {Object} params - The parameters for the approval.
 * @param {OptionIdentity} params.identity - The identity to use for the approval.
 * @param {CanisterIdText} params.ledgerCanisterId - The ledger canister ID.
 * @param {bigint} params.amount - The amount to approve.
 * @param {IcrcAccount} params.spender - The account to approve as a spender.
 * @param {bigint} params.expiresAt - The expiration timestamp for the approval.
 * @param {bigint} [params.createdAt] - Optional timestamp for when the approval was created.
 * @returns {Promise<IcrcBlockIndex>} The block index of the approval.
 */
export const approve = async ({
	identity,
	ledgerCanisterId,
	amount,
	spender,
	expiresAt: expires_at,
	createdAt
}: {
	identity: OptionIdentity;
	ledgerCanisterId: CanisterIdText;
	amount: bigint;
	spender: IcrcAccount;
	expiresAt: bigint;
	createdAt?: bigint;
}): Promise<IcrcBlockIndex> => {
	assertNonNullish(identity);

	const { approve } = await ledgerCanister({ identity, ledgerCanisterId });

	return approve({
		amount,
		spender: toAccount(spender),
		expires_at,
		created_at_time: createdAt ?? nowInBigIntNanoSeconds()
	});
};

/**
 * Retrieves the allowance for a spender on behalf of an owner for ICRC tokens.
 *
 * @param {Object} params - The parameters for fetching the allowance.
 * @param {boolean} [params.certified=true] - Whether the data should be certified.
 * @param {OptionIdentity} params.identity - The identity to use for the request.
 * @param {CanisterIdText} params.ledgerCanisterId - The ledger canister ID.
 * @param {IcrcAccount} params.owner - The account owner.
 * @param {IcrcAccount} params.spender - The account approved to spend on behalf of the owner.
 * @returns {Promise<IcrcAllowance>} The allowance details including amount and expiration.
 */
export const allowance = async ({
	certified = true,
	identity,
	ledgerCanisterId,
	owner,
	spender
}: CanisterApiFunctionParams<
	{
		ledgerCanisterId: CanisterIdText;
		owner: IcrcAccount;
		spender: IcrcAccount;
	} & QueryParams
>): Promise<IcrcAllowance> => {
	assertNonNullish(identity);
	const { allowance } = await ledgerCanister({ identity, ledgerCanisterId });

	return allowance({
		certified,
		account: toAccount(owner),
		spender: toAccount(spender)
	});
};

const toAccount = ({
	owner,
	subaccount
}: IcrcAccount): { owner: Principal; subaccount: [] | [IcrcSubaccount] } => ({
	owner,
	subaccount: toNullable(subaccount)
});

export const getBlocks = async ({
	certified = true,
	identity,
	ledgerCanisterId,
	...rest
}: {
	identity: OptionIdentity;
	ledgerCanisterId: CanisterIdText;
} & GetBlocksParams): Promise<IcrcGetBlocksResult> => {
	assertNonNullish(identity);

	const { getBlocks } = await ledgerCanister({ identity, ledgerCanisterId });

	return getBlocks({ certified, ...rest });
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
