import { ERC20_FALLBACK_FEE } from '$lib/constants/erc20.constants';
import { TargetNetwork } from '$lib/enums/network';
import { getFeeData as getBurnFeeData } from '$lib/providers/infura-erc20-icp.providers';
import { getFeeData } from '$lib/providers/infura-erc20.providers';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { Erc20ContractAddress } from '$lib/types/erc20';
import { BigNumber } from '@ethersproject/bignumber';
import {nonNullish} from "@dfinity/utils";
import {isContractAddress} from "$lib/services/address.services";
import {ETH_BASE_FEE} from "$lib/constants/eth.constants";
import {get} from "svelte/store";
import {abiStore} from "$lib/stores/abi.store";
import {contractAbi} from "$lib/rest/etherscan.rest";

export const getErc20Gas = async ({
	network,
	...rest
}: {
	contract: Erc20ContractAddress;
	address: ETH_ADDRESS;
	amount: BigNumber;
	network: TargetNetwork | undefined;
}): Promise<BigNumber> => {
	try {
		const fn = network === TargetNetwork.ICP ? getBurnFeeData : getFeeData;
		return await fn(rest);
	} catch (err: unknown) {
		// We silence the error on purpose.
		// The queries above often produce errors on mainnet, even when all parameters are correctly set.
		// Additionally, it's possible that the queries are executed with inaccurate parameters, such as when a user enters an incorrect address or an address that is not supported by the selected function (e.g., an ICP account identifier on the Ethereum network rather than for the burn contract).
		console.error(err);

		return BigNumber.from(ERC20_FALLBACK_FEE);
	}
};

export const getEthereumGas = async (destination: ETH_ADDRESS): Promise<BigNumber> => {
	if (destination !== '' && await isContractAddress(destination)) {
		const abi = await getAbi(destination);

		console.log(abi)

		// let signature = input.slice(0, 10);

	}

	return BigNumber.from(ETH_BASE_FEE);
}

const getAbi = async (destination: ETH_ADDRESS): Promise<string | undefined> => {
	const abi = get(abiStore)?.[destination];

	if (nonNullish(abi)) {
		return abi;
	}

	const etherscanContractAbi = await contractAbi(destination);

	// Save abi for later usage
	abiStore.set({address: destination, abi: etherscanContractAbi});

	return etherscanContractAbi;
}