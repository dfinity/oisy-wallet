import {
	loadBtcAddressMainnet,
	loadIdbBtcAddressMainnet
} from '$btc/services/btc-address.services';
import { BTC_MAINNET_TOKEN_ID } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { loadEthAddress, loadIdbEthAddress } from '$eth/services/eth-address.services';
import type { LoadIdbAddressError } from '$lib/types/errors';
import type { TokenId } from '$lib/types/token';
import type { ResultSuccess, ResultSuccessReduced } from '$lib/types/utils';
import { reduceResults } from '$lib/utils/results.utils';
import {
	loadIdbSolAddressMainnet,
	loadSolAddressMainnet
} from '$sol/services/sol-address.services';

export const loadAddresses = async (tokenIds: TokenId[]): Promise<ResultSuccess> => {
	const results = await Promise.all([
		tokenIds.includes(BTC_MAINNET_TOKEN_ID)
			? loadBtcAddressMainnet()
			: Promise.resolve({ success: true }),
		tokenIds.includes(ETHEREUM_TOKEN_ID) ? loadEthAddress() : Promise.resolve({ success: true }),
		tokenIds.includes(SOLANA_TOKEN_ID)
			? loadSolAddressMainnet()
			: Promise.resolve({ success: true })
	]);

	return { success: results.every(({ success }) => success) };
};

export const loadIdbAddresses = async (): Promise<ResultSuccessReduced<LoadIdbAddressError>> => {
	const results = await Promise.all([
		loadIdbBtcAddressMainnet(),
		loadIdbEthAddress(),
		loadIdbSolAddressMainnet()
	]);

	const { success, err } = reduceResults<LoadIdbAddressError>(results);

	return { success, err };
};
