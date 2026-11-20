import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import * as backendApi from '$lib/api/backend.api';
import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsSendXrp } from '$lib/enums/progress-steps';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import { parseNetworkId } from '$lib/validation/network.validation';
import {
	mockLiquidiumActiveUserTransaction,
	mockXrpActiveUserTransaction,
	mockXrpData,
	mockXrpSwapActiveUserTransaction,
	mockXrpTrustSetActiveUserTransaction,
	mockXrpTrustSetData
} from '$tests/mocks/active-user-transactions.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockXrpAddress, mockXrpAddress2, mockXrpTrustLine } from '$tests/mocks/xrp.mock';
import {
	XRP_LAST_LEDGER_SEQUENCE_OFFSET,
	XRP_MAX_FEE_DROPS,
	XRP_MAX_UINT32
} from '$xrp/constants/xrp.constants';
import { XrpRpcNotConfiguredError } from '$xrp/providers/xrp-rpc.providers';
import * as xrplRest from '$xrp/rest/xrpl.rest';
import * as xrpSignServices from '$xrp/services/xrp-sign.services';
import { submitXrpTrustSet } from '$xrp/services/xrp-trust-set.services';
import { XrpNetworks } from '$xrp/types/network';
import { XRP_EXTERNAL_REF_KEYS } from '$xrp/types/xrp-active-tx';
import {
	XrpSendAlreadyInFlightError,
	XrpSendNotGuardedError,
	XrpTrustLineBalanceNotZeroError,
	XrpTrustLineNotHeldError,
	XrpTrustSetUnfundedError
} from '$xrp/types/xrp-send';
import type { XrpAccountInfo } from '$xrp/types/xrp-transaction';
import { getXrpReserveDrops } from '$xrp/utils/xrp-send.utils';
import { buildXrpTrustSet, deriveXrpTransactionHash } from '$xrp/utils/xrp-transaction.utils';
import { encode } from 'ripple-binary-codec';

// What the backend answers when the caller's records are `transactions`.
const recordsResponse = (transactions: ActiveUserTransaction[]) => ({
	transactions,
	seen_up_to_ns: ZERO
});

