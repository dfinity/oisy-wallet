import type { Result_1, Result_3 } from '$declarations/airdrop/airdrop.did';
import { getAirdropActor } from '$lib/utils/actor.utils';
import type { Identity } from '@dfinity/agent';

export const getAirdropCode = async (identity?: Identity): Promise<Result_3> => {
	const actor = await getAirdropActor(identity);
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

export const redeemAirdropCode = async ({ code }: { code: string }): Promise<Result_3> => {
	const actor = await getAirdropActor();
	return actor.redeem_code(code);
};
