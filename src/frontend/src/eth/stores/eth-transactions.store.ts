import type { CertifiedStoreData } from '$lib/stores/certified.store';
import {
	initTransactionsStore,
	type CertifiedTransaction,
	type TransactionsData
} from '$lib/stores/transactions.store';
import type { Transaction } from '$lib/types/transaction';
import type { TransactionsData, TransactionsStore } from '$lib/stores/transactions.store';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import { nonNullish } from '@dfinity/utils';
import { writable } from 'svelte/store';

export type EthCertifiedTransaction = CertifiedTransaction<Transaction>;

export type EthTransactionsData = TransactionsData<Transaction>;

export type EthCertifiedTransactionsData = CertifiedStoreData<EthTransactionsData>;

export const ethTransactionsStore = initTransactionsStore<Transaction>();
