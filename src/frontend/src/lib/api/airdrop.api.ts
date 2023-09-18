import type { Result_1 } from '$declarations/airdrop/airdrop.did';
import { getAirdropActor } from '$lib/utils/actor.utils';

export const getAirdropCode = async (): Promise<Result_1> => {
	const actor = await getAirdropActor();
	return actor.get_code();
};
