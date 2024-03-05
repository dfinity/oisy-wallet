import { getAgent } from '$lib/actors/agents.ic';
import type { OptionIdentity } from '$lib/types/identity';
import type {
    BitcoinGetUtxosParams,
    bitcoin_get_utxos_result,
    bitcoin_get_utxos_query_result
} from '@dfinity/ic-management';
import { ICManagementCanister } from '@dfinity/ic-management';
import { assertNonNullish } from '@dfinity/utils';

export const getBitcoinUtxos = async ({
	identity,
	...rest
}: { identity: OptionIdentity } & BitcoinGetUtxosParams): Promise<bitcoin_get_utxos_result> => {
	assertNonNullish(identity, 'No internet identity.');

	const agent = await getAgent({ identity });

	const { bitcoinGetUtxos } = ICManagementCanister.create({ agent });

	return bitcoinGetUtxos(rest);
};

export const getBitcoinUtxosQuery = async ({
	identity,
	...rest
}: { identity: OptionIdentity } & BitcoinGetUtxosParams): Promise<bitcoin_get_utxos_query_result> => {
	assertNonNullish(identity, 'No internet identity.');

	const agent = await getAgent({ identity });

	const { bitcoinGetUtxosQuery } = ICManagementCanister.create({ agent });

	return bitcoinGetUtxosQuery(rest);
};
