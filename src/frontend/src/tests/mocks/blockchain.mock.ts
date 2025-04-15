import type { BitcoinAddressData } from '$lib/types/blockchain';
import { mockBtcTransaction } from '$tests/mocks/btc-transactions.mock';
import { mockBtcAddress } from '$tests/mocks/btc.mock';

export const mockBlockchainResponse: BitcoinAddressData = {
	txs: [mockBtcTransaction],
	address: mockBtcAddress,
	final_balance: 100,
	total_received: 100,
	hash160: 'hash160',
	n_tx: 100,
	n_unredeemed: 100,
	total_sent: 100
};
