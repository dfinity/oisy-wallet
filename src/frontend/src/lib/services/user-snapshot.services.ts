import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { BtcTransactionUi } from '$btc/types/btc';
import type {
	AccountSnapshotFor,
	AccountSnapshot_Icrc,
	AccountSnapshot_Spl,
	TransactionType as RcTransactionType,
	Transaction_Icrc,
	Transaction_Spl
} from '$declarations/rewards/rewards.did';
import { USER_SNAPSHOT_ENABLED } from '$env/reward-campaigns.env';
import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import { mapEthTransactionUi } from '$eth/utils/transactions.utils';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { toCkMinterInfoAddresses } from '$icp-eth/utils/cketh.utils';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { isTokenIcrcTestnet } from '$icp/utils/icrc-ledger.utils';
import { isIcToken } from '$icp/validation/ic-token.validation';
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
import type { SolAddress } from '$lib/types/address';
import type { Balance } from '$lib/types/balance';
import type { Token } from '$lib/types/token';
import type { TransactionType } from '$lib/types/transaction';
import {
	isNetworkIdBTCMainnet,
	isNetworkIdBTCRegtest,
	isNetworkIdBTCTestnet,
	isNetworkIdEthereum,
	isNetworkIdSOLDevnet,
	isNetworkIdSOLLocal,
	isNetworkIdSOLTestnet,
	isNetworkIdSepolia
} from '$lib/utils/network.utils';
import { SYSTEM_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import type { SplToken } from '$sol/types/spl';
import { isTokenSpl } from '$sol/utils/spl.utils';
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

const filterTransactions = <T extends Transaction_Icrc | Transaction_Spl>(
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

		const snapshot: AccountSnapshotFor | undefined = isIcToken(token)
			? toIcrcSnapshot({ token, balance, exchangeRate, timestamp })
			: isTokenSpl(token)
				? toSplSnapshot({ token, balance, exchangeRate, timestamp })
				: // TODO: adjust the logic when the rewards canister accepts native tokens too.
					token.id === SOLANA_TOKEN_ID
					? toSplSnapshot({
							token: {
								...token,
								address: 'So11111111111111111111111111111111111111111',
								owner: SYSTEM_PROGRAM_ADDRESS
							},
							balance,
							exchangeRate,
							timestamp
						})
					: // TODO: this is a temporary hack to release v1. Adjust as soon as the rewards canister has more tokens.
						isNetworkIdEthereum(token.network.id) ||
						  isNetworkIdSepolia(token.network.id) ||
						  isNetworkIdBTCMainnet(token.network.id) ||
						  isNetworkIdBTCTestnet(token.network.id)
						? toSplSnapshot({
								token: {
									...token,
									address: token.symbol.padStart(
										'So11111111111111111111111111111111111111111'.length,
										'0'
									),
									owner: SYSTEM_PROGRAM_ADDRESS
								},
								balance,
								exchangeRate,
								timestamp
							})
						: undefined;

		return nonNullish(snapshot) ? [...acc, snapshot] : acc;
	}, []);
};

export const registerUserSnapshot = async () => {
	if (!USER_SNAPSHOT_ENABLED) {
		return;
	}

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
