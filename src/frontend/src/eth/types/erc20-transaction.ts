export type Erc20TransactionAddressFrom = string;
export type Erc20TransactionAddressTo = string;
export type Erc20TransactionValue = bigint;

export type Erc20TransactionArgs = [
	Erc20TransactionAddressFrom,
	Erc20TransactionAddressTo,
	Erc20TransactionValue
];

export interface Erc20Transaction {
	address: string;
	args: Erc20TransactionArgs;
	blockHash: string;
	blockNumber: number;
	data: string;
	event: 'Transfer' | 'Approve';
	eventSignature: string;
	logIndex: number;
	removed: boolean;
	topics: string[];
	transactionHash: string;
	transactionIndex: number;
}
