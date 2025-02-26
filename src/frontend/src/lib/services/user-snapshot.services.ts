import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { BtcTransactionUi } from '$btc/types/btc';
import type {
	AccountSnapshot_Icrc,
	AccountSnapshot_Spl,
	AccountSnapshotFor,
	Transaction_Icrc,
	Transaction_Spl,
	TransactionType
} from '$declarations/rewards/rewards.did';
import { USER_SNAPSHOT_ENABLED } from '$env/airdrop-campaigns.env';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.env';
import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import { mapEthTransactionUi } from '$eth/utils/transactions.utils';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { toCkMinterInfoAddresses } from '$icp-eth/utils/cketh.utils';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTransactionType, IcTransactionUi } from '$icp/types/ic-transaction';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { registerAirdropRecipient } from '$lib/api/reward.api';
import { NANO_SECONDS_IN_MILLISECOND, NANO_SECONDS_IN_SECOND } from '$lib/constants/app.constants';
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
import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import {
	isNetworkIdBTCMainnet,
	isNetworkIdBTCTestnet,
	isNetworkIdEthereum,
	isNetworkIdSepolia,
	isNetworkIdSOLDevnet
} from '$lib/utils/network.utils';
import { SYSTEM_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import type { SplToken } from '$sol/types/spl';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish, nonNullish, toNullable } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { get } from 'svelte/store';

// All the functions below will be using stores imperatively, since the service it is not reactive.
// It "simply" needs to take a snapshot of the current user's balances and transactions and send it to the reward canister.

interface ToSnapshotParams<T extends Token> {
	token: T;
	balance: BigNumber;
	exchangeRate: number;
	timestamp: bigint;
}

const LAST_TRANSACTIONS_COUNT = 5;

const filterTransactions = <T extends Transaction_Icrc | Transaction_Spl>(
	transactions: (T | undefined)[]
): T[] => transactions.filter(nonNullish).slice(0, LAST_TRANSACTIONS_COUNT);

const toTransactionType = (type: IcTransactionType): TransactionType =>
	type === 'send' ? { Send: null } : { Receive: null };

const toBaseTransaction = ({
	type,
	value,
	timestamp
}: Pick<IcTransactionUi | SolTransactionUi, 'type' | 'value' | 'timestamp'>): Omit<
	Transaction_Icrc | Transaction_Spl,
	'counterparty'
> => ({
	transaction_type: toTransactionType(type),
	timestamp: (timestamp ?? 0n) * NANO_SECONDS_IN_SECOND,
	amount: value ?? 0n,
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
		timestamp: timestamp ?? 0n,
		// TODO: use correct value when the Rewards canister is updated to accept account identifiers
		counterparty: Principal.anonymous()
	};
};

const toSplTransaction = ({
	transaction: { type, value, timestamp, from, to, ...rest },
	address,
	networkId
}: {
	// TODO: this is a temporary hack to release v1. Adjust as soon as the rewards canister has more tokens.
	transaction: BtcTransactionUi | EthTransactionUi | SolTransactionUi;
	address: SolAddress;
	networkId: NetworkId;
}): Transaction_Spl | undefined => {
	// TODO: this is a temporary hack to release v1. Adjust as soon as the rewards canister has more tokens.
	if (isNullish(from) || isNullish(to)) {
		return undefined;
	}
	if ((isNullish(type) && !('uiType' in rest)) || typeof type === 'number') {
		return undefined;
	}

	const transactionType =
		(isNetworkIdEthereum(networkId) || isNetworkIdSepolia(networkId)) && 'uiType' in rest
			? rest.uiType
			: nonNullish(type)
				? type
				: 'send';

	return {
		// TODO: this is a temporary hack to release v1. Adjust as soon as the rewards canister has more tokens.
		...toBaseTransaction({
			type:
				transactionType === 'withdraw'
					? 'send'
					: transactionType === 'deposit'
						? 'receive'
						: transactionType,
			value: BigNumber.from(value ?? 0n).toBigInt(),
			timestamp: BigInt(timestamp ?? 0n)
		}),
		counterparty: address === from ? to : from
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
	amount: balance.toBigInt(),
	timestamp,
	network: {}
});

const toIcrcSnapshot = ({
	token,
	balance,
	exchangeRate,
	timestamp
}: ToSnapshotParams<IcToken>): AccountSnapshotFor => {
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
	const ckEthMinterInfoAddressesMainnet = toCkMinterInfoAddresses({
		minterInfo: get(ckEthMinterInfoStore)?.[ETHEREUM_TOKEN_ID],
		networkId: ETHEREUM_NETWORK_ID
	});
	const ckEthMinterInfoAddressesSepolia = toCkMinterInfoAddresses({
		minterInfo: get(ckEthMinterInfoStore)?.[SEPOLIA_TOKEN_ID],
		networkId: SEPOLIA_NETWORK_ID
	});
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
			lastTransactions.map((transaction) => toSplTransaction({ transaction, address, networkId }))
		)
	};

	return isNetworkIdSOLDevnet(networkId) ? { SplDevnet: snapshot } : { SplMainnet: snapshot };
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

		if (isNullish(balance) || balance.isZero()) {
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
