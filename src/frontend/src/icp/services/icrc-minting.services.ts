import { getMintingAccount } from '$icp/api/icrc-ledger.api';
import type { IcToken } from '$icp/types/ic-token';
import type { OptionIdentity } from '$lib/types/identity';
import { isNullish } from '@dfinity/utils';
import { encodeIcrcAccount, type IcrcAccount } from '@icp-sdk/canisters/ledger/icrc';

export const isUserMintingAccount = async ({
	identity,
	account,
	token: { ledgerCanisterId }
}: {
	identity: OptionIdentity;
	account: IcrcAccount | undefined;
	token: IcToken;
}): Promise<boolean> => {
	if (isNullish(identity) || isNullish(account)) {
		return false;
	}

	const mintingAccount = await getMintingAccount({
		identity,
		ledgerCanisterId
	});

	if (isNullish(mintingAccount)) {
		return false;
	}

	return encodeIcrcAccount(mintingAccount) === encodeIcrcAccount(account);
};
