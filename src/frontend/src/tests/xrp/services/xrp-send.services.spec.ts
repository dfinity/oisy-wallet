import { ProgressStepsSendXrp } from '$lib/enums/progress-steps';
import { mockIdentity } from '$tests/mocks/identity.mock';
import * as xrplApi from '$xrp/api/xrpl.api';
import { XRP_LAST_LEDGER_SEQUENCE_OFFSET } from '$xrp/constants/xrp.constants';
import { sendXrp } from '$xrp/services/xrp-send.services';
import * as xrpSignServices from '$xrp/services/xrp-sign.services';
import { XrpNetworks } from '$xrp/types/network';

vi.mock('$lib/utils/time.utils', () => ({
	randomWait: vi.fn()
}));

describe('xrp-send.services', () => {
	const source = 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD';
	const destination = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';
	const signingPublicKey = 'ED01FA53FA5A7E77798F882ECE20B1ABC00BB358A9E55A202D0D0676BD0CE37A63';

	const params = {
		identity: mockIdentity,
		network: XrpNetworks.mainnet,
		source,
		destination,
		amount: 25_000_000n,
		destinationTag: 12345
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(xrplApi, 'loadXrpAccountInfo').mockResolvedValue({
			balance: 50_000_000n,
			sequence: 7
		});
		vi.spyOn(xrplApi, 'loadXrpOpenLedgerFee').mockResolvedValue(12n);
		vi.spyOn(xrplApi, 'loadXrpLedgerIndex').mockResolvedValue(1000);
		vi.spyOn(xrpSignServices, 'getXrpSigningPublicKey').mockResolvedValue(signingPublicKey);
		vi.spyOn(xrpSignServices, 'signXrpTransaction').mockResolvedValue('SIGNED_BLOB');
		vi.spyOn(xrplApi, 'submitXrpTransaction').mockResolvedValue({
			engineResult: 'tesSUCCESS',
			accepted: true,
			txHash: 'TXHASH'
		});
		vi.spyOn(xrplApi, 'isXrpTransactionValidated').mockResolvedValue(true);
	});

	it('builds the payment from fetched sequence/fee/ledger and threshold-signs it', async () => {
		await sendXrp(params);

		expect(xrpSignServices.signXrpTransaction).toHaveBeenCalledWith({
			identity: mockIdentity,
			network: XrpNetworks.mainnet,
			transaction: {
				TransactionType: 'Payment',
				Account: source,
				Destination: destination,
				Amount: '25000000',
				Fee: '12',
				Sequence: 7,
				SigningPubKey: signingPublicKey,
				DestinationTag: 12345,
				LastLedgerSequence: 1000 + XRP_LAST_LEDGER_SEQUENCE_OFFSET
			}
		});
	});

	it('submits the signed blob and returns the accepted result', async () => {
		const result = await sendXrp(params);

		expect(xrplApi.submitXrpTransaction).toHaveBeenCalledWith({
			txBlob: 'SIGNED_BLOB',
			network: XrpNetworks.mainnet
		});
		expect(result.txHash).toBe('TXHASH');
	});

	it('reports progress through the send steps', async () => {
		const progress = vi.fn();

		await sendXrp({ ...params, progress });

		expect(progress.mock.calls.map(([step]) => step)).toEqual([
			ProgressStepsSendXrp.INITIALIZATION,
			ProgressStepsSendXrp.SIGN,
			ProgressStepsSendXrp.SEND,
			ProgressStepsSendXrp.CONFIRM,
			ProgressStepsSendXrp.DONE
		]);
	});

	it('waits for the transaction to be validated', async () => {
		await sendXrp(params);

		expect(xrplApi.isXrpTransactionValidated).toHaveBeenCalledWith({
			hash: 'TXHASH',
			network: XrpNetworks.mainnet
		});
	});

	it('throws when the node rejects the transaction', async () => {
		vi.spyOn(xrplApi, 'submitXrpTransaction').mockResolvedValue({
			engineResult: 'tecUNFUNDED_PAYMENT',
			accepted: false
		});

		await expect(sendXrp(params)).rejects.toThrow('tecUNFUNDED_PAYMENT');
	});
});
