import type {
	AccountSnapshot_Icrc,
	AccountSnapshot_Spl,
	AccountSnapshotFor,
	Transaction_Icrc,
	Transaction_Spl,
	TransactionType
} from '$declarations/rewards/rewards.did';
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
import type { Token } from '$lib/types/token';
import { isNetworkIdSOLDevnet } from '$lib/utils/network.utils';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import type { SplToken } from '$sol/types/spl';
import { isTokenSpl } from '$sol/utils/spl.utils';
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

const toIcrcTransaction = ({ type, value, timestamp }: IcTransactionUi): Transaction_Icrc => {
	return {
		...toBaseTransaction({ type, value, timestamp }),
		// TODO: check what this is
		counterparty: ''
	};
};

const toSplTransaction = ({ type, value, timestamp }: SolTransactionUi): Transaction_Spl => {
	return {
		...toBaseTransaction({ type, value, timestamp }),
		// TODO: check what this is
		counterparty: ''
	};
};

const toBaseSnapshot = ({
	token: { decimals },
	balance,
	exchangeRate,
	timestamp
}: ToSnapshotParams<Token>): Omit<
	AccountSnapshot_Icrc | AccountSnapshot_Spl,
	'account' | 'last_transactions'
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
	const { id } = token;

	const identity = get(authIdentity);
	// This should not happen, since the service is used only after login and never after logout.
	assertNonNullish(identity);

	const lastTransactions = (get(icTransactionsStore)?.[id] ?? []).map(
		({ data: transaction }) => transaction
	);

	const snapshot: AccountSnapshot_Icrc = {
		...toBaseSnapshot({ token, balance, exchangeRate, timestamp }),
		account: identity.getPrincipal(),
		last_transactions: lastTransactions.map(toIcrcTransaction)
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
		network: { id: networkId }
	} = token;

	const address = isNetworkIdSOLDevnet(networkId) ? get(solAddressDevnet) : get(solAddressMainnet);

	// This may happen if the user has not loaded the testnets yet, so the address is not available.
	if (isNullish(address)) {
		return;
	}

	const lastTransactions = (get(solTransactionsStore)?.[id] ?? []).map(
		({ data: transaction }) => transaction
	);

	const snapshot: AccountSnapshot_Spl = {
		...toBaseSnapshot({ token, balance, exchangeRate, timestamp }),
		account: address,
		last_transactions: lastTransactions.map(toSplTransaction)
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