describe('xrp-trust-set.services', () => {
	const source = mockXrpAddress;
	const signingPublicKey = 'ED01FA53FA5A7E77798F882ECE20B1ABC00BB358A9E55A202D0D0676BD0CE37A63';
	const token = { ...RLUSD_TOKEN, enabled: true };

	const ledgerIndex = 1000;
	const lastLedgerSequence = ledgerIndex + XRP_LAST_LEDGER_SEQUENCE_OFFSET;

	// A real encoded `TrustSet`, not a placeholder: the record's hash and ledger window are derived
	// from these bytes, so they have to carry the `LastLedgerSequence` the expectations use.
	const signedBlob = encode({
		...buildXrpTrustSet({
			account: source,
			token,
			change: 'add',
			fee: 12n,
			sequence: 7,
			signingPublicKey,
			lastLedgerSequence
		}),
		TxnSignature: '07'.repeat(64)
	});

	const account: XrpAccountInfo = { balance: 50_000_000n, sequence: 7, ownerCount: 0, flags: 0 };

	const params = {
		identity: mockIdentity,
		network: XrpNetworks.mainnet,
		source,
		token,
		change: 'add' as const,
		fee: 12n
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Every RPC this path makes is mocked below; this catches anything that reaches the network.
		vi.stubGlobal('fetch', () => Promise.reject(new Error('unexpected network call in a test')));

		vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockResolvedValue(account);
		vi.spyOn(xrplRest, 'loadXrpLedgerIndex').mockResolvedValue(ledgerIndex);
		vi.spyOn(xrpSignServices, 'getXrpSigningPublicKey').mockResolvedValue(signingPublicKey);
		vi.spyOn(xrpSignServices, 'signXrpTransaction').mockResolvedValue(signedBlob);
		vi.spyOn(xrplRest, 'submitXrpTransaction').mockResolvedValue({
			engineResult: 'tesSUCCESS',
			txHash: 'TXHASH'
		});
		vi.spyOn(backendApi, 'getActiveUserTransactions').mockResolvedValue(recordsResponse([]));
		vi.spyOn(activeUserTransactionsServices, 'createActiveUserTransaction').mockResolvedValue(
			mockXrpTrustSetActiveUserTransaction
		);
	});

	const expectNothingSigned = () => {
		expect(xrpSignServices.signXrpTransaction).not.toHaveBeenCalled();
		expect(activeUserTransactionsServices.createActiveUserTransaction).not.toHaveBeenCalled();
		expect(xrplRest.submitXrpTransaction).not.toHaveBeenCalled();
	};

	it('builds the TrustSet from the reviewed fee and the fetched sequence and ledger, then signs it', async () => {
		await submitXrpTrustSet(params);

		expect(xrpSignServices.signXrpTransaction).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			network: XrpNetworks.mainnet,
			transaction: buildXrpTrustSet({
				account: source,
				token,
				change: 'add',
				fee: 12n,
				sequence: 7,
				signingPublicKey,
				lastLedgerSequence
			})
		});
	});

	it('asks for a signing key bound to the account it signs for', async () => {
		await submitXrpTrustSet(params);

		expect(xrpSignServices.getXrpSigningPublicKey).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			network: XrpNetworks.mainnet,
			account: source
		});
	});

	it('submits the signed blob and returns the hash derived from it', async () => {
		const result = await submitXrpTrustSet(params);

		expect(xrplRest.submitXrpTransaction).toHaveBeenCalledExactlyOnceWith({
			txBlob: signedBlob,
			network: XrpNetworks.mainnet
		});
		expect(result).toEqual({
			txHash: await deriveXrpTransactionHash(signedBlob),
			submitResult: { engineResult: 'tesSUCCESS', txHash: 'TXHASH' }
		});
	});

	// No step after the submit: the ledger's answer comes through the record, and the caller ends
	// its own progress.
	it('reports progress up to the submit', async () => {
		const progress = vi.fn();

		await submitXrpTrustSet({ ...params, progress });

		expect(progress.mock.calls.map(([step]) => step)).toEqual([
			ProgressStepsSendXrp.INITIALIZATION,
			ProgressStepsSendXrp.SIGN,
			ProgressStepsSendXrp.SEND
		]);
	});

	describe('refused before any work', () => {
		const expectNoWork = () => {
			expect(backendApi.getActiveUserTransactions).not.toHaveBeenCalled();
			expect(xrplRest.loadXrpAccountInfo).not.toHaveBeenCalled();

			expectNothingSigned();
		};

		// XRPL answers `temDST_IS_SRC` and never applies it; the backend refuses such a record too.
		it("refuses a line to the account's own issued token", async () => {
			await expect(
				submitXrpTrustSet({ ...params, token: { ...token, issuer: source } })
			).rejects.toThrow("is the token's own issuer");

			expectNoWork();
		});

		it.each([ZERO, -1n, XRP_MAX_FEE_DROPS + 1n])('refuses the fee %s drops', async (fee) => {
			await expect(submitXrpTrustSet({ ...params, fee })).rejects.toThrow(
				'XRP fee must be between'
			);

			expectNoWork();
		});

		it('signs with the largest fee it accepts', async () => {
			await expect(submitXrpTrustSet({ ...params, fee: XRP_MAX_FEE_DROPS })).resolves.toBeDefined();
		});

		// No backend identity, no record — and without a record nothing may be signed.
		it('refuses a token it could not record', async () => {
			await expect(
				submitXrpTrustSet({
					...params,
					token: {
						...token,
						network: { ...XRP_MAINNET_NETWORK, id: parseNetworkId('XRP_TESTNET') }
					}
				})
			).rejects.toThrow(XrpSendNotGuardedError);

			expectNoWork();
		});
	});

	// A `TrustSet` takes the address's next sequence as a payment does, so it passes the same gate.
	describe('the in-flight guard', () => {
		it.each([
			['a send', mockXrpActiveUserTransaction],
			['another trust-line token being added', mockXrpTrustSetActiveUserTransaction],
			['a swap whose deposit is Pending', mockXrpSwapActiveUserTransaction]
		])('refuses while %s from the address is unresolved', async (...[, open]) => {
			vi.mocked(backendApi.getActiveUserTransactions).mockResolvedValue(recordsResponse([open]));

			await expect(submitXrpTrustSet(params)).rejects.toThrow(XrpSendAlreadyInFlightError);

			expect(xrplRest.loadXrpAccountInfo).not.toHaveBeenCalled();

			expectNothingSigned();
		});

		it.each([
			[
				'a record for another address',
				{
					...mockXrpActiveUserTransaction,
					data: { Xrp: { ...mockXrpData, source_address: mockXrpAddress2 } }
				} as ActiveUserTransaction
			],
			[
				'a resolved record',
				{ ...mockXrpTrustSetActiveUserTransaction, status: { Succeeded: null } }
			],
			['a record from another flow', mockLiquidiumActiveUserTransaction]
		])('does not refuse on %s', async (...[, record]) => {
			vi.mocked(backendApi.getActiveUserTransactions).mockResolvedValue(recordsResponse([record]));

			await expect(submitXrpTrustSet(params)).resolves.toBeDefined();
		});

		it('refuses when the records cannot be read', async () => {
			vi.mocked(backendApi.getActiveUserTransactions).mockRejectedValue(new Error('unreachable'));

			await expect(submitXrpTrustSet(params)).rejects.toThrow(XrpSendNotGuardedError);

			expectNothingSigned();
		});

		it('refuses without an identity', async () => {
			await expect(submitXrpTrustSet({ ...params, identity: undefined })).rejects.toThrow(
				XrpSendNotGuardedError
			);

			expect(backendApi.getActiveUserTransactions).not.toHaveBeenCalled();

			expectNothingSigned();
		});
	});

	// The open ledger can hold a sequence the validated one has not consumed yet, and credits that
	// may never validate; each value is taken from the snapshot that cannot hurt.
	describe('the two account snapshots', () => {
		const snapshots = ({
			current,
			validated
		}: {
			current: Partial<XrpAccountInfo>;
			validated: Partial<XrpAccountInfo>;
		}) =>
			vi
				.mocked(xrplRest.loadXrpAccountInfo)
				.mockImplementation(({ ledgerIndex: ledger }) =>
					Promise.resolve({ ...account, ...(ledger === 'current' ? current : validated) })
				);

		it('reads the account from both ledgers', async () => {
			await submitXrpTrustSet(params);

			expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalledWith({
				address: source,
				network: XrpNetworks.mainnet,
				ledgerIndex: 'current'
			});
			expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalledWith({
				address: source,
				network: XrpNetworks.mainnet,
				ledgerIndex: 'validated'
			});
		});

		it.each([
			{ current: { sequence: 9 }, validated: { sequence: 7 } },
			{ current: { sequence: 7 }, validated: { sequence: 9 } }
		])('signs the higher sequence ($current.sequence / $validated.sequence)', async (pair) => {
			snapshots(pair);

			await submitXrpTrustSet(params);

			expect(xrpSignServices.signXrpTransaction).toHaveBeenCalledWith(
				expect.objectContaining({ transaction: expect.objectContaining({ Sequence: 9 }) })
			);
		});

		// Two objects owned, so the reserve is enforced: 1_600_000 drops for a third.
		it('does not let an unvalidated credit cover the reserve', async () => {
			snapshots({
				current: { balance: 2_000_000n, ownerCount: 2 },
				validated: { balance: 1_000_000n, ownerCount: 2 }
			});

			await expect(submitXrpTrustSet(params)).rejects.toThrow(XrpTrustSetUnfundedError);
		});

		it('does not let a validated owner count understate the reserve', async () => {
			snapshots({
				current: { balance: 1_500_000n, ownerCount: 2 },
				validated: { balance: 1_500_000n, ownerCount: 1 }
			});

			await expect(submitXrpTrustSet(params)).rejects.toThrow(XrpTrustSetUnfundedError);
		});
	});

	// Either shortfall makes the ledger apply the `TrustSet` as a failure that claims the fee, and the
	// review's reading of the balance may be stale by now.
	describe('the balance it needs', () => {
		const withAccount = (info: Partial<XrpAccountInfo>) =>
			vi.mocked(xrplRest.loadXrpAccountInfo).mockResolvedValue({ ...account, ...info });

		it('refuses a balance that cannot pay the fee', async () => {
			withAccount({ balance: 11n });

			await expect(submitXrpTrustSet(params)).rejects.toThrow(XrpTrustSetUnfundedError);

			expectNothingSigned();
		});

		// The ledger waives the new line's reserve below two owned objects.
		it.each([0, 1])('needs no reserve for the line with %i objects owned', async (ownerCount) => {
			withAccount({ balance: 12n, ownerCount });

			await expect(submitXrpTrustSet(params)).resolves.toBeDefined();
		});

		// From two on it is the reserve after the line, against the balance before the fee, as
		// rippled compares it.
		it('refuses a balance below the reserve after the line from two objects owned', async () => {
			withAccount({ balance: getXrpReserveDrops({ ownerCount: 3 }) - 1n, ownerCount: 2 });

			await expect(submitXrpTrustSet(params)).rejects.toThrow(XrpTrustSetUnfundedError);

			expectNothingSigned();
		});

		it('signs with exactly the reserve after the line', async () => {
			withAccount({ balance: getXrpReserveDrops({ ownerCount: 3 }), ownerCount: 2 });

			await expect(submitXrpTrustSet(params)).resolves.toBeDefined();
		});
	});

	describe('the LastLedgerSequence ceiling', () => {
		const highest = XRP_MAX_UINT32 - XRP_LAST_LEDGER_SEQUENCE_OFFSET;

		it('signs at the highest index that still forms a UInt32', async () => {
			vi.mocked(xrplRest.loadXrpLedgerIndex).mockResolvedValue(highest);

			await submitXrpTrustSet(params);

			expect(xrpSignServices.signXrpTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					transaction: expect.objectContaining({ LastLedgerSequence: XRP_MAX_UINT32 })
				})
			);
		});

		it('refuses an index past it before signing', async () => {
			vi.mocked(xrplRest.loadXrpLedgerIndex).mockResolvedValue(highest + 1);

			await expect(submitXrpTrustSet(params)).rejects.toThrow('cannot form a UInt32');

			expect(xrpSignServices.getXrpSigningPublicKey).not.toHaveBeenCalled();

			expectNothingSigned();
		});
	});

	describe('the in-flight record', () => {
		// Later would miss a submit whose response is lost; earlier would describe a transaction that
		// does not exist yet.
		it('is created after signing and before submitting', async () => {
			const order: string[] = [];

			vi.mocked(xrpSignServices.signXrpTransaction).mockImplementation(() => {
				order.push('sign');
				return Promise.resolve(signedBlob);
			});
			vi.mocked(activeUserTransactionsServices.createActiveUserTransaction).mockImplementation(
				() => {
					order.push('create');
					return Promise.resolve(mockXrpTrustSetActiveUserTransaction);
				}
			);
			vi.mocked(xrplRest.submitXrpTransaction).mockImplementation(() => {
				order.push('submit');
				return Promise.resolve({ engineResult: 'tesSUCCESS', txHash: 'TXHASH' });
			});

			await submitXrpTrustSet(params);

			expect(order).toEqual(['sign', 'create', 'submit']);
		});

		// The snapshot is what the row shows in a later session, when the token may not be listed.
		it('carries the token, the poll keys derived from the blob and the snapshot', async () => {
			await submitXrpTrustSet(params);

			expect(
				activeUserTransactionsServices.createActiveUserTransaction
			).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id: expect.any(String),
				data: { XrpTrustSet: mockXrpTrustSetData },
				progressStep: ProgressStepsSendXrp.SEND,
				externalRefs: expect.arrayContaining([
					{ key: XRP_EXTERNAL_REF_KEYS.TX_HASH, value: await deriveXrpTransactionHash(signedBlob) },
					{ key: XRP_EXTERNAL_REF_KEYS.LAST_LEDGER_SEQUENCE, value: `${lastLedgerSequence}` },
					{ key: XRP_EXTERNAL_REF_KEYS.TOKEN_SYMBOL, value: RLUSD_TOKEN.symbol },
					{ key: XRP_EXTERNAL_REF_KEYS.NETWORK_SYMBOL, value: XRP_MAINNET_NETWORK.name }
				])
			});
		});

		// The window the gate cannot cover: another tab can pass it between its read and this create.
		it('reports the backend refusing a second open transaction as in flight', async () => {
			vi.mocked(activeUserTransactionsServices.createActiveUserTransaction).mockRejectedValue({
				AlreadyInFlight: null
			});

			await expect(submitXrpTrustSet(params)).rejects.toThrow(XrpSendAlreadyInFlightError);

			expect(xrplRest.submitXrpTransaction).not.toHaveBeenCalled();
		});

		it('refuses to submit when the record cannot be created', async () => {
			vi.mocked(activeUserTransactionsServices.createActiveUserTransaction).mockRejectedValue(
				new Error('TooManyActiveTransactions')
			);

			await expect(submitXrpTrustSet(params)).rejects.toThrow(XrpSendNotGuardedError);

			expect(xrplRest.submitXrpTransaction).not.toHaveBeenCalled();
		});

		// Only a missing endpoint provably comes before the request.
		it('surfaces a missing endpoint', async () => {
			vi.mocked(xrplRest.submitXrpTransaction).mockRejectedValue(
				new XrpRpcNotConfiguredError('no endpoint')
			);

			await expect(submitXrpTrustSet(params)).rejects.toThrow(XrpRpcNotConfiguredError);
		});

		// Anything else may follow a request the node already processed, so the record decides.
		it.each([
			['a rejected request', new Error('network down')],
			['a malformed response', new Error('Unexpected XRPL submit response')]
		])('resolves despite %s, leaving the outcome to the record', async (...[, err]) => {
			vi.mocked(xrplRest.submitXrpTransaction).mockRejectedValue(err);

			await expect(submitXrpTrustSet(params)).resolves.toEqual({
				txHash: await deriveXrpTransactionHash(signedBlob),
				submitResult: undefined
			});
		});

		it('never writes a terminal status and never confirms', async () => {
			const update = vi.spyOn(activeUserTransactionsServices, 'updateActiveUserTransaction');
			const outcome = vi.spyOn(xrplRest, 'loadXrpTransactionOutcome');

			await submitXrpTrustSet(params);

			expect(update).not.toHaveBeenCalled();
			expect(outcome).not.toHaveBeenCalled();
		});
	});

	describe('removing a token', () => {
		const removal = { ...params, change: 'remove' as const };
		const heldAtZero = { ...mockXrpTrustLine, balance: '0' };

		beforeEach(() => {
			vi.spyOn(xrplRest, 'loadXrpAccountLines').mockResolvedValue([heldAtZero]);
		});

		it('signs a TrustSet that takes the limit to zero', async () => {
			await submitXrpTrustSet(removal);

			expect(xrpSignServices.signXrpTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				network: XrpNetworks.mainnet,
				transaction: buildXrpTrustSet({
					account: source,
					token,
					change: 'remove',
					fee: 12n,
					sequence: 7,
					signingPublicKey,
					lastLedgerSequence
				})
			});
		});

		it('records the change as a removal', async () => {
			await submitXrpTrustSet(removal);

			expect(activeUserTransactionsServices.createActiveUserTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					data: { XrpTrustSet: { ...mockXrpTrustSetData, change: { Remove: null } } }
				})
			);
		});

		// The review's reading may be stale by the time the user confirms.
		it('reads the line with its issuer again before signing', async () => {
			await submitXrpTrustSet(removal);

			expect(xrplRest.loadXrpAccountLines).toHaveBeenCalledExactlyOnceWith({
				address: source,
				network: XrpNetworks.mainnet,
				peer: token.issuer
			});
		});

		it('does not read the line when adding', async () => {
			vi.mocked(xrplRest.loadXrpAccountLines).mockClear();

			await submitXrpTrustSet(params);

			expect(xrplRest.loadXrpAccountLines).not.toHaveBeenCalled();
		});

		// The ledger would fail it as redundant and claim the fee.
		it.each([
			['no line', []],
			['only a line of another token', [{ ...heldAtZero, currency: 'USD' }]]
		])('refuses when the account holds %s', async (...[, lines]) => {
			vi.mocked(xrplRest.loadXrpAccountLines).mockResolvedValue(lines);

			await expect(submitXrpTrustSet(removal)).rejects.toThrow(XrpTrustLineNotHeldError);

			expectNothingSigned();
		});

		// Dust below the wallet's 18 decimals reads as zero once scaled; the ledger's string does not.
		it.each(['12.5', '1e-20', '-0.5'])('refuses a balance of %s', async (balance) => {
			vi.mocked(xrplRest.loadXrpAccountLines).mockResolvedValue([{ ...heldAtZero, balance }]);

			await expect(submitXrpTrustSet(removal)).rejects.toThrow(XrpTrustLineBalanceNotZeroError);

			expectNothingSigned();
		});

		it.each(['0', '0.0', '-0', '0e-15'])('removes at a balance written %s', async (balance) => {
			vi.mocked(xrplRest.loadXrpAccountLines).mockResolvedValue([{ ...heldAtZero, balance }]);

			await expect(submitXrpTrustSet(removal)).resolves.toBeDefined();
		});

		it('refuses a balance that cannot pay the fee', async () => {
			vi.mocked(xrplRest.loadXrpAccountInfo).mockResolvedValue({ ...account, balance: 11n });

			await expect(submitXrpTrustSet(removal)).rejects.toThrow(XrpTrustSetUnfundedError);

			expectNothingSigned();
		});

		// Removing releases a reserve rather than adding one, so a balance below the reserve after
		// one more line is no reason to refuse.
		it('needs only the fee, whatever the account owns', async () => {
			vi.mocked(xrplRest.loadXrpAccountInfo).mockResolvedValue({
				...account,
				balance: 12n,
				ownerCount: 5
			});

			await expect(submitXrpTrustSet(removal)).resolves.toBeDefined();
		});

		it('refuses while another transaction from the address is unresolved', async () => {
			vi.mocked(backendApi.getActiveUserTransactions).mockResolvedValue(
				recordsResponse([mockXrpActiveUserTransaction])
			);

			await expect(submitXrpTrustSet(removal)).rejects.toThrow(XrpSendAlreadyInFlightError);

			expect(xrplRest.loadXrpAccountLines).not.toHaveBeenCalled();

			expectNothingSigned();
		});
	});
});
