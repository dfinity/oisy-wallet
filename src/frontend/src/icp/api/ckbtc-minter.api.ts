import type { MinterInfoParams } from '$icp/types/ck';
import { getAgent } from '$lib/actors/agents.ic';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';
import {
	CkBtcMinterCanister,
	type CkBtcMinterDid,
	type EstimateWithdrawalFee,
	type EstimateWithdrawalFeeParams,
	type RetrieveBtcStatusV2WithId,
	type UpdateBalanceOk
} from '@icp-sdk/canisters/ckbtc';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

export const retrieveBtc = async ({
	identity,
	minterCanisterId,
	...params
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
	amount: bigint;
	address: string;
}): Promise<CkBtcMinterDid.RetrieveBtcOk> => {
	assertNonNullish(identity);

	const { retrieveBtcWithApproval } = await minterCanister({ identity, minterCanisterId });

	return retrieveBtcWithApproval(params);
};

export const updateBalance = async ({
	identity,
	minterCanisterId
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
}): Promise<UpdateBalanceOk> => {
	assertNonNullish(identity);

	const { updateBalance } = await minterCanister({ identity, minterCanisterId });

	return updateBalance(minterAccountParams({ identity }));
};

export const minterInfo = async ({
	identity,
	minterCanisterId,
	...rest
}: MinterInfoParams): Promise<CkBtcMinterDid.MinterInfo> => {
	assertNonNullish(identity);

	const { getMinterInfo } = await minterCanister({ identity, minterCanisterId });

	return getMinterInfo(rest);
};

export const getBtcAddress = async ({
	identity,
	minterCanisterId
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
}): Promise<string> => {
	assertNonNullish(identity);

	const { getBtcAddress } = await minterCanister({ identity, minterCanisterId });

	return getBtcAddress(minterAccountParams({ identity }));
};

export const estimateFee = async ({
	identity,
	minterCanisterId,
	...params
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
} & EstimateWithdrawalFeeParams): Promise<EstimateWithdrawalFee> => {
	assertNonNullish(identity);

	const { estimateWithdrawalFee } = await minterCanister({ identity, minterCanisterId });

	return estimateWithdrawalFee(params);
};

export const withdrawalStatuses = async ({
	identity,
	minterCanisterId,
	...params
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
} & Required<QueryParams>): Promise<RetrieveBtcStatusV2WithId[]> => {
	assertNonNullish(identity);

	const { retrieveBtcStatusV2ByAccount } = await minterCanister({ identity, minterCanisterId });

	return retrieveBtcStatusV2ByAccount(params);
};

export const getKnownUtxos = async ({
	identity,
	minterCanisterId
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
}): Promise<CkBtcMinterDid.Utxo[]> => {
	assertNonNullish(identity);

	const { getKnownUtxos } = await minterCanister({ identity, minterCanisterId });

	return getKnownUtxos(minterAccountParams({ identity }));
};

const minterCanister = async ({
	identity,
	minterCanisterId
}: {
	identity: Identity;
	minterCanisterId: CanisterIdText;
}): Promise<CkBtcMinterCanister> => {
	const agent = await getAgent({ identity });

	return CkBtcMinterCanister.create({
		agent,
		canisterId: Principal.fromText(minterCanisterId)
	});
};

const minterAccountParams = ({ identity }: { identity: Identity }): { owner: Principal } =>
	// We use the identity to follow NNS-dapp's scheme but, if it was not provided, it would be the same result.
	// If "owner" is not provided, the minter canister uses the "caller" as a fallback.
	({
		owner: identity.getPrincipal()
	});
