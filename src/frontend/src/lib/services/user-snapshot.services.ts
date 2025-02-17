import type {
	AccountSnapshot_Icrc,
	AccountSnapshot_Spl,
	AccountSnapshotFor,
	Transaction_Icrc,
	Transaction_Spl,
	TransactionType
} from '$declarations/rewards/rewards.did';
import { USER_SNAPSHOT_ENABLED } from '$env/airdrop-campaigns.env';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTransactionType, IcTransactionUi } from '$icp/types/ic-transaction';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { registerAirdropRecipient } from '$lib/api/reward.api';
import { solAddressDevnet, solAddressMainnet } from '$lib/derived/address.derived';
import { authIdentity } from '$lib/derived/auth.derived';
import { exchanges } from '$lib/derived/exchange.derived';
import { tokens } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { SolAddress } from '$lib/types/address';
import type { Token } from '$lib/types/token';
import { isNetworkIdSOLDevnet } from '$lib/utils/network.utils';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import type { SplToken } from '$sol/types/spl';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish, nonNullish, toNullable } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { get } from 'svelte/store';

// All the functions below will be using stores imperatively, since the service it is not reactive.
// It "simply" needs to take a snapshot of the current user's balances and transactions and send it to the reward canister.

interface ToSnapshotParams<T extends Token> {
	token: T;
	balance: BigNumber;
	exchangeRate: number;
	timestamp: number;
}

const LAST_TRANSACTIONS_COUNT = 5;

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
	timestamp: timestamp ?? 0n,
	amount: value ?? 0n,
	network: {}
});

const toIcrcTransaction = ({
	transaction: { type, value, timestamp, from, to },
	address
}: {
	transaction: IcTransactionUi;
	address: Principal;
}): Transaction_Icrc => {
	// This does not happen, but we need it to be type-safe.
	assertNonNullish(from);
	assertNonNullish(to);

	return {
		...toBaseTransaction({ type, value, timestamp }),
		counterparty: Principal.fromText(address.toText() === from ? to : from)
	};
};

const toSplTransaction = ({
	transaction: { type, value, timestamp, from, to },
	address
}: {
	transaction: SolTransactionUi;
	address: SolAddress;
}): Transaction_Spl => {
	// This does not happen, but we need it to be type-safe.
	assertNonNullish(from);
	assertNonNullish(to);

	return {
		...toBaseTransaction({ type, value, timestamp }),
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
	timestamp: BigInt(timestamp),
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

	const lastTransactions = (get(icTransactionsStore)?.[id] ?? [])
		.map(({ data: transaction }) => transaction)
		.slice(0, LAST_TRANSACTIONS_COUNT);

	const snapshot: AccountSnapshot_Icrc = {
		...toBaseSnapshot({ token, balance, exchangeRate, timestamp }),
		account: address,
		token_address: Principal.from(ledgerCanisterId),
		last_transactions: lastTransactions.map((transaction) =>
			toIcrcTransaction({ transaction, address })
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

	const address = isNetworkIdSOLDevnet(networkId) ? get(solAddressDevnet) : get(solAddressMainnet);

	// This may happen if the user has not loaded the testnets yet, so the address is not available.
	if (isNullish(address)) {
		return;
	}

	const lastTransactions = (get(solTransactionsStore)?.[id] ?? [])
		.map(({ data: transaction }) => transaction)
		.slice(0, LAST_TRANSACTIONS_COUNT);

	const snapshot: AccountSnapshot_Spl = {
		...toBaseSnapshot({ token, balance, exchangeRate, timestamp }),
		account: address,
		token_address: tokenAddress,
		last_transactions: lastTransactions.map((transaction) =>
			toSplTransaction({ transaction, address })
		)
	};

	return isNetworkIdSOLDevnet(networkId) ? { SplDevnet: snapshot } : { SplMainnet: snapshot };
};

const takeAccountSnapshots = (timestamp: number): AccountSnapshotFor[] => {
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
				: undefined;

		return nonNullish(snapshot) ? [...acc, snapshot] : acc;
	}, []);
};

export const registerUserSnapshot = async () => {
	if (!USER_SNAPSHOT_ENABLED) {
		return;
	}

	const timestamp = Date.now();

	const accounts = takeAccountSnapshots(timestamp);

	if (accounts.length === 0) {
		return;
	}

	await registerAirdropRecipient({
		userSnapshot: { accounts, timestamp: toNullable(BigInt(timestamp)) },
		identity: get(authIdentity)
	});
};
