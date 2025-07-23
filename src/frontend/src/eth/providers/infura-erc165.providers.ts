import { INFURA_API_KEY } from '$env/rest/infura.env';
import type { Erc165Identifier } from '$eth/constants/erc.constants';
import { ERC165_ABI } from '$eth/constants/erc165.constants';
import type { Erc165Provider } from '$eth/types/contracts-providers';
import type { Erc165ContractAddress } from '$eth/types/erc165';
import { Contract } from 'ethers/contract';
import { InfuraProvider, type Networkish } from 'ethers/providers';

export class InfuraErc165Provider implements Erc165Provider {
	protected readonly provider: InfuraProvider;

	constructor(private readonly network: Networkish) {
		this.provider = new InfuraProvider(this.network, INFURA_API_KEY);
	}

	isSupportedInterface = async ({
		contract: { address: contractAddress },
		interfaceId
	}: {
		contract: Erc165ContractAddress;
		interfaceId: Erc165Identifier;
	}): Promise<boolean> => {
		const erc165Contract = new Contract(contractAddress, ERC165_ABI, this.provider);
		try {
			return await erc165Contract.supportsInterface(interfaceId);
		} catch (_: unknown) {
			// We can assume that if the call fails, the interface is not supported: the list of supported interfaces has this call by standard definition since they all must implement ERC-165.
			return false;
		}
	};
}
