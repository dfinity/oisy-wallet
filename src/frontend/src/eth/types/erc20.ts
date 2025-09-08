import type { ContractAddress } from '$eth/types/address';
import type { EthereumNetwork } from '$eth/types/network';
import type { Exchange } from '$lib/types/exchange';
import type {
	RequiredToken,
	Token,
	TokenLinkedData,
	TokenMetadata,
	TokenStandard
} from '$lib/types/token';
import type { Option } from '$lib/types/utils';

type Erc20Standard = Extract<TokenStandard, 'erc20'>;

export type Erc20Token = Erc20Contract &
	Omit<Token, 'network' | 'standard'> & { network: EthereumNetwork; standard: Erc20Standard };

export type RequiredErc20Token = RequiredToken<Erc20Token>;
export type RequiredAdditionalErc20Token = Omit<RequiredErc20Token, keyof TokenLinkedData>;

export type Erc20ContractAddress = ContractAddress;
export type Erc20Contract = Erc20ContractAddress & { exchange: Exchange } & TokenLinkedData;

export type Erc20Metadata = TokenMetadata;

export type OptionErc20Token = Option<Erc20Token>;
