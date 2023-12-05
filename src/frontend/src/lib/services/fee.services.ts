import { ERC20_FALLBACK_FEE } from '$lib/constants/erc20.constants';
import { ETH_BASE_FEE } from '$lib/constants/eth.constants';
import { TargetNetwork } from '$lib/enums/network';
import { getFeeData as getBurnFeeData } from '$lib/providers/infura-erc20-icp.providers';
import { getFeeData } from '$lib/providers/infura-erc20.providers';
import { getContractFeeData } from '$lib/providers/infura.providers';
import { contractAbi } from '$lib/rest/etherscan.rest';
import { isContractAddress } from '$lib/services/address.services';
import { abiStore } from '$lib/stores/abi.store';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { Erc20ContractAddress } from '$lib/types/erc20';
import { nonNullish } from '@dfinity/utils';
import type { JsonFragment } from '@ethersproject/abi/lib/fragments';
import { BigNumber } from '@ethersproject/bignumber';
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils';
import { get } from 'svelte/store';

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

export const getEthereumGas = async ({
	destination,
	amount
}: {
	destination: ETH_ADDRESS;
	amount: BigNumber;
}): Promise<BigNumber> => {
	if (destination !== '' && (await isContractAddress(destination))) {
		const abi = await getAbi(destination);

		// TODO: this should be a parameter
		const data = '0xb214faa51dfeb26f62a9b69cf6c4d7e35df85d33c08ff494378bc61ab5c65ec855020000';

		// TODO: refactor me
		const fourBytes = data.slice(0, 10);

		const jsonAbi = JSON.parse(abi) as JsonFragment[];
		const fnFragment = jsonAbi
			.filter(({ type, name }) => type === 'function' && nonNullish(name))
			.find(({ name, inputs }) => {
				const signature = `${name}(${(inputs ?? [])
					.map(({ internalType }) => internalType)
					.filter(nonNullish)
					.join()})`;
				const hash = keccak256(toUtf8Bytes(signature));
				const selector = hash.slice(0, 10);

				return fourBytes === selector;
			});

		if (nonNullish(fnFragment)) {
			// TODO: should we use this to call the estimation on the contract fee ????

			const test = await getContractFeeData({
				contractAddress: destination,
				abi,
				fn: "deposit"
			});

			console.log(abi, test.toNumber());

			// let signature = input.slice(0, 10);
		}
	}

	return BigNumber.from(ETH_BASE_FEE);
};

const getAbi = async (destination: ETH_ADDRESS): Promise<string> => {
	const abi = get(abiStore)?.[destination];

	if (nonNullish(abi)) {
		return abi;
	}

	const etherscanContractAbi = await contractAbi(destination);

	// Save abi for later usage
	abiStore.set({ address: destination, abi: etherscanContractAbi });

	return etherscanContractAbi;
};
