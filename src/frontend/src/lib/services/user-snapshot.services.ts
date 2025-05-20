import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { BtcTransactionUi } from '$btc/types/btc';
import type {
	AccountId_Any,
	AccountSnapshotFor,
	AccountSnapshot_Any,
	AccountSnapshot_Icrc,
	AccountSnapshot_Spl,
	AnyNetwork,
	AnyToken,
	TransactionType as RcTransactionType,
	Transaction_Any,
	Transaction_Icrc,
	Transaction_Spl
} from '$declarations/rewards/rewards.did';
import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import { mapEthTransactionUi } from '$eth/utils/transactions.utils';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { toCkMinterInfoAddresses } from '$icp-eth/utils/cketh.utils';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import { isTokenIcrcTestnet } from '$icp/utils/icrc-ledger.utils';
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
import type { Address, SolAddress } from '$lib/types/address';
import type { Balance } from '$lib/types/balance';
import type { Token } from '$lib/types/token';
import type { AnyTransactionUi, TransactionType } from '$lib/types/transaction';
import type { Option } from '$lib/types/utils';
import {
	isNetworkIdBTCMainnet,
	isNetworkIdBTCRegtest,
	isNetworkIdBTCTestnet,
	isNetworkIdBitcoin,
	isNetworkIdEthereum,
	isNetworkIdEvm,
	isNetworkIdICP,
	isNetworkIdSOLDevnet,
	isNetworkIdSOLLocal,
	isNetworkIdSOLMainnet,
	isNetworkIdSOLTestnet,
	isNetworkIdSepolia,
	isNetworkIdSolana
} from '$lib/utils/network.utils';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import type { SplToken } from '$sol/types/spl';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish, nonNullish, toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

// All the functions below will be using stores imperatively, since the service it is not reactive.
// It "simply" needs to take a snapshot of the current user's balances and transactions and send it to the reward canister.

interface ToSnapshotParams<T extends Token> {
	token: T;
	balance: Balance;
	exchangeRate: number;
	timestamp: bigint;
}

const LAST_TRANSACTIONS_COUNT = 5;

const filterTransactions = <T extends Transaction_Icrc | Transaction_Spl | Transaction_Any>(
	transactions: (T | undefined)[]
): T[] => transactions.filter(nonNullish).slice(0, LAST_TRANSACTIONS_COUNT);

const toTransactionType = (type: Exclude<TransactionType, 'approve'>): RcTransactionType =>
	type === 'send' || type === 'deposit' || type === 'burn' ? { Send: null } : { Receive: null };

const toBaseTransaction = ({
	type,
	value,
	timestamp
}: { type: Exclude<TransactionType, 'approve'> } & Pick<
	IcTransactionUi | SolTransactionUi,
	'value' | 'timestamp'
>): Omit<Transaction_Icrc | Transaction_Spl, 'counterparty'> => ({
	transaction_type: toTransactionType(type),
	timestamp: (timestamp ?? ZERO) * NANO_SECONDS_IN_SECOND,
	amount: value ?? ZERO,
	network: {}
});

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

const toIcrcTransaction = ({
	transaction: { type, value, timestamp }
}: {
	transaction: IcTransactionUi;
}): Transaction_Icrc | undefined => {
	if (type === 'approve') {
		return undefined;
	}

	return {
		...toBaseTransaction({ type, value, timestamp }),
		timestamp: timestamp ?? ZERO,
		// TODO: use correct value when the Rewards canister is updated to accept account identifiers
		counterparty: Principal.anonymous()
	};
};

