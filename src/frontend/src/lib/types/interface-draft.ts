import type { Transaction as EthTransactionType, TransactionType } from '$lib/types/transaction';
import type { Transaction as SolanaTransactionType } from '@solana/web3.js';
import type { IcTransaction } from '$icp/types/ic-transaction';
import type { BtcTransactionType } from '$btc/types/btc-transaction';


interface Transaction {
	// I see two possibilities:
	// 1. Define our own definition of a transaction
	// this would mean that implementations need to have a mapping function
	// this could be a problem because not all chains deliver the same fields/information?
	// 2. Make a ts-type which is an "OR" between all implemented Transaction types. see example below
	// this would mean each implementation needs to be added
	// consumer need to cast accordingly to get the correct type
}

type ExampleJoinedTransaction = SolanaTransactionType | IcTransaction | EthTransactionType | BtcTransactionType;


//TODO find a proper name
export interface WIPInterface {

	getAddress: (principal: string) => string;

	getBalance: (address: string) => number;

	//TBD maybe getTransaction() to receive more information about txn

	getTransactions: (address:string) => Transaction[];

	send: (from: string, to: string, amount: number) => Transaction;

	getFee: (transactionType: TransactionType) => number;

	//return type tbd
	sign: (transaction: Transaction, principal: string) => unknown;

}