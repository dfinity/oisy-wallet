import type { Result_2 } from '$declarations/airdrop/airdrop.did';
import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import { getAirdropActor } from '$lib/utils/actor.utils';

export const getAirdropCode = async (): Promise<Result_2> => {
	const actor = await getAirdropActor();
	return actor.get_code();
};

export const isAirdropManager = async (): Promise<boolean> => {
	const actor = await getAirdropActor();
	return actor.is_manager();
};

export const redeemAirdropCode = async ({
	code,
	address
}: {
	code: string;
	address: ECDSA_PUBLIC_KEY;
}): Promise<Result_2> => {
	const actor = await getAirdropActor();
	return actor.redeem_code(code, address);
};
