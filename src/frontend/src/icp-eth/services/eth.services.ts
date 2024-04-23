import {
	RECEIVED_ERC20_EVENT_SIGNATURE,
	RECEIVED_ETH_EVENT_SIGNATURE
} from '$eth/constants/cketh.constants';
import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { etherscanProviders } from '$eth/providers/etherscan.providers';
import { infuraCkErc20Providers } from '$eth/providers/infura-ckerc20.providers';
import { infuraCkETHProviders } from '$eth/providers/infura-cketh.providers';
import type { Erc20Token } from '$eth/types/erc20';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { mapCkEthereumPendingTransaction } from '$icp-eth/utils/cketh-transactions.utils';
import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
import type { IcCkTwinToken, IcToken } from '$icp/types/ic';
import { nullishSignOut } from '$lib/services/auth.services';
import { toastsError } from '$lib/stores/toasts.store';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import { emit } from '$lib/utils/events.utils';
import type { Identity } from '@dfinity/agent';
import { encodePrincipalToEthAddress } from '@dfinity/cketh';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

export const loadCkEthereumPendingTransactions = async ({
	twinToken,
	...rest
}: {
	toAddress: ETH_ADDRESS;
	tokenId: TokenId;
	lastObservedBlockNumber: bigint;
	identity: OptionIdentity;
} & IcCkTwinToken) => {
	const { id: twinTokenId } = twinToken;

	if (isSupportedEthTokenId(twinTokenId)) {
		await loadCkETHPendingTransactions({
			twinToken,
			...rest
		});
		return;
	}

	await loadCkErc20PendingTransactions({
		twinToken,
		...rest
	});
};

const loadCkETHPendingTransactions = async ({
	toAddress,
	twinToken,
	...rest
}: {
	toAddress: ETH_ADDRESS;
	tokenId: TokenId;
	lastObservedBlockNumber: bigint;
	identity: OptionIdentity;
} & IcCkTwinToken) => {
	const {
		network: { id: networkId }
	} = twinToken;

	const populateTransaction = async (identity: Identity): Promise<string | undefined> => {
		const { populateTransaction } = infuraCkETHProviders(networkId);
		const { data } = await populateTransaction({
			contract: { address: toAddress },
			to: encodePrincipalToEthAddress(identity.getPrincipal())
		});
		return data;
	};

	await loadPendingTransactions({
		toAddress,
		networkId,
		twinToken,
		populateTransaction,
		...rest
	});
};

const loadCkErc20PendingTransactions = async ({
	toAddress,
	twinToken,
	...rest
}: {
	toAddress: ETH_ADDRESS;
	tokenId: TokenId;
	lastObservedBlockNumber: bigint;
	identity: OptionIdentity;
} & IcCkTwinToken) => {
	const {
		network: { id: networkId },
		address
	} = twinToken as Erc20Token;

	assertNonNullish('address', 'The address of the Erc20 contract must be provided.');

	const populateTransaction = async (identity: Identity): Promise<string | undefined> => {
		const { populateTransaction } = infuraCkErc20Providers(networkId);
		const { data } = await populateTransaction({
			contract: { address: toAddress },
			erc20Contract: { address },
			to: encodePrincipalToEthAddress(identity.getPrincipal()),
			// TODO: we do not the amount here, how can we encode the data for comparison of the Erc20?
			amount: BigNumber.from(0)
		});
		return data;
	};

	await loadPendingTransactions({
		toAddress,
		networkId,
		twinToken,
		populateTransaction,
		...rest
	});
};

const loadPendingTransactions = async ({
	toAddress,
	tokenId,
	lastObservedBlockNumber,
	identity,
	networkId,
	twinToken,
	populateTransaction
}: {
	toAddress: ETH_ADDRESS;
	tokenId: TokenId;
	lastObservedBlockNumber: bigint;
	identity: OptionIdentity;
	networkId: NetworkId;
	populateTransaction: (identity: Identity) => Promise<string | undefined>;
} & IcCkTwinToken) => {
	if (isNullish(identity)) {
		await nullishSignOut();
		return;
	}

	emit({
		message: 'oisyCkEthereumPendingTransactions',
		detail: 'in_progress'
	});

	try {
		// TODO
		const { getLogs } = infuraCkETHProviders(networkId);
		console.log(
			'Logs ----------------------------------->',
			await getLogs({
				contract: { address: toAddress },
				startBlock: Number(lastObservedBlockNumber),
				topics: [
					isSupportedEthTokenId(twinToken.id)
						? RECEIVED_ETH_EVENT_SIGNATURE
						: RECEIVED_ERC20_EVENT_SIGNATURE,
					null,
					...(isSupportedEthTokenId(twinToken.id) ? [] : [null]),
					encodePrincipalToEthAddress(identity.getPrincipal())
				]
			})
		);

		const { transactions: transactionsProviders } = etherscanProviders(networkId);
		const transactions = await transactionsProviders({
			address: toAddress,
			startBlock: `${lastObservedBlockNumber}`
		});

		// We compute the data for a deposit to the related helper contract using the user's principal.
		// This allows us to use the data to compare with the contract's pending transactions and filter those targeting this user.
		const data = await populateTransaction(identity);

		const pendingTransactions = transactions.filter(({ data: txData }) => txData === data);

		// There are no pending ETH -> ckETH, respectively Erc20 -> ckErc20, transactions, therefore we reset the store.
		// This can be useful if there was a previous pending transactions displayed and the transaction has now been processed.
		if (pendingTransactions.length === 0) {
			icPendingTransactionsStore.reset(tokenId);
			return;
		}

		icPendingTransactionsStore.set({
			tokenId,
			data: pendingTransactions.map((transaction) => ({
				data: mapCkEthereumPendingTransaction({ transaction, twinToken }),
				certified: false
			}))
		});
	} catch (err: unknown) {
		toastsError({
			msg: { text: 'Something went wrong while fetching the pending Ethereum transactions.' },
			err
		});
	} finally {
		emit({
			message: 'oisyCkEthereumPendingTransactions',
			detail: 'idle'
		});
	}
};

export const loadPendingCkEthereumTransaction = async ({
	hash,
	token: { id: tokenId },
	twinToken,
	networkId
}: {
	hash: string;
	token: IcToken;
	networkId: NetworkId;
} & IcCkTwinToken) => {
	try {
		const { getTransaction } = alchemyProviders(networkId);
		const transaction = await getTransaction(hash);

		if (isNullish(transaction)) {
			toastsError({
				msg: {
					text: `Failed to get the transaction from the provided (hash: ${hash}). Please reload the wallet dapp.`
				}
			});
			return;
		}

		icPendingTransactionsStore.prepend({
			tokenId,
			transaction: {
				data: mapCkEthereumPendingTransaction({
					transaction,
					twinToken
				}),
				certified: false
			}
		});
	} catch (err: unknown) {
		toastsError({
			msg: { text: 'Something went wrong while loading the pending ETH <> ckETH transaction.' },
			err
		});
	}
};
