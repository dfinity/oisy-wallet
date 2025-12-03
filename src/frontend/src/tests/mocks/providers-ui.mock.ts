import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { GLDT_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import type { IcToken } from '$icp/types/ic-token';
import { stakeProvidersConfig } from '$lib/config/stake.config';
import type { ProviderUi } from '$lib/types/provider-ui';
import { StakeProvider } from '$lib/types/stake';
import { parseTokenId } from '$lib/validation/token.validation';

const mockGldtToken: IcToken = {
	id: parseTokenId('GOLDAO'),
	symbol: 'GLDT',
	name: 'Gold DAO Token',
	decimals: 8,
	network: ICP_NETWORK,
	standard: 'icrc',
	ledgerCanisterId: GLDT_LEDGER_CANISTER_ID,
	position: 1,
	fee: 100n,
	category: 'custom'
};

export const mockProviderUi: ProviderUi = {
	...stakeProvidersConfig[StakeProvider.GLDT],
	maxApy: 6,
	totalEarningPerYear: 45,
	totalPositionUsd: 123,
	tokens: [mockGldtToken]
};
