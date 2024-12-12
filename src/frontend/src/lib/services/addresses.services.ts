import {
	loadBtcAddressMainnet,
	loadIdbBtcAddressMainnet
} from '$btc/services/btc-address.services';
import { BTC_MAINNET_TOKEN_ID } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { loadEthAddress, loadIdbEthAddress } from '$eth/services/eth-address.services';
import { LoadIdbAddressError } from '$lib/types/errors';
import type { TokenId } from '$lib/types/token';
import type { ResultSuccess, ResultSuccessReduced } from '$lib/types/utils';
import { reduceResults } from '$lib/utils/results.utils';

export const loadAddresses = async (tokenIds: TokenId[]): Promise<ResultSuccess> => {
	const results = await Promise.all([
		tokenIds.includes(BTC_MAINNET_TOKEN_ID)
			? loadBtcAddressMainnet()
			: Promise.resolve({ success: true }),
		tokenIds.includes(ETHEREUM_TOKEN_ID) ? loadEthAddress() : Promise.resolve({ success: true })
	]);

	return { success: results.every(({ success }) => success) };
};

export const loadIdbAddresses = async (): Promise<ResultSuccessReduced<LoadIdbAddressError>> => {
	const results = await Promise.all([loadIdbBtcAddressMainnet(), loadIdbEthAddress()]);

	const { success, err } = reduceResults<LoadIdbAddressError>(results);

	return { success, err };
};
