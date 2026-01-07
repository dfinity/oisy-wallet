import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type {
	AccountId_Any,
	AccountSnapshot_Any,
	AnyNetwork,
	AnyToken,
	AccountSnapshotFor as RcAccountSnapshotFor,
	TransactionType as RcTransactionType,
	Transaction_Any
} from '$declarations/rewards/rewards.did';
import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
import { isTokenErc721 } from '$eth/utils/erc721.utils';
import { mapEthTransactionUi } from '$eth/utils/transactions.utils';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { toCkMinterInfoAddresses } from '$icp-eth/utils/cketh.utils';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import { isTokenExt } from '$icp/utils/ext.utils';
import { isTokenIcTestnet } from '$icp/utils/ic-ledger.utils';
import { registerAirdropRecipient } from '$lib/api/reward.api';
import {
	NANO_SECONDS_IN_MILLISECOND,
	NANO_SECONDS_IN_SECOND,
	ZERO
} from '$lib/constants/app.constants';
import {
	btcAddressMainnet,
	btcAddressTestnet,
	ethAddress,
	solAddressDevnet,
	solAddressMainnet
} from '$lib/derived/address.derived';
import { authIdentity } from '$lib/derived/auth.derived';
import { exchanges } from '$lib/derived/exchange.derived';
import { tokens } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { nftStore } from '$lib/stores/nft.store';
import type { Address } from '$lib/types/address';
import type { Balance } from '$lib/types/balance';
import type { Nft, NonFungibleToken } from '$lib/types/nft';
import type { Token } from '$lib/types/token';
import type { TransactionType } from '$lib/types/transaction';
import type { AnyTransactionUi } from '$lib/types/transaction-ui';
import type { Option } from '$lib/types/utils';
import {
	isNetworkIdBTCMainnet,
	isNetworkIdBTCTestnet,
	isNetworkIdBitcoin,
	isNetworkIdEthereum,
	isNetworkIdEvm,
	isNetworkIdICP,
	isNetworkIdSOLDevnet,
	isNetworkIdSOLMainnet,
	isNetworkIdSepolia,
	isNetworkIdSolana
} from '$lib/utils/network.utils';
import { findNftsByToken } from '$lib/utils/nfts.utils';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { assertNonNullish, isNullish, nonNullish, toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

type AccountSnapshotFor = Extract<RcAccountSnapshotFor, { Any: AccountSnapshot_Any }>;

// All the functions below will be using stores imperatively, since the service it is not reactive.
// It "simply" needs to take a snapshot of the current user's balances and transactions and send it to the reward canister.

interface ToSnapshotParams<T extends Token> {
	token: T;
	balance: Balance;
	exchangeRate: number;
	timestamp: bigint;
}

const LAST_TRANSACTIONS_COUNT = 5;

const filterTransactions = <T extends Transaction_Any>(transactions: (T | undefined)[]): T[] =>
	transactions.filter(nonNullish).slice(0, LAST_TRANSACTIONS_COUNT);

const toTransactionType = (type: Exclude<TransactionType, 'approve'>): RcTransactionType =>
	type === 'send' || type === 'deposit' || type === 'burn' ? { Send: null } : { Receive: null };

const toAnyTransaction = ({
	transaction: { type, value, timestamp, from, to },
	account,
	network
}: {
	transaction: AnyTransactionUi;
	account: Address;
	network: AnyNetwork;
}): Transaction_Any | undefined => {
	if (type === 'approve') {
		return;
	}

	if (isNullish(timestamp)) {
		return;
	}

	if (isNullish(from) || isNullish(to)) {
		return;
	}

	// in case it's a BTC tx, "to" is an array
	// TODO: If one day we implement sending BTC to multiple addresses, we'll need to revisit this logic.
	const counterparty: AccountId_Any = account === from ? (Array.isArray(to) ? to[0] : to) : from;

	return {
		transaction_type: toTransactionType(type),
		timestamp: BigInt(
			normalizeTimestampToSeconds(timestamp ?? ZERO) * Number(NANO_SECONDS_IN_SECOND)
		),
		amount: value ?? ZERO,
		counterparty,
		network
	};
};

const getLastTransactionsByToken = ({
	token,
	account
}: {
	token: Token;
	account: Address;
}): AnyTransactionUi[] => {
	const {
		id: tokenId,
		network: { id: networkId }
	} = token;

	const isEthOrEvm = isNetworkIdEthereum(networkId) || isNetworkIdEvm(networkId);

	if (isEthOrEvm) {
		const ckMinterInfoAddresses = toCkMinterInfoAddresses(
			get(ckEthMinterInfoStore)?.[
				isNetworkIdSepolia(networkId) ? SEPOLIA_TOKEN_ID : ETHEREUM_TOKEN_ID
			]
		);
		// If there are no minter info addresses, we cannot map the transactions. We return undefined to skip this token.
		// Since we are sending snapshots at several intervals and refreshes, it is not necessary to raise an error.
		if (isNullish(ckMinterInfoAddresses)) {
			return [];
		}

		return (get(ethTransactionsStore)?.[tokenId] ?? []).map(({ data: transaction }) =>
			mapEthTransactionUi({
				transaction,
				ckMinterInfoAddresses,
				ethAddress: account
			})
		);
	}

	return isNetworkIdBitcoin(networkId)
		? (get(btcTransactionsStore)?.[tokenId] ?? []).map(({ data: transaction }) => transaction)
		: isNetworkIdSolana(networkId)
			? (get(solTransactionsStore)?.[tokenId] ?? []).map(({ data: transaction }) => transaction)
			: isNetworkIdICP(networkId)
				? (get(icTransactionsStore)?.[tokenId] ?? []).map(({ data: transaction }) => transaction)
				: [];
};

// Currently we have not way of differentiate more details for the token (for example the standard or the ID for NFTs).
// So, for now, we simply create a custom string for the NFTs, and use the token ID description for the fungible tokens.
// TODO: Improve the data passing when the Rewards Canister expand the interface for the type `AnyToken`.
const toTokenSymbol = (token: Token): string => {
	if (isTokenErc721(token) || isTokenErc1155(token)) {
		return `nft#${token.name}#${token.address}#${token.section ?? ''}`;
	}

	if (isTokenExt(token)) {
		return `nft#${token.name}#${token.canisterId}#${token.section ?? ''}`;
	}

	const { id: tokenId } = token;

	// This does not happen, but we need it to make it type-safe
	assertNonNullish(tokenId.description);

	return tokenId.description;
};

const toAnySnapshot = ({
	token,
	balance,
	exchangeRate,
	timestamp
}: ToSnapshotParams<Token>): AccountSnapshotFor | undefined => {
	const identity = get(authIdentity);
	// This should not happen, since the service is used only after login and never after logout.
	assertNonNullish(identity);

	const {
		network: { id: networkId, env: networkEnv },
		decimals,
		groupData
	} = token;

	const account: Option<AccountId_Any> =
		isNetworkIdEthereum(networkId) || isNetworkIdEvm(networkId)
			? get(ethAddress)
			: isNetworkIdBTCTestnet(networkId)
				? get(btcAddressTestnet)
				: isNetworkIdBTCMainnet(networkId)
					? get(btcAddressMainnet)
					: isNetworkIdSOLDevnet(networkId)
						? get(solAddressDevnet)
						: isNetworkIdSOLMainnet(networkId)
							? get(solAddressMainnet)
							: isNetworkIdICP(networkId)
								? identity.getPrincipal().toString()
								: undefined;

	if (isNullish(account)) {
		return;
	}

	const isTestnet = networkEnv === 'testnet' || isTokenIcTestnet(token);

	// This does not happen, but we need it to make it type-safe
	assertNonNullish(networkId.description);

	// TODO: make the testnet_for refer to the respective mainnet network
	const network: AnyNetwork = {
		testnet_for: toNullable(isTestnet ? 'true' : undefined),
		network_id: networkId.description
	};

	const tokenAddress: AnyToken = {
		token_symbol: toTokenSymbol(token),
		wraps: toNullable(nonNullish(groupData) ? groupData.id.description : undefined)
	};

	const lastTransactions = getLastTransactionsByToken({ token, account });

	const snapshot: AccountSnapshot_Any = {
		decimals,
		approx_usd_per_token: exchangeRate,
		amount: balance,
		timestamp,
		account,
		network,
		token_address: tokenAddress,
		last_transactions: filterTransactions(
			lastTransactions.map((transaction) => toAnyTransaction({ transaction, account, network }))
		)
	};

	return { Any: snapshot };
};

// For now the Rewards Canister does not accept the NFT ID as input.
// So we create this workaround to show how many NFT we have per-collection.
// TODO: Improve the balance calculation when the Rewards Canister accepts a different input for NFTs.
const getNftBalance = ({ nfts, token }: { nfts: Nft[]; token: NonFungibleToken }): bigint =>
	BigInt(findNftsByToken({ nfts, token }).length ?? ZERO);

const takeAccountSnapshots = (timestamp: bigint): AccountSnapshotFor[] => {
	const balances = get(balancesStore);

	if (isNullish(balances)) {
		return [];
	}

	const exchangeRates = get(exchanges);

	const allTokens: Token[] = get(tokens);

	const nftStoreTokens = get(nftStore) ?? [];

	return allTokens.reduce<AccountSnapshotFor[]>((acc, token) => {
		const balance =
			isTokenErc721(token) || isTokenErc1155(token) || isTokenExt(token)
				? getNftBalance({ nfts: nftStoreTokens, token })
				: balances[token.id]?.data;

		if (isNullish(balance) || balance === ZERO) {
			return acc;
		}

		// We want to send the snapshots even for tokens that do not have an exchange rate.
		// However, the Rewards Canister does not accept a nullish value as input.
		// For now, we send them with an exchange rate of 0, even if theoretically wrong.
		// TODO: Remove the nullish check and the zero-fallback once the Rewards Canister accepts nullish values.
		const exchangeRate = exchangeRates[token.id]?.usd ?? 0;

		if (isNullish(exchangeRate)) {
			return acc;
		}

		const snapshot: AccountSnapshotFor | undefined = toAnySnapshot({
			token,
			balance,
			exchangeRate,
			timestamp
		});

		return nonNullish(snapshot) ? [...acc, snapshot] : acc;
	}, []);
};

export const registerUserSnapshot = async () => {
	const timestamp = BigInt(Date.now()) * NANO_SECONDS_IN_MILLISECOND;

	const accounts = takeAccountSnapshots(timestamp);

	if (accounts.length === 0) {
		return;
	}

	await registerAirdropRecipient({
		userSnapshot: { accounts, timestamp: toNullable(BigInt(timestamp)) },
		identity: get(authIdentity)
	});
};
