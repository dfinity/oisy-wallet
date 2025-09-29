import type { CustomToken } from '$declarations/backend/backend.did';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { IC_CKETH_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { mockEthAddress, mockEthAddress2, mockEthAddress3 } from '$tests/mocks/eth.mock';
import { mockIndexCanisterId, mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@dfinity/principal';
import { toNullable } from '@dfinity/utils';

export const mockCustomTokens: CustomToken[] = [
	{
		token: {
			Icrc: {
				ledger_id: Principal.fromText(mockLedgerCanisterId),
				index_id: toNullable(Principal.fromText(mockIndexCanisterId))
			}
		},
		version: toNullable(2n),
		enabled: true,
		section: toNullable(),
		allow_external_content_source: toNullable()
	},
	{
		token: {
			Icrc: {
				ledger_id: Principal.fromText(IC_CKETH_LEDGER_CANISTER_ID),
				index_id: toNullable()
			}
		},
		version: toNullable(1n),
		enabled: false,
		section: toNullable(),
		allow_external_content_source: toNullable()
	},
	{
		token: {
			SplDevnet: {
				decimals: toNullable(18),
				symbol: toNullable(),
				token_address: BONK_TOKEN.address
			}
		},
		version: toNullable(),
		enabled: true,
		section: toNullable(),
		allow_external_content_source: toNullable()
	}
];

export const mockCustomTokensErc20: CustomToken[] = [
	{
		version: toNullable(1n),
		enabled: true,
		token: {
			Erc20: {
				chain_id: ETHEREUM_NETWORK.chainId,
				token_address: mockEthAddress
			}
		},
		section: toNullable(),
		allow_external_content_source: toNullable()
	},
	{
		version: toNullable(2n),
		enabled: true,
		token: {
			Erc20: {
				chain_id: BASE_NETWORK.chainId,
				token_address: mockEthAddress2.toUpperCase()
			}
		},
		section: toNullable(),
		allow_external_content_source: toNullable()
	},
	{
		version: toNullable(),
		enabled: false,
		token: {
			Erc20: {
				chain_id: POLYGON_AMOY_NETWORK.chainId,
				token_address: mockEthAddress3
			}
		},
		section: toNullable(),
		allow_external_content_source: toNullable()
	}
];

export const mockCustomTokensErc721: CustomToken[] = [
	{
		version: toNullable(1n),
		enabled: true,
		token: {
			Erc721: {
				chain_id: ETHEREUM_NETWORK.chainId,
				token_address: mockEthAddress
			}
		},
		section: toNullable(),
		allow_external_content_source: toNullable()
	},
	{
		version: toNullable(2n),
		enabled: true,
		token: {
			Erc721: {
				chain_id: BASE_NETWORK.chainId,
				token_address: mockEthAddress2.toUpperCase()
			}
		},
		section: toNullable(),
		allow_external_content_source: toNullable()
	},
	{
		version: toNullable(),
		enabled: false,
		token: {
			Erc721: {
				chain_id: POLYGON_AMOY_NETWORK.chainId,
				token_address: mockEthAddress3
			}
		},
		section: toNullable(),
		allow_external_content_source: toNullable()
	}
];

export const mockCustomTokensErc1155: CustomToken[] = [
	{
		version: toNullable(1n),
		enabled: true,
		token: {
			Erc1155: {
				chain_id: ETHEREUM_NETWORK.chainId,
				token_address: mockEthAddress
			}
		},
		section: toNullable(),
		allow_external_content_source: toNullable()
	},
	{
		version: toNullable(2n),
		enabled: true,
		token: {
			Erc1155: {
				chain_id: BASE_NETWORK.chainId,
				token_address: mockEthAddress2.toUpperCase()
			}
		},
		section: toNullable(),
		allow_external_content_source: toNullable()
	},
	{
		version: toNullable(),
		enabled: false,
		token: {
			Erc1155: {
				chain_id: POLYGON_AMOY_NETWORK.chainId,
				token_address: mockEthAddress3
			}
		},
		section: toNullable(),
		allow_external_content_source: toNullable()
	}
];
