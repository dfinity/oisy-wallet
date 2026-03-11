import { HARVEST_AUTOPILOT_ADDRESSES } from '$eth/constants/harvest-autopilots.constants';
import type {
	EthCertifiedTransaction,
	EthCertifiedTransactionsData
} from '$eth/stores/eth-transactions.store';
import type { OptionEthAddress } from '$eth/types/address';
import type { Erc4626Token } from '$eth/types/erc4626';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import { isTokenErc4626 } from '$eth/utils/erc4626.utils';
import { mapEthTransactionUi } from '$eth/utils/transactions.utils';
import type { Token } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
import type { StakingTransactionsUiWithToken } from '$lib/types/transaction-ui';
import type { Vault } from '$lib/types/vaults';
import { isNullish, nonNullish } from '@dfinity/utils';

export const isTokenHarvestAutopilot = (token: Token): token is Erc4626Token =>
	isTokenErc4626(token) && HARVEST_AUTOPILOT_ADDRESSES.includes(token.address.toLowerCase());

const mapHarvestAutopilotTransaction = ({
	token,
	transactions,
	ethAddress,
	ckMinterInfoAddresses
}: {
	token: TokenUi<Erc4626CustomToken>;
	transactions: EthCertifiedTransaction[];
	ethAddress: OptionEthAddress;
	ckMinterInfoAddresses: string[];
}): StakingTransactionsUiWithToken[] =>
	transactions.reduce<StakingTransactionsUiWithToken[]>((acc, tx) => {
		const { data } = tx;

		acc.push({
			...mapEthTransactionUi({ transaction: data, ethAddress, ckMinterInfoAddresses }),
			token
		});

		return acc;
	}, []);

export const getHarvestAutopilotVaultTransactions = ({
	vault,
	ethTransactionsStore,
	ethAddress,
	ckMinterInfoAddresses
}: {
	vault?: Vault;
	ethTransactionsStore: EthCertifiedTransactionsData;
	ethAddress: OptionEthAddress;
	ckMinterInfoAddresses: string[];
}): StakingTransactionsUiWithToken[] => {
	if (isNullish(vault) || isNullish(ethTransactionsStore?.[vault.token.id])) {
		return [];
	}

	return nonNullish(vault)
		? mapHarvestAutopilotTransaction({
				transactions: ethTransactionsStore[vault.token.id] as EthCertifiedTransaction[],
				token: vault.token,
				ethAddress,
				ckMinterInfoAddresses
			})
		: [];
};
