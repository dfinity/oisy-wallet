import type { Result_1, Result_2 } from '$declarations/airdrop/airdrop.did';
import { getAirdropActor } from '$lib/utils/actor.utils';

export const getAirdropCode = async (): Promise<Result_2> => {
	const actor = await getAirdropActor();
	return actor.get_code();
};

export const isAirdropManager = async (): Promise<boolean> => {
	const actor = await getAirdropActor();
	return actor.is_manager();
};

export const generateAirdropCode = async (): Promise<Result_1> => {
	const actor = await getAirdropActor();
	return actor.generate_code();
};

export const redeemAirdropCode = async ({ code }: { code: string }): Promise<Result_2> => {
	const actor = await getAirdropActor();
	return actor.redeem_code(code);
};
