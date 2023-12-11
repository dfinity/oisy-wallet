import type { Result_1, Result_3 } from '$declarations/airdrop/airdrop.did';
import { getAirdropActor } from '$lib/ic/actor.ic';
import type { OptionIdentity } from '$lib/types/identity';

export const getAirdropCode = async (identity: OptionIdentity): Promise<Result_3> => {
	const actor = await getAirdropActor({ identity });
	return actor.get_code();
};

export const isAirdropManager = async (identity: OptionIdentity): Promise<boolean> => {
	const actor = await getAirdropActor({ identity });
	return actor.is_manager();
};

export const generateAirdropCode = async (identity: OptionIdentity): Promise<Result_1> => {
	const actor = await getAirdropActor({ identity });
	return actor.generate_code();
};

export const redeemAirdropCode = async ({
	code,
	identity
}: {
	code: string;
	identity: OptionIdentity;
}): Promise<Result_3> => {
	const actor = await getAirdropActor({ identity });
	return actor.redeem_code(code);
};
