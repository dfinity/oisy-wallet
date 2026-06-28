import type {
	ActiveUserTransaction,
	ActiveUserTransactionData,
	ActiveUserTransactionError,
	ActiveUserTransactionRef,
	LiquidiumData,
	OneSecIcpToEvmData
} from '$declarations/backend/backend.did';
import { ZERO } from '$lib/constants/app.constants';
import { LIQUIDIUM_EXTERNAL_REF_KEYS } from '$lib/types/liquidium-active-tx';
import type {
	CreateActiveUserTransactionParams,
	UpdateActiveUserTransactionParams
} from '$lib/types/api';
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
