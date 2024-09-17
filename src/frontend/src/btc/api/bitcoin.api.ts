import { mapToSignerBitcoinNetwork } from '$btc/utils/network.utils';
import { signerCanister } from '$lib/services/signer.services';
import type { Identity } from '@dfinity/agent';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import { assertNonNullish } from '@dfinity/utils';

export const getBalanceUpdate = async ({
	identity,
	network
}: {
	identity: Identity;
	network: BitcoinNetwork;
}): Promise<bigint> => {
	assertNonNullish(identity);

	const { getBtcBalance } = await signerCanister({ identity });

	return getBtcBalance({
		network: mapToSignerBitcoinNetwork({ network })
	});
};
