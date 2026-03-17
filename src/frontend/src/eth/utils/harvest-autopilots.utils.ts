import { HARVEST_AUTOPILOT_ADDRESSES } from '$eth/constants/harvest-autopilots.constants';
import type { EthCertifiedTransaction } from '$eth/stores/eth-transactions.store';
import type { OptionEthAddress } from '$eth/types/address';
import type { Erc20CustomToken } from '$eth/types/erc20-custom-token';
import type { Erc4626Token } from '$eth/types/erc4626';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import { isTokenErc4626 } from '$eth/utils/erc4626.utils';
import { mapEthTransactionUi } from '$eth/utils/transactions.utils';
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
