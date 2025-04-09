import { mockPrincipal } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';

export const mockEthHelperContractAddress = 'eth-helper-contract-address';

export const mockErc20HelperContractAddress = 'erc20-helper-contract-address';

export const mockCkEthereumMinterAddress = 'ck-minter-address';

export const mockCkMinterInfo = {
	deposit_with_subaccount_helper_contract_address: toNullable(''),
	eth_balance: toNullable(100n),
	eth_helper_contract_address: toNullable(mockEthHelperContractAddress),
	last_observed_block_number: toNullable(100n),
	evm_rpc_id: toNullable(mockPrincipal),
	erc20_helper_contract_address: toNullable(mockErc20HelperContractAddress),
	last_erc20_scraped_block_number: toNullable(100n),
	supported_ckerc20_tokens: toNullable([]),
	last_gas_fee_estimate: toNullable({
		max_priority_fee_per_gas: 100n,
		max_fee_per_gas: 100n,
		timestamp: 100n
	}),
	cketh_ledger_id: toNullable(mockPrincipal),
	smart_contract_address: toNullable(''),
	last_eth_scraped_block_number: toNullable(100n),
	minimum_withdrawal_amount: toNullable(100n),
	erc20_balances: toNullable([]),
	minter_address: toNullable(mockCkEthereumMinterAddress),
	last_deposit_with_subaccount_scraped_block_number: toNullable(100n),
	ethereum_block_height: toNullable({ Safe: null })
};
