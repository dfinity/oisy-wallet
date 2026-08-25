import type {
	ActiveUserTransaction,
	ActiveUserTransactionData,
	ActiveUserTransactionError,
	ActiveUserTransactionRef,
	ChainFusionData,
	LiquidiumData,
	NearIntentsData,
	OneSecIcpToEvmData,
	VeloraData
} from '$declarations/backend/backend.did';
import { ZERO } from '$lib/constants/app.constants';
import type {
	CreateActiveUserTransactionParams,
	UpdateActiveUserTransactionParams
} from '$lib/types/api';
import { CHAIN_FUSION_EXTERNAL_REF_KEYS } from '$lib/types/chain-fusion-swap';
import { LIQUIDIUM_EXTERNAL_REF_KEYS } from '$lib/types/liquidium-active-tx';
import { NEAR_INTENTS_EXTERNAL_REF_KEYS } from '$lib/types/near-intents';
import { VELORA_EXTERNAL_REF_KEYS } from '$lib/types/velora-swap';
import { mockPrincipal } from '$tests/mocks/identity.mock';

export const mockActiveUserTransactionId = '11111111-1111-4111-8111-111111111111';

export const mockRecipientEvmAddress = '0x0000000000000000000000000000000000000001';

export const mockOneSecIcpToEvmData: OneSecIcpToEvmData = {
	source_token: { Icrc: mockPrincipal },
	dest_token: { EvmNative: 1n },
	amount: 1_000_000n,
	recipient_evm_address: mockRecipientEvmAddress
};

export const mockActiveUserTransactionData: ActiveUserTransactionData = {
	OneSecIcpToEvm: mockOneSecIcpToEvmData
};

export const mockNearIntentsData: NearIntentsData = {
	source_token: { Erc20: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 1n] },
	dest_token: { SplMainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
	amount: 1_000_000n
};

export const mockNearIntentsActiveUserTransaction: ActiveUserTransaction = {
	id: '33333333-3333-4333-8333-333333333333',
	status: { Pending: null },
	data: { NearIntents: mockNearIntentsData },
	progress_step: [],
	external_refs: [
		{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_ADDRESS, value: '0xDepositAddress123' },
		{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.AMOUNT, value: '1' },
		{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL, value: 'USDC' },
		{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL, value: 'Ethereum' },
		{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL, value: 'USDC' },
		{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL, value: 'Solana' }
	],
	created_at_ns: ZERO,
	updated_at_ns: ZERO,
	error: []
};

export const mockVeloraData: VeloraData = {
	mode: { Delta: null },
	source_token: { Erc20: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 1n] },
	dest_token: { Erc20: ['0xdAC17F958D2ee523a2206206994597C13D831ec7', 1n] },
	amount: 1_000_000n
};

export const mockVeloraActiveUserTransaction: ActiveUserTransaction = {
	id: '44444444-4444-4444-8444-444444444444',
	status: { Pending: null },
	data: { Velora: mockVeloraData },
	progress_step: [],
	external_refs: [
		{ key: VELORA_EXTERNAL_REF_KEYS.AUCTION_ID, value: 'auction-123' },
		{ key: VELORA_EXTERNAL_REF_KEYS.CHAIN_ID, value: '1' },
		{ key: VELORA_EXTERNAL_REF_KEYS.AMOUNT, value: '1' },
		{ key: VELORA_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE, value: '1.0002' },
		{ key: VELORA_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL, value: 'USDC' },
		{ key: VELORA_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL, value: 'Ethereum' },
		{ key: VELORA_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL, value: 'USDT' },
		{ key: VELORA_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL, value: 'Ethereum' }
	],
	created_at_ns: ZERO,
	updated_at_ns: ZERO,
	error: []
};

export const mockChainFusionData: ChainFusionData = {
	direction: { CkEthToEth: null },
	source_token: { Icrc: mockPrincipal },
	dest_token: { EvmNative: 1n },
	amount: 1_000_000n
};

export const mockChainFusionActiveUserTransaction: ActiveUserTransaction = {
	id: '66666666-6666-4666-8666-666666666666',
	status: { Pending: null },
	data: { ChainFusion: mockChainFusionData },
	progress_step: [],
	external_refs: [
		{
			key: CHAIN_FUSION_EXTERNAL_REF_KEYS.MINTER_CANISTER_ID,
			value: 'sv3dd-oaaaa-aaaar-qacoa-cai'
		},
		{ key: CHAIN_FUSION_EXTERNAL_REF_KEYS.CKETH_BLOCK_INDEX, value: '7' },
		{ key: CHAIN_FUSION_EXTERNAL_REF_KEYS.AMOUNT, value: '1' },
		{ key: CHAIN_FUSION_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE, value: '3000' },
		{ key: CHAIN_FUSION_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL, value: 'ckETH' },
		{ key: CHAIN_FUSION_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL, value: 'Internet Computer' },
		{ key: CHAIN_FUSION_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL, value: 'ETH' },
		{ key: CHAIN_FUSION_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL, value: 'Ethereum' }
	],
	created_at_ns: ZERO,
	updated_at_ns: ZERO,
	error: []
};

export const mockLiquidiumData: LiquidiumData = {
	token: { BtcNativeMainnet: null },
	action: { Supply: null },
	pool_id: 'pool-btc',
	amount: 100_000_000n
};

export const mockLiquidiumActiveUserTransaction: ActiveUserTransaction = {
	id: '22222222-2222-4222-8222-222222222222',
	status: { Pending: null },
	data: {
		Liquidium: mockLiquidiumData
	},
	progress_step: ['submitting'],
	external_refs: [
		{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID, value: 'profile-1' },
		{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.TXID, value: '0xabc' },
		{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.AMOUNT, value: '1' },
		{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.ASSET_SYMBOL, value: 'BTC' }
	],
	created_at_ns: ZERO,
	updated_at_ns: ZERO,
	error: []
};

export const mockActiveUserTransactionRef: ActiveUserTransactionRef = {
	key: 'tx_hash',
	value: '0xabc'
};

export const mockActiveUserTransaction: ActiveUserTransaction = {
	id: mockActiveUserTransactionId,
	status: { Pending: null },
	data: mockActiveUserTransactionData,
	progress_step: ['submitting'],
	external_refs: [],
	created_at_ns: 1n,
	updated_at_ns: 1n,
	error: []
};

export const mockCreateActiveUserTransactionParams: CreateActiveUserTransactionParams = {
	id: mockActiveUserTransactionId,
	data: mockActiveUserTransactionData,
	progressStep: 'submitting',
	externalRefs: []
};

export const mockUpdateActiveUserTransactionParams: UpdateActiveUserTransactionParams = {
	id: mockActiveUserTransactionId,
	status: { Executing: null },
	progressStep: 'settling',
	externalRefs: [mockActiveUserTransactionRef]
};

export const mockActiveUserTransactionErrorNotFound: ActiveUserTransactionError = {
	NotFound: null
};
