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
import { authIdentity } from '$lib/derived/auth.derived';
import { exchanges } from '$lib/derived/exchange.derived';
import { tokens } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { Token } from '$lib/types/token';
import { isNetworkIdSOLMainnet } from '$lib/utils/network.utils';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import type { SplToken } from '$sol/types/spl';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { Principal } from '@dfinity/principal';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { get } from 'svelte/store';

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
	const { id, ledgerCanisterId } = token;

	const lastTransactions = (get(icTransactionsStore)?.[id] ?? []).map(
		({ data: transaction }) => transaction
	);

	const snapshot: AccountSnapshot_Icrc = {
		...toBaseSnapshot({ token, balance, exchangeRate, timestamp }),
		account: Principal.from(ledgerCanisterId),
		last_transactions: lastTransactions.map(toIcrcTransaction)
	};

	return { Icrc: snapshot };
};

const toSplSnapshot = ({
	token,
	balance,
	exchangeRate,
	timestamp
}: ToSnapshotParams<SplToken>): AccountSnapshotFor => {
	const {
		id,
		address,
		network: { id: networkId }
	} = token;

	const lastTransactions = (get(solTransactionsStore)?.[id] ?? []).map(
		({ data: transaction }) => transaction
	);

	const snapshot: AccountSnapshot_Spl = {
		...toBaseSnapshot({ token, balance, exchangeRate, timestamp }),
		account: address,
		last_transactions: lastTransactions.map(toSplTransaction)
	};

	return isNetworkIdSOLMainnet(networkId) ? { SplMainnet: snapshot } : { SplDevnet: snapshot };
};

const takeUserSnapshot = (): AccountSnapshotFor[] => {
	const balances = get(balancesStore);

	if (isNullish(balances)) {
		return [];
	}

	const exchangeRates = get(exchanges);

	const allTokens: Token[] = get(tokens);

	const now = Date.now();

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
			? toIcrcSnapshot({ token, balance, exchangeRate, timestamp: now })
			: isTokenSpl(token)
				? toSplSnapshot({ token, balance, exchangeRate, timestamp: now })
				: undefined;

		return nonNullish(snapshot) ? [...acc, snapshot] : acc;
	}, []);
};

export const registerUserSnapshot = async () => {
	const accounts = takeUserSnapshot();

	if (accounts.length === 0) {
		return;
	}

	await registerAirdropRecipient({
		userSnapshot: { accounts },
		identity: get(authIdentity)
	});
};