const toSplTransaction = ({
	transaction: { type, value, timestamp, from, to },
	address
}: {
	// TODO: this is a temporary hack to release v1. Adjust as soon as the rewards canister has more tokens.
	transaction: BtcTransactionUi | EthTransactionUi | SolTransactionUi;
	address: SolAddress;
}): Transaction_Spl | undefined => {
	// TODO: this is a temporary hack to release v1. Adjust as soon as the rewards canister has more tokens.
	if (isNullish(from) || isNullish(to)) {
		return undefined;
	}

	return {
		// TODO: this is a temporary hack to release v1. Adjust as soon as the rewards canister has more tokens.
		...toBaseTransaction({
			type: type === 'deposit' ? 'send' : type === 'withdraw' ? 'receive' : type,
			value: BigInt(value ?? ZERO),
			timestamp: BigInt(timestamp ?? ZERO)
		}),
		// in case it's a BTC tx, "to" is an array
		counterparty: address === from ? (Array.isArray(to) ? to[0] : to) : from
	};
};

const toBaseSnapshot = ({
	token: { decimals },
	balance,
	exchangeRate,
	timestamp
}: ToSnapshotParams<Token>): Omit<
	AccountSnapshot_Icrc | AccountSnapshot_Spl,
	'account' | 'token_address' | 'last_transactions'
