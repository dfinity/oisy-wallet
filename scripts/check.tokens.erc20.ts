import {
	ERC20_CONTRACTS_PRODUCTION,
	ERC20_CONTRACTS_SEPOLIA,
	ERC20_TWIN_TOKENS_MAINNET,
	ERC20_TWIN_TOKENS_SEPOLIA
} from '$env/tokens/tokens.erc20.env';
import type { Erc20Contract } from '$eth/types/erc20';

const getAddresses = (contracts: Erc20Contract[]): string[] =>
	contracts.map((contract) => contract.address.toLowerCase());

const productionAddresses = getAddresses(ERC20_CONTRACTS_PRODUCTION);
const twinTokensMainnetAddresses = getAddresses(ERC20_TWIN_TOKENS_MAINNET);

const sepoliaAddresses = getAddresses(ERC20_CONTRACTS_SEPOLIA);
const twinTokensSepoliaAddresses = getAddresses(ERC20_TWIN_TOKENS_SEPOLIA);

const filterDuplicates = ({
	addresses1,
	addresses2
}: {
	addresses1: string[];
	addresses2: string[];
}): string[] => addresses1.filter((address) => addresses2.includes(address));

const mainnetDuplicates = filterDuplicates({
	addresses1: productionAddresses,
	addresses2: twinTokensMainnetAddresses
});
const sepoliaDuplicates = filterDuplicates({
	addresses1: sepoliaAddresses,
	addresses2: twinTokensSepoliaAddresses
});

if (mainnetDuplicates.length > 0 || sepoliaDuplicates.length > 0) {
	if (mainnetDuplicates.length > 0) {
		console.error(
			'Error: Duplicate addresses found between ERC20_CONTRACTS_PRODUCTION and ERC20_TWIN_TOKENS_MAINNET:',
			mainnetDuplicates
		);
	}

	if (sepoliaDuplicates.length > 0) {
		console.error(
			'Error: Duplicate ERC20 token addresses found between ERC20_CONTRACTS_SEPOLIA and ERC20_TWIN_TOKENS_SEPOLIA:',
			sepoliaDuplicates
		);
	}

	process.exit(1);
} else {
	console.log('No ERC20 token duplicates found. All addresses are unique.');
}
