import { HARVEST_AUTOPILOT_ADDRESSES } from '$eth/constants/harvest-autopilots.constants';
import type { EthCertifiedTransaction } from '$eth/stores/eth-transactions.store';
import type { OptionEthAddress } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc20CustomToken } from '$eth/types/erc20-custom-token';
import type { Erc4626Token } from '$eth/types/erc4626';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import { isTokenErc4626 } from '$eth/utils/erc4626.utils';
import { mapEthTransactionUi } from '$eth/utils/transactions.utils';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_SOURCES,
	PLAUSIBLE_EVENT_SUBCONTEXT_EARN
} from '$lib/enums/plausible';
import type { Token } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
import type { StakingTransactionsUiWithToken } from '$lib/types/transaction-ui';
import { nonNullish } from '@dfinity/utils';

export const isTokenHarvestAutopilot = (token: Token): token is Erc4626Token =>
	isTokenErc4626(token) && HARVEST_AUTOPILOT_ADDRESSES.includes(token.address.toLowerCase());

export const getHarvestAutopilotVaultTransactions = ({
	vaultToken,
	vaultTransactions,
	assetTransactions,
	assetToken,
	ethAddress,
	ckMinterInfoAddresses
}: {
	vaultToken: TokenUi<Erc4626CustomToken>;
	assetToken?: Erc20CustomToken;
	vaultTransactions: EthCertifiedTransaction[];
	assetTransactions?: EthCertifiedTransaction[];
	ethAddress: OptionEthAddress;
	ckMinterInfoAddresses: string[];
}): StakingTransactionsUiWithToken[] => {
	const vaultTokenAddress = vaultToken.address.toLowerCase();

	let result = vaultTransactions.reduce<StakingTransactionsUiWithToken[]>((acc, tx) => {
		const { data } = tx;

		acc.push({
			...mapEthTransactionUi({ transaction: data, ethAddress, ckMinterInfoAddresses }),
			token: vaultToken
		});

		return acc;
	}, []);

	if (nonNullish(assetToken) && nonNullish(assetTransactions)) {
		result = [
			...result,
			...assetTransactions.reduce<StakingTransactionsUiWithToken[]>((acc, tx) => {
				const { data } = tx;

				if (
					data.to?.toLowerCase() === vaultTokenAddress ||
					data.from.toLowerCase() === vaultTokenAddress
				) {
					acc.push({
						...mapEthTransactionUi({ transaction: data, ethAddress, ckMinterInfoAddresses }),
						token: assetToken,
						vaultToken
					});
				}

				return acc;
			}, [])
		];
	}

	return result;
};

export const getHarvestAutopilotBaseTrackingMetadata = ({
	assetToken,
	vaultToken
}: {
	assetToken: Erc20Token;
	vaultToken: Erc4626Token;
}) => ({
	event_context: PLAUSIBLE_EVENT_CONTEXTS.EARN,
	event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_EARN.HARVEST_AUTOPILOT,
	source_location: PLAUSIBLE_EVENT_SOURCES.HARVEST_AUTOPILOT,
	source_sublocation: vaultToken.name,
	token_network: assetToken.network.name,
	token_address: assetToken.address,
	token_standard: assetToken.standard.code,
	token_symbol: assetToken.symbol,
	token_name: assetToken.name,
	token2_network: vaultToken.network.name,
	token2_address: vaultToken.address,
	token2_standard: vaultToken.standard.code,
	token2_symbol: vaultToken.symbol,
	token2_name: vaultToken.name
});