> => ({
	decimals,
	approx_usd_per_token: exchangeRate,
	amount: balance,
	timestamp,
	network: {}
});

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

		return (get(ethTransactionsStore)?.[tokenId] ?? []).map((transaction) =>
			mapEthTransactionUi({
				transaction,
				ckMinterInfoAddresses,
				$ethAddress: account
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

const toAnySnapshot = ({
	token,
	balance,
	exchangeRate,
	timestamp
}: ToSnapshotParams<Token>): { Any: AccountSnapshot_Any } | undefined => {
	const identity = get(authIdentity);
	// This should not happen, since the service is used only after login and never after logout.
	assertNonNullish(identity);

	const {
		id: tokenId,
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

	const isTestnet = networkEnv === 'testnet' || isTokenIcrcTestnet(token);

	// This does not happen, but we need it to make it type-safe
	assertNonNullish(networkId.description);

	// TODO: make the testnet_for refer to the respective mainnet network
	const network: AnyNetwork = {
		testnet_for: toNullable(isTestnet ? 'true' : undefined),
		network_id: networkId.description
	};

	// This does not happen, but we need it to make it type-safe
	assertNonNullish(tokenId.description);

	const tokenAddress: AnyToken = {
		token_symbol: tokenId.description,
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Remove this function when we use toAnySnapshot. We did not do it already to facilitate the review
const toIcrcSnapshot = ({
	token,
	balance,
	exchangeRate,
	timestamp
}: ToSnapshotParams<IcToken>): AccountSnapshotFor | undefined => {
	// We ignore the ICRC testnet tokens.
	if (isTokenIcrcTestnet(token)) {
		return;
	}

	const { id, ledgerCanisterId } = token;

	const identity = get(authIdentity);
	// This should not happen, since the service is used only after login and never after logout.
	assertNonNullish(identity);

	const address = identity.getPrincipal();

	const lastTransactions = (get(icTransactionsStore)?.[id] ?? []).map(
		({ data: transaction }) => transaction
	);

	const snapshot: AccountSnapshot_Icrc = {
		...toBaseSnapshot({ token, balance, exchangeRate, timestamp }),
		account: address,
		token_address: Principal.from(ledgerCanisterId),
		last_transactions: filterTransactions(
			lastTransactions.map((transaction) => toIcrcTransaction({ transaction }))
		)
	};

	return { Icrc: snapshot };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Remove this function when we use toAnySnapshot. We did not do it already to facilitate the review
const toSplSnapshot = ({
	token,
	balance,
	exchangeRate,
	timestamp
}: ToSnapshotParams<SplToken>): AccountSnapshotFor | undefined => {
	const {
		id,
		address: tokenAddress,
		network: { id: networkId }
	} = token;

	// We ignore the local networks.
	// TODO: this is a temporary hack to release v1. Adjust as soon as the rewards canister has more tokens.
	if (isNetworkIdBTCRegtest(networkId) || isNetworkIdSOLLocal(networkId)) {
		return;
	}

	// TODO: this is a temporary hack to release v1. Adjust as soon as the rewards canister has more tokens.
	const address =
		isNetworkIdEthereum(networkId) || isNetworkIdSepolia(networkId)
			? get(ethAddress)
			: isNetworkIdBTCTestnet(networkId)
				? get(btcAddressTestnet)
				: isNetworkIdBTCMainnet(networkId)
					? get(btcAddressMainnet)
					: isNetworkIdSOLDevnet(networkId)
						? get(solAddressDevnet)
						: get(solAddressMainnet);

	// This may happen if the user has not loaded the testnets yet, so the address is not available.
	if (isNullish(address)) {
		return;
	}

	// TODO: this is a temporary hack to release v1. Adjust as soon as the rewards canister has more tokens.
	const ckEthMinterInfoAddressesMainnet = toCkMinterInfoAddresses(
		get(ckEthMinterInfoStore)?.[ETHEREUM_TOKEN_ID]
	);
	// If there are no minter info addresses, we cannot map the transactions. We return undefined to skip this token.
	// Since we are sending snapshots at several intervals and refreshes, it is not necessary to raise an error.
	if (isNullish(ckEthMinterInfoAddressesMainnet)) {
		return;
	}
	const ckEthMinterInfoAddressesSepolia = toCkMinterInfoAddresses(
		get(ckEthMinterInfoStore)?.[SEPOLIA_TOKEN_ID]
	);
	// If there are no minter info addresses, we cannot map the transactions. We return undefined to skip this token.
	// Since we are sending snapshots at several intervals and refreshes, it is not necessary to raise an error.
	if (isNullish(ckEthMinterInfoAddressesSepolia)) {
		return;
	}
	const lastTransactions =
		isNetworkIdEthereum(networkId) || isNetworkIdSepolia(networkId)
			? (get(ethTransactionsStore)?.[id] ?? []).map((transaction) =>
					mapEthTransactionUi({
						transaction,
						ckMinterInfoAddresses: isNetworkIdSepolia(networkId)
							? ckEthMinterInfoAddressesSepolia
							: ckEthMinterInfoAddressesMainnet,
						$ethAddress: address
					})
				)
			: isNetworkIdBTCMainnet(networkId) || isNetworkIdBTCTestnet(networkId)
				? (get(btcTransactionsStore)?.[id] ?? []).map(({ data: transaction }) => transaction)
				: (get(solTransactionsStore)?.[id] ?? []).map(({ data: transaction }) => transaction);

	const snapshot: AccountSnapshot_Spl = {
		...toBaseSnapshot({ token, balance, exchangeRate, timestamp }),
		account: address,
		token_address: tokenAddress,
		last_transactions: filterTransactions(
			lastTransactions.map((transaction) => toSplTransaction({ transaction, address }))
		)
	};

	// TODO: this is a temporary hack to release v1. Adjust as soon as the rewards canister has more tokens.
	const isTestnet =
		isNetworkIdBTCTestnet(networkId) ||
		isNetworkIdSepolia(networkId) ||
		isNetworkIdSOLDevnet(networkId) ||
		isNetworkIdSOLTestnet(networkId);

	return isTestnet ? { SplDevnet: snapshot } : { SplMainnet: snapshot };
};

const takeAccountSnapshots = (timestamp: bigint): AccountSnapshotFor[] => {
	const balances = get(balancesStore);

	if (isNullish(balances)) {
		return [];
	}

	const exchangeRates = get(exchanges);

	const allTokens: Token[] = get(tokens);

	return allTokens.reduce<AccountSnapshotFor[]>((acc, token) => {
		const balance = balances[token.id]?.data;

		if (isNullish(balance) || balance === ZERO) {
			return acc;
		}

		const exchangeRate = exchangeRates[token.id]?.usd;

		if (isNullish(exchangeRate)) {
			return acc;
		}

		const snapshot: { Any: AccountSnapshot_Any } | undefined = toAnySnapshot({
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
