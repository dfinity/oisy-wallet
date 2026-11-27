import {
	mockRlusdCurrencyCode,
	mockRlusdIssuer,
	mockXrpAddress,
	mockXrpAddress2,
	mockXrpTrustLinePaymentEntry
} from '$tests/mocks/xrp.mock';
import { XRP_RIPPLE_EPOCH_OFFSET } from '$xrp/constants/xrp.constants';
import { mapXrpTrustLineTransactions } from '$xrp/utils/xrp-trust-line-transaction.utils';

// A trust line's node as the mock writes it: its entries are a union with the issuer's account root,
// so a line read back from them is narrowed here.
interface RippleStateAmount {
	currency: string;
	issuer: string;
	value: string;
}

interface RippleStateNode {
	ModifiedNode: {
		FinalFields: {
			Balance: RippleStateAmount;
			HighLimit: RippleStateAmount;
			LowLimit: RippleStateAmount;
		};
		PreviousFields: { Balance: RippleStateAmount };
	};
}

describe('xrp-trust-line-transaction.utils', () => {
	describe('mapXrpTrustLineTransactions', () => {
		// 0.00088 at the fixed scale of 18 decimals.
		const amount = 880_000_000_000_000n;

		const hash = '60A95C37965FC48117501F5EEAB3378306F9C6BE858178FBBCCAC6E804A2C9F6';

		it('maps a received payment to a receive of what arrived on the line', () => {
			const transaction = mockXrpTrustLinePaymentEntry({ receiver: mockXrpAddress });

			expect(mapXrpTrustLineTransactions({ transaction, xrpAddress: mockXrpAddress })).toEqual([
				{
					currency: mockRlusdCurrencyCode,
					issuer: mockRlusdIssuer,
					transaction: {
						id: hash,
						type: 'receive',
						status: 'confirmed',
						value: amount,
						from: 'rEhtVx4FTDKsmb1G22UyPs2riZseBzHfsw',
						to: mockXrpAddress,
						timestamp: BigInt(844063000 + XRP_RIPPLE_EPOCH_OFFSET),
						blockNumber: 107331031
					}
				}
			]);
		});

		it('maps a sent payment to a send, with the fee the sender paid', () => {
			const transaction = mockXrpTrustLinePaymentEntry({ sender: mockXrpAddress });

			expect(mapXrpTrustLineTransactions({ transaction, xrpAddress: mockXrpAddress })).toEqual([
				expect.objectContaining({
					transaction: expect.objectContaining({
						type: 'send',
						value: amount,
						fee: 10n,
						from: mockXrpAddress
					})
				})
			]);
		});

		it('takes what moved on the line, not the amount the payment asked for', () => {
			// A partial payment asked for 1 and delivered 0.5; a transfer fee would move the sender's
			// line by more than the amount the same way.
			const transaction = mockXrpTrustLinePaymentEntry({
				receiver: mockXrpAddress,
				value: '1',
				receiverPrevious: '2',
				receiverFinal: '2.5'
			});

			const [{ transaction: row }] = mapXrpTrustLineTransactions({
				transaction,
				xrpAddress: mockXrpAddress
			});

			expect(row.value).toBe(500_000_000_000_000_000n);
		});

		it('reads the wallet as the high side of a line, where the balance is the other side’s', () => {
			const entry = mockXrpTrustLinePaymentEntry({ receiver: mockXrpAddress });
			const [, , node] = entry.meta.AffectedNodes;
			const { FinalFields, PreviousFields } = (node as RippleStateNode).ModifiedNode;

			const flipped = {
				ModifiedNode: {
					LedgerEntryType: 'RippleState',
					FinalFields: {
						...FinalFields,
						Balance: { ...FinalFields.Balance, value: '-96.131363' },
						HighLimit: { ...FinalFields.LowLimit, issuer: mockXrpAddress },
						LowLimit: { ...FinalFields.HighLimit, issuer: mockRlusdIssuer }
					},
					PreviousFields: { Balance: { ...PreviousFields.Balance, value: '-96.130483' } }
				}
			};

			const transaction = {
				...entry,
				meta: { ...entry.meta, AffectedNodes: [entry.meta.AffectedNodes[0], flipped] }
			};

			expect(mapXrpTrustLineTransactions({ transaction, xrpAddress: mockXrpAddress })).toEqual([
				expect.objectContaining({
					issuer: mockRlusdIssuer,
					transaction: expect.objectContaining({ type: 'receive', value: amount })
				})
			]);
		});

		it('reads a line the payment created, and one it deleted', () => {
			const entry = mockXrpTrustLinePaymentEntry({ receiver: mockXrpAddress });
			const fields = {
				HighLimit: { currency: mockRlusdCurrencyCode, issuer: mockRlusdIssuer, value: '0' },
				LowLimit: { currency: mockRlusdCurrencyCode, issuer: mockXrpAddress, value: '0' }
			};

			const created = {
				...entry,
				meta: {
					...entry.meta,
					AffectedNodes: [
						{
							CreatedNode: {
								LedgerEntryType: 'RippleState',
								NewFields: {
									...fields,
									Balance: { currency: mockRlusdCurrencyCode, value: '0.00088' }
								}
							}
						}
					]
				}
			};

			const deleted = {
				...entry,
				tx: { ...entry.tx, Account: mockXrpAddress, Destination: mockXrpAddress2 },
				meta: {
					...entry.meta,
					AffectedNodes: [
						{
							DeletedNode: {
								LedgerEntryType: 'RippleState',
								FinalFields: {
									...fields,
									Balance: { currency: mockRlusdCurrencyCode, value: '0' }
								},
								PreviousFields: { Balance: { currency: mockRlusdCurrencyCode, value: '0.00088' } }
							}
						}
					]
				}
			};

			expect(
				mapXrpTrustLineTransactions({ transaction: created, xrpAddress: mockXrpAddress })[0]
					.transaction
			).toEqual(expect.objectContaining({ type: 'receive', value: amount }));
			expect(
				mapXrpTrustLineTransactions({ transaction: deleted, xrpAddress: mockXrpAddress })[0]
					.transaction
			).toEqual(expect.objectContaining({ type: 'send', value: amount }));
		});

		it('ignores the lines of other accounts the payment moved through', () => {
			const transaction = mockXrpTrustLinePaymentEntry({ receiver: mockXrpAddress });

			const rows = mapXrpTrustLineTransactions({ transaction, xrpAddress: mockXrpAddress });

			expect(rows).toHaveLength(1);
			expect(rows[0].transaction.type).toBe('receive');
		});

		it('ignores a line whose balance the payment did not change', () => {
			const transaction = mockXrpTrustLinePaymentEntry({
				receiver: mockXrpAddress,
				receiverPrevious: '5',
				receiverFinal: '5'
			});

			expect(mapXrpTrustLineTransactions({ transaction, xrpAddress: mockXrpAddress })).toEqual([]);
		});

		it('skips a malformed node and keeps the others', () => {
			const entry = mockXrpTrustLinePaymentEntry({ receiver: mockXrpAddress });

			const transaction = {
				...entry,
				meta: {
					...entry.meta,
					AffectedNodes: [
						{ ModifiedNode: { LedgerEntryType: 'RippleState', FinalFields: { Balance: 'x' } } },
						...entry.meta.AffectedNodes
					]
				}
			};

			expect(mapXrpTrustLineTransactions({ transaction, xrpAddress: mockXrpAddress })).toHaveLength(
				1
			);
		});

		it('files a payment that moved two of the wallet’s lines under both, with the fee once', () => {
			const entry = mockXrpTrustLinePaymentEntry({
				sender: mockXrpAddress,
				receiver: mockXrpAddress,
				receiverPrevious: '1',
				receiverFinal: '2',
				senderPrevious: '10',
				senderFinal: '9'
			});

			// The wallet converts one token into another: the second line is of another currency.
			const [accountRoot, first, second] = entry.meta.AffectedNodes;
			const other = JSON.parse(JSON.stringify(second).replaceAll(mockRlusdCurrencyCode, 'USD'));

			const transaction = {
				...entry,
				meta: { ...entry.meta, AffectedNodes: [accountRoot, first, other] }
			};

			const rows = mapXrpTrustLineTransactions({ transaction, xrpAddress: mockXrpAddress });

			expect(rows.map(({ currency, transaction: { type } }) => [currency, type])).toEqual([
				[mockRlusdCurrencyCode, 'receive'],
				['USD', 'send']
			]);
			expect(rows[0].transaction.fee).toBe(10n);
			expect(rows[1].transaction.fee).toBeUndefined();
		});

		it('leaves the fee to the native XRP row when the payment delivered XRP', () => {
			const entry = mockXrpTrustLinePaymentEntry({
				sender: mockXrpAddress,
				receiver: mockXrpAddress
			});

			// A conversion of the token into XRP: XRP arrives, funded by the token.
			const transaction = {
				...entry,
				tx: { ...entry.tx, Amount: '1000000' },
				meta: { ...entry.meta, delivered_amount: '1000000' }
			};

			const rows = mapXrpTrustLineTransactions({ transaction, xrpAddress: mockXrpAddress });

			expect(rows.length).toBeGreaterThan(0);
			expect(rows.every(({ transaction: { fee } }) => fee === undefined)).toBeTruthy();
		});

		it.each([
			{
				name: 'a payment between two other accounts',
				transaction: mockXrpTrustLinePaymentEntry()
			},
			{
				name: 'a transaction that is not a payment',
				transaction: {
					...mockXrpTrustLinePaymentEntry({ receiver: mockXrpAddress }),
					tx: {
						...mockXrpTrustLinePaymentEntry({ receiver: mockXrpAddress }).tx,
						TransactionType: 'TrustSet'
					}
				}
			},
			{
				name: 'a failed payment',
				transaction: {
					...mockXrpTrustLinePaymentEntry({ receiver: mockXrpAddress }),
					meta: {
						...mockXrpTrustLinePaymentEntry({ receiver: mockXrpAddress }).meta,
						TransactionResult: 'tecPATH_DRY'
					}
				}
			},
			{
				name: 'a payment not validated yet',
				transaction: {
					...mockXrpTrustLinePaymentEntry({ receiver: mockXrpAddress }),
					validated: false
				}
			},
			{ name: 'something that is not an entry', transaction: 'not an entry' }
		])('maps nothing for $name', ({ transaction }) => {
			expect(mapXrpTrustLineTransactions({ transaction, xrpAddress: mockXrpAddress })).toEqual([]);
		});
	});
});
