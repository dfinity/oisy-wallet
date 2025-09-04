import { CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS } from '$btc/constants/btc.constants';
import type { BtcTransactionUi } from '$btc/types/btc';
import type { BtcAddress } from '$lib/types/address';
import type { BlockstreamTransaction } from '$lib/types/blockstream';
import { nonNullish } from '@dfinity/utils';

export const mapBtcTransaction = ({
	transaction: { vin, vout, txid, status, fee },
	btcAddress,
	latestBitcoinBlockHeight
}: {
	transaction: BlockstreamTransaction;
	btcAddress: BtcAddress;
	latestBitcoinBlockHeight: number;
}): BtcTransactionUi => {
	// Step 1: Calculate total input value and determine if the trabtcAddressTransactionsnsaction is a "send"
	const { totalInputValue, isTypeSend } = vin.reduce<{
		totalInputValue: number;
		isTypeSend: boolean;
	}>(
		(acc, { prevout }) => {
			// For coinbase transactions, prevout might not exist
			if (!prevout) {
				return acc;
			}

			return {
				totalInputValue: acc.totalInputValue + prevout.value,
				isTypeSend: acc.isTypeSend ? acc.isTypeSend : prevout.scriptpubkey_address === btcAddress
			};
		},
		{
			totalInputValue: 0,
			isTypeSend: false
		}
	);

	// Step 2: Analyse outputs to determine total value, destination addresses, and whether it's a self-transaction
	const { totalOutputValue, totalValue, to, selfTransaction } = vout.reduce<{
		to: string[];
		totalValue: number | undefined;
		totalOutputValue: number;
		selfTransaction: boolean;
	}>(
		(acc, output) => {
			const { scriptpubkey_address: addr, value } = output;

			// Skip outputs without addresses (e.g., OP_RETURN outputs)
			if (!addr) {
				return {
					...acc,
					totalOutputValue: acc.totalOutputValue + value,
					selfTransaction: false
				};
			}

			// For 'send' tx: include outputs not to the sender
			// For 'receive' tx: include only outputs to the user
			const isValidOutput =
				(isTypeSend && addr !== btcAddress) || (!isTypeSend && addr === btcAddress);

			return {
				...acc,
				totalValue: isValidOutput ? (acc.totalValue ?? 0) + value : acc.totalValue,
				to: isValidOutput ? [...acc.to, addr] : acc.to,
				totalOutputValue: acc.totalOutputValue + value,
				// If all outputs are to the sender, it's a self-transaction
				selfTransaction: acc.selfTransaction && addr === btcAddress
			};
		},
		{
			totalOutputValue: 0,
			totalValue: undefined,
			to: [],
			selfTransaction: true
		}
	);

	// Step 3: Calculate the transaction fee (provided directly by Blockstream API)
	const utxosFee = fee;

	// Step 4: Compute the number of confirmations
	// +1 is needed to account for the block where the transaction was first included
	const confirmations = nonNullish(status.block_height)
		? latestBitcoinBlockHeight - status.block_height + 1
		: undefined;

	// Step 5: Derive transaction status based on confirmation status
	const transactionStatus = !status.confirmed
		? 'pending'
		: nonNullish(confirmations) && confirmations >= CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
			? 'confirmed'
			: 'unconfirmed';

	// Step 6: Determine the value of the transaction
	const value = selfTransaction
		? // For self-transactions, we consider the total output value plus the fee, since that is logically the value spent for the presumable 'send' transaction
			BigInt(totalOutputValue + utxosFee)
		: nonNullish(totalValue)
			? // For 'send' transactions, we consider the total value sent plus the fee, since that is logically the value spent for the transaction
				BigInt(isTypeSend ? totalValue + utxosFee : totalValue)
			: undefined;

	// Step 7: Compose the final structured BTC transaction object for the UI
	return {
		id: txid,
		timestamp: nonNullish(status.block_time)
			? BigInt(status.block_time)
			: BigInt(Date.now() / 1000),
		value,
		status: transactionStatus,
		blockNumber: status.block_height ?? undefined,
		type: isTypeSend ? 'send' : 'receive',
		from: isTypeSend ? btcAddress : (vin[0]?.prevout?.scriptpubkey_address ?? 'coinbase'),
		to: selfTransaction ? [btcAddress] : to,
		confirmations
	};
};
