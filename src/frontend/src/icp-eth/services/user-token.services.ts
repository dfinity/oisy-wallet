import type { Erc20Token } from '$eth/types/erc20';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import type { EthereumNetwork } from '$eth/types/network';
import type { OptionIcCkToken } from '$icp/types/ic';
import { setUserToken as setUserTokenApi } from '$lib/api/backend.api';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import type { Identity } from '@dfinity/agent';
import { assertNonNullish, isNullish, toNullable } from '@dfinity/utils';

export const loadCkErc20UserToken = async ({
	erc20UserTokens,
	sendToken,
	identity
}: {
	erc20UserTokens: Erc20UserToken[];
	sendToken: Token;
	identity: OptionIdentity;
}) => {
	if (sendToken.standard !== 'erc20') {
		return;
	}

	const twinToken = (sendToken as OptionIcCkToken)?.twinToken;
	if (isNullish(twinToken)) {
		return;
	}

	const erc20UserToken = erc20UserTokens.find(({ id }) => id === twinToken.id);

	if (erc20UserToken?.enabled === true) {
		return;
	}

	assertNonNullish(identity);

	await setUserToken({
		identity,
		token: erc20UserToken ?? {
			...(twinToken as Erc20Token),
			enabled: false,
			version: undefined
		},
		enabled: true
	});
};

export const setUserToken = async ({
	token,
	identity,
	enabled
}: {
	identity: Identity;
	token: Erc20UserToken;
	enabled: boolean;
}) => {
	const { version, symbol, network, address, decimals } = token;
	const { chainId } = network as EthereumNetwork;

	await setUserTokenApi({
		identity,
		token: {
			chain_id: chainId,
			decimals: toNullable(decimals),
			contract_address: address,
			symbol: toNullable(symbol),
			version: toNullable(version),
			enabled: toNullable(enabled)
		}
	});
};
