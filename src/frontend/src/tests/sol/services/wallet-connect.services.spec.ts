import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { decode } from '$sol/services/wallet-connect.services';
import type { MappedSolTransaction } from '$sol/types/sol-transaction';
import * as solTransactionsUtils from '$sol/utils/sol-transactions.utils';
import {
	mapSolTransactionMessage,
	parseSolBase64TransactionMessage
} from '$sol/utils/sol-transactions.utils';
import type { CompilableTransactionMessage } from '@solana/kit';

describe('wallet-connect.services', () => {
	describe('decode', () => {
		beforeEach(() => {
			vi.resetAllMocks();
		});

		it('should throw an error if the networkId is invalid', async () => {
			const base64EncodedTransactionMessage = 'mockBase64Transaction';
			const networkId = ICP_NETWORK_ID;

			await expect(decode({ base64EncodedTransactionMessage, networkId })).rejects.toThrow(
				`No Solana network for network ${networkId.description}`
			);
		});

		it('should parse and map a transaction successfully for a valid network', async () => {
			const base64EncodedTransactionMessage = 'mockBase64Transaction';
			const networkId = SOLANA_MAINNET_NETWORK_ID;
			const parsedTransaction = { mock: 'parsedTransaction' };
			const mappedTransaction = { mock: 'mappedTransaction' };

			vi.spyOn(solTransactionsUtils, 'parseSolBase64TransactionMessage').mockResolvedValueOnce(
				parsedTransaction as unknown as CompilableTransactionMessage
			);
			vi.spyOn(solTransactionsUtils, 'mapSolTransactionMessage').mockResolvedValueOnce(
				mappedTransaction as unknown as MappedSolTransaction
			);

			const result = await decode({ base64EncodedTransactionMessage, networkId });

			expect(parseSolBase64TransactionMessage).toHaveBeenCalledWith({
				transactionMessage: base64EncodedTransactionMessage,
				rpc: expect.anything()
			});
			expect(mapSolTransactionMessage).toHaveBeenCalledWith(parsedTransaction);
			expect(result).toEqual(mappedTransaction);
		});
	});
});
