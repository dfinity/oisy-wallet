import { ERC20_FALLBACK_FEE } from '$eth/constants/erc20.constants';
import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import { getFeeData as getCkEthFeeData } from '$eth/providers/infura-cketh.providers';
import { getFeeData as getBurnFeeData } from '$eth/providers/infura-erc20-icp.providers';
import { getFeeData as getErc20FeeDataProvider } from '$eth/providers/infura-erc20.providers';
import { CKETH_HELPER_CONTRACT } from '$eth/types/cketh';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import { ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { Network } from '$lib/types/network';
import { isNetworkICP } from '$lib/utils/network.utils';
import { assertNonNullish, decodeBase32, encodeBase32 } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

export interface GetFeeData {
	address: ETH_ADDRESS;
}

export const getEthFeeData = async ({
	address,
	identity,
	ckEthContract
}: GetFeeData & {
	identity: OptionIdentity;
	ckEthContract: Erc20ContractAddress;
}): Promise<BigNumber> => {
	console.log(address, address === CKETH_HELPER_CONTRACT);

	if (address === CKETH_HELPER_CONTRACT) {
		assertNonNullish(identity, 'No identity provided to calculate the fee for its principal.');

		const rawBytes = decodeBase32(identity.getPrincipal().toText().toLowerCase().replace(/-/g, ''));
		const encoded = encodeBase32(rawBytes);

		console.log(
			identity.getPrincipal().toText(),
			decodeBase32(identity.getPrincipal().toText().toLowerCase().replace(/-/g, ''))
		);

		const tmp = await getCkEthFeeData({
			address: decodeBase32(identity.getPrincipal().toText().toLowerCase().replace(/-/g, '')),
			contract: ckEthContract
		});

		return tmp;
	}

	return BigNumber.from(ETH_BASE_FEE);
};

export const getErc20FeeData = async ({
	network,
	...rest
}: GetFeeData & {
	contract: Erc20ContractAddress;
	amount: BigNumber;
	network: Network | undefined;
}): Promise<BigNumber> => {
	try {
		const fn = isNetworkICP(network ?? ETHEREUM_NETWORK) ? getBurnFeeData : getErc20FeeDataProvider;
		return await fn(rest);
	} catch (err: unknown) {
		// We silence the error on purpose.
		// The queries above often produce errors on mainnet, even when all parameters are correctly set.
		// Additionally, it's possible that the queries are executed with inaccurate parameters, such as when a user enters an incorrect address or an address that is not supported by the selected function (e.g., an ICP account identifier on the Ethereum network rather than for the burn contract).
		console.error(err);

		return BigNumber.from(ERC20_FALLBACK_FEE);
	}
};
