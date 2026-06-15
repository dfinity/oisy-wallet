import {
	initUtxosFeeStore,
	UTXOS_FEE_CONTEXT_KEY,
	type UtxosFeeStore
} from '$btc/stores/utxos-fee.store';
import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
import {
	IC_TOKEN_FEE_CONTEXT_KEY,
	icTokenFeeStore,
	type IcTokenFeeStore
} from '$icp/stores/ic-token-fee.store';
import { SOL_FEE_CONTEXT_KEY, type FeeContext as SolFeeContext } from '$sol/stores/sol-fee.store';
import type { MockContextEntry } from '$tests/utils/context.test-utils';

export const mockUtxosFeeContextEntry = (
	store: UtxosFeeStore = initUtxosFeeStore()
): MockContextEntry => [UTXOS_FEE_CONTEXT_KEY, { store }];

export const mockIcTokenFeeContextEntry = (
	store: IcTokenFeeStore = icTokenFeeStore
): MockContextEntry => [IC_TOKEN_FEE_CONTEXT_KEY, { store }];

export const mockEthFeeContextEntry = (
	context: Partial<EthFeeContext> & Pick<EthFeeContext, 'feeStore'>
): MockContextEntry => [ETH_FEE_CONTEXT_KEY, context];

export const mockSolFeeContextEntry = (context: SolFeeContext): MockContextEntry => [
	SOL_FEE_CONTEXT_KEY,
	context
];
