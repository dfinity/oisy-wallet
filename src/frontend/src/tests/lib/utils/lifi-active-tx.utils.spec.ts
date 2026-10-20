import type { TokenId } from '$declarations/backend/backend.did';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { BTC_REGTEST_TOKEN } from '$env/tokens/tokens.btc.env';
import {
	ACTIVE_USER_TRANSACTION_ERROR_MAX_BYTES,
	ACTIVE_USER_TRANSACTION_REF_VALUE_MAX_BYTES
} from '$lib/constants/app.constants';
import { LIFI_STATUS_UNRESOLVED_MAX_STEP_MILLIS } from '$lib/constants/swap.constants';
import en from '$lib/i18n/en.json';
import { LIFI_EXTERNAL_REF_KEYS } from '$lib/types/lifi';
import { SwapProvider } from '$lib/types/swap';
import {
	buildLifiSwapTrackingMetadata,
	isLifiActiveUserTransaction,
	isLifiStatusUnresolved,
	isLifiStoredUnresolvedWindow,
	lifiChainIdOfTokenId,
	lifiSourceOutcomeToUpdate,
	lifiStatusPollIntervalMillis,
	nextLifiUnresolvedWindow,
	toLifiCreationRefs,
	toLifiData,
	toLifiExternalRefs,
	toLifiExternalRefsMap,
	toLifiLearnedRefs,
	toLifiStatusUpdate,
	type LifiStatusAnswer
} from '$lib/utils/lifi-active-tx.utils';
import {
	mockLifiActiveUserTransaction,
	mockVeloraActiveUserTransaction
} from '$tests/mocks/active-user-transactions.mock';
import { mockLifiBaseUsdcToken } from '$tests/mocks/lifi.mock';
import { Principal } from '@icp-sdk/core/principal';
import { ChainId, type ExtendedTransactionInfo } from '@lifi/sdk';

describe('lifi-active-tx.utils', () => {
	const utf8Length = (text: string): number => new TextEncoder().encode(text).length;

	describe('isLifiActiveUserTransaction', () => {
		it('should tell a LI.FI row from another provider', () => {
			expect(isLifiActiveUserTransaction(mockLifiActiveUserTransaction)).toBeTruthy();
			expect(isLifiActiveUserTransaction(mockVeloraActiveUserTransaction)).toBeFalsy();
		});
	});

	describe('external refs', () => {
		it('should sort the refs and drop empty values', () => {
			expect(
				toLifiExternalRefs({
					[LIFI_EXTERNAL_REF_KEYS.TX_NONCE]: '7',
					[LIFI_EXTERNAL_REF_KEYS.TOOL]: '',
					[LIFI_EXTERNAL_REF_KEYS.TX_HASH]: '0xhash'
				})
			).toEqual([
				{ key: LIFI_EXTERNAL_REF_KEYS.TX_NONCE, value: '7' },
				{ key: LIFI_EXTERNAL_REF_KEYS.TX_HASH, value: '0xhash' }
			]);
		});

		it('should round-trip through the keyed lookup', () => {
			const refs = toLifiExternalRefs(
				toLifiExternalRefsMap(mockLifiActiveUserTransaction.external_refs)
			);

			expect(toLifiExternalRefsMap(refs)).toEqual(
				toLifiExternalRefsMap(mockLifiActiveUserTransaction.external_refs)
			);
		});
	});

	describe('lifiChainIdOfTokenId', () => {
		it.each<{ kind: string; tokenId: TokenId; chainId: number }>([
			{ kind: 'native EVM', tokenId: { EvmNative: 8453n }, chainId: 8453 },
			{ kind: 'ERC-20', tokenId: { Erc20: ['0xabc', 42161n] }, chainId: 42161 },
			{ kind: 'ERC-4626', tokenId: { Erc4626: ['0xabc', 1n] }, chainId: 1 },
			{ kind: 'SPL', tokenId: { SplMainnet: 'mint' }, chainId: ChainId.SOL },
			{ kind: 'native SOL', tokenId: { SolNativeMainnet: null }, chainId: ChainId.SOL }
		])('should map a $kind token to its LI.FI chain', ({ tokenId, chainId }) => {
			expect(lifiChainIdOfTokenId(tokenId)).toBe(chainId);
		});

		it.each<{ kind: string; tokenId: TokenId }>([
			{ kind: 'devnet SPL', tokenId: { SplDevnet: 'mint' } },
			{ kind: 'devnet SOL', tokenId: { SolNativeDevnet: null } },
			{ kind: 'ICRC', tokenId: { Icrc: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai') } },
			{ kind: 'BTC', tokenId: { BtcNativeMainnet: null } }
		])('should not map a $kind token', ({ tokenId }) => {
			expect(lifiChainIdOfTokenId(tokenId)).toBeUndefined();
		});
	});

	describe('lifiStatusPollIntervalMillis', () => {
		it.each([
			{ ageMillis: -5_000, interval: 10_000 },
			{ ageMillis: 0, interval: 10_000 },
			{ ageMillis: 59_999, interval: 10_000 },
			{ ageMillis: 60_000, interval: 30_000 },
			{ ageMillis: 599_999, interval: 30_000 },
			{ ageMillis: 600_000, interval: 60_000 },
			{ ageMillis: 86_400_000, interval: 60_000 }
		])('should poll a row aged $ageMillis ms every $interval ms', ({ ageMillis, interval }) => {
			expect(lifiStatusPollIntervalMillis(ageMillis)).toBe(interval);
		});
	});

	describe('lifiSourceOutcomeToUpdate', () => {
		it('should keep a source still in flight executing', () => {
			expect(lifiSourceOutcomeToUpdate('pending')).toEqual({ status: { Executing: null } });
		});

		it('should fail a reverted source', () => {
			expect(lifiSourceOutcomeToUpdate('reverted')).toEqual({
				status: { Failed: null },
				error: en.swap.error.failed_unexpectedly
			});
		});

		it('should fail a replaced or dropped source', () => {
			expect(lifiSourceOutcomeToUpdate('replaced')).toEqual({
				status: { Failed: null },
				error: en.swap.error.swap_replaced_or_dropped
			});
		});

		it.each(['succeeded', 'unknown'] as const)('should settle nothing on %s', (outcome) => {
			expect(lifiSourceOutcomeToUpdate(outcome)).toBeUndefined();
		});
	});

	describe('isLifiStatusUnresolved', () => {
		it.each([
			{ status: 'NOT_FOUND', unresolved: true },
			{ status: 'INVALID', unresolved: true },
			{ status: 'PENDING', unresolved: false },
			{ status: 'DONE', unresolved: false },
			{ status: 'FAILED', unresolved: false }
		] as const)('should read $status as unresolved: $unresolved', ({ status, unresolved }) => {
			expect(isLifiStatusUnresolved({ status })).toBe(unresolved);
		});
	});

	describe('toLifiStatusUpdate', () => {
		it.each([
			{ substatus: 'WAIT_DESTINATION_TRANSACTION' },
			{ substatus: 'REFUND_IN_PROGRESS' },
			{ substatus: undefined }
		] as const)('should keep a PENDING transfer executing ($substatus)', ({ substatus }) => {
			expect(toLifiStatusUpdate({ status: 'PENDING', substatus })).toEqual({
				status: { Executing: null }
			});
		});

		it.each([
			{ substatus: 'COMPLETED' },
			{ substatus: 'PARTIAL' },
			{ substatus: undefined }
		] as const)('should succeed a DONE transfer ($substatus)', ({ substatus }) => {
			expect(toLifiStatusUpdate({ status: 'DONE', substatus })).toEqual({
				status: { Succeeded: null }
			});
		});

		it('should fail a refunded transfer with the refunded copy', () => {
			expect(toLifiStatusUpdate({ status: 'DONE', substatus: 'REFUNDED' })).toEqual({
				status: { Failed: null },
				error: en.swap.error.swap_refunded
			});
		});

		it("should fail a FAILED transfer with LI.FI's reason", () => {
			expect(
				toLifiStatusUpdate({
					status: 'FAILED',
					substatus: 'SLIPPAGE_EXCEEDED',
					substatusMessage: 'Slippage too high'
				})
			).toEqual({ status: { Failed: null }, error: 'Slippage too high' });
		});

		it('should cut a long non-ASCII reason to the byte limit', () => {
			const update = toLifiStatusUpdate({ status: 'FAILED', substatusMessage: 'é'.repeat(400) });

			expect(update?.error).toBe('é'.repeat(ACTIVE_USER_TRANSACTION_ERROR_MAX_BYTES / 2));
			expect(utf8Length(update?.error ?? '')).toBeLessThanOrEqual(
				ACTIVE_USER_TRANSACTION_ERROR_MAX_BYTES
			);
		});

		it('should fall back to the generic copy without a reason', () => {
			expect(toLifiStatusUpdate({ status: 'FAILED', substatusMessage: '' })).toEqual({
				status: { Failed: null },
				error: en.swap.error.failed_unexpectedly
			});
		});

		it.each(['NOT_FOUND', 'INVALID'] as const)('should settle nothing on %s', (status) => {
			expect(toLifiStatusUpdate({ status })).toBeUndefined();
		});
	});

	describe('toLifiLearnedRefs', () => {
		const evmHash = `0x${'cd'.repeat(32)}`;
		const solanaSignature = '5'.repeat(88);

		const receiving = (info: Partial<ExtendedTransactionInfo>): LifiStatusAnswer['receiving'] =>
			({ chainId: ChainId.SOL, txLink: '', ...info }) as ExtendedTransactionInfo;

		const partial = (info: Partial<ExtendedTransactionInfo>): LifiStatusAnswer => ({
			status: 'DONE',
			substatus: 'PARTIAL',
			receiving: receiving({ txHash: solanaSignature, ...info })
		});

		const receivedToken = { symbol: 'USDC.e', decimals: 6 } as NonNullable<
			ExtendedTransactionInfo['token']
		>;

		it('should learn nothing before LI.FI reports a destination transaction', () => {
			expect(
				toLifiLearnedRefs({
					answer: { status: 'PENDING', receiving: { chainId: ChainId.SOL } },
					toChain: ChainId.SOL
				})
			).toEqual({});

			expect(toLifiLearnedRefs({ answer: { status: 'NOT_FOUND' }, toChain: ChainId.SOL })).toEqual(
				{}
			);
		});

		it('should learn a destination hash that fits the destination chain', () => {
			expect(
				toLifiLearnedRefs({
					answer: { status: 'PENDING', receiving: receiving({ txHash: evmHash }) },
					toChain: ChainId.ARB
				})
			).toEqual({ [LIFI_EXTERNAL_REF_KEYS.DEST_TX_HASH]: evmHash });

			expect(
				toLifiLearnedRefs({
					answer: {
						status: 'DONE',
						substatus: 'COMPLETED',
						receiving: receiving({ txHash: solanaSignature })
					},
					toChain: ChainId.SOL
				})
			).toEqual({
				[LIFI_EXTERNAL_REF_KEYS.DEST_TX_HASH]: solanaSignature,
				[LIFI_EXTERNAL_REF_KEYS.SUBSTATUS]: 'COMPLETED'
			});
		});

		it.each(['COMPLETED', 'PARTIAL', 'REFUNDED'] as const)(
			'should record that a DONE transfer ended %s, without a destination transaction too',
			(substatus) => {
				expect(
					toLifiLearnedRefs({ answer: { status: 'DONE', substatus }, toChain: ChainId.SOL })
				).toEqual({ [LIFI_EXTERNAL_REF_KEYS.SUBSTATUS]: substatus });
			}
		);

		it.each([
			{
				case: 'a substatus outside the DONE set',
				answer: { status: 'DONE', substatus: 'EXPIRED' }
			},
			{ case: 'an unknown substatus', answer: { status: 'DONE', substatus: 'SOMETHING_NEW' } },
			{
				case: 'a PENDING transfer',
				answer: { status: 'PENDING', substatus: 'REFUND_IN_PROGRESS' }
			},
			{ case: 'a FAILED transfer', answer: { status: 'FAILED', substatus: 'SLIPPAGE_EXCEEDED' } }
		] as { case: string; answer: LifiStatusAnswer }[])(
			'should record no substatus for $case',
			({ answer }) => {
				expect(toLifiLearnedRefs({ answer, toChain: ChainId.SOL })).toEqual({});
			}
		);

		it.each([
			{ hash: evmHash, toChain: ChainId.SOL },
			{ hash: solanaSignature, toChain: ChainId.ARB },
			{ hash: `${evmHash}00`, toChain: ChainId.ARB },
			{ hash: '0OIl'.repeat(20), toChain: ChainId.SOL }
		])('should omit a hash that does not fit chain $toChain', ({ hash, toChain }) => {
			expect(
				toLifiLearnedRefs({
					answer: { status: 'PENDING', receiving: receiving({ txHash: hash }) },
					toChain
				})
			).toEqual({});
		});

		it('should record the token actually received on DONE / PARTIAL, formatted', () => {
			expect(
				toLifiLearnedRefs({
					answer: partial({ amount: '49875000', token: receivedToken }),
					toChain: ChainId.SOL
				})
			).toEqual({
				[LIFI_EXTERNAL_REF_KEYS.DEST_TX_HASH]: solanaSignature,
				[LIFI_EXTERNAL_REF_KEYS.SUBSTATUS]: 'PARTIAL',
				[LIFI_EXTERNAL_REF_KEYS.RECEIVED_SYMBOL]: 'USDC.e',
				[LIFI_EXTERNAL_REF_KEYS.RECEIVED_AMOUNT]: '49.875'
			});
		});

		it('should not record the received token on DONE / COMPLETED', () => {
			expect(
				toLifiLearnedRefs({
					answer: {
						status: 'DONE',
						substatus: 'COMPLETED',
						receiving: receiving({
							txHash: solanaSignature,
							amount: '49875000',
							token: receivedToken
						})
					},
					toChain: ChainId.SOL
				})
			).toEqual({
				[LIFI_EXTERNAL_REF_KEYS.DEST_TX_HASH]: solanaSignature,
				[LIFI_EXTERNAL_REF_KEYS.SUBSTATUS]: 'COMPLETED'
			});
		});

		it.each([
			{ case: 'a missing amount', info: { token: receivedToken } },
			{ case: 'a non-decimal amount', info: { amount: '0x10', token: receivedToken } },
			{ case: 'an amount past 256 bits', info: { amount: '1'.repeat(79), token: receivedToken } },
			{ case: 'a missing token', info: { amount: '1' } },
			{
				case: 'fractional decimals',
				info: { amount: '1', token: { ...receivedToken, decimals: 1.5 } }
			},
			{
				case: 'negative decimals',
				info: { amount: '1', token: { ...receivedToken, decimals: -1 } }
			},
			{
				case: 'decimals past the bound',
				info: { amount: '1', token: { ...receivedToken, decimals: 37 } }
			},
			{ case: 'an empty symbol', info: { amount: '1', token: { ...receivedToken, symbol: '' } } }
		] as { case: string; info: Partial<ExtendedTransactionInfo> }[])(
			'should omit the received pair for $case, keeping the partial substatus',
			({ info }) => {
				expect(toLifiLearnedRefs({ answer: partial(info), toChain: ChainId.SOL })).toEqual({
					[LIFI_EXTERNAL_REF_KEYS.DEST_TX_HASH]: solanaSignature,
					[LIFI_EXTERNAL_REF_KEYS.SUBSTATUS]: 'PARTIAL'
				});
			}
		);

		it('should cut a long non-ASCII symbol to the ref limit', () => {
			const refs = toLifiLearnedRefs({
				answer: partial({ amount: '1', token: { ...receivedToken, symbol: 'é'.repeat(300) } }),
				toChain: ChainId.SOL
			});

			const symbol = refs[LIFI_EXTERNAL_REF_KEYS.RECEIVED_SYMBOL] ?? '';

			expect(symbol).toBe('é'.repeat(ACTIVE_USER_TRANSACTION_REF_VALUE_MAX_BYTES / 2));
			expect(utf8Length(symbol)).toBeLessThanOrEqual(ACTIVE_USER_TRANSACTION_REF_VALUE_MAX_BYTES);
		});
	});

	describe('isLifiStoredUnresolvedWindow', () => {
		it('should accept a stored window', () => {
			expect(isLifiStoredUnresolvedWindow({ elapsedMs: 0 })).toBeTruthy();
			expect(isLifiStoredUnresolvedWindow({ elapsedMs: 60_000, lastSeenAt: 1 })).toBeTruthy();
		});

		it.each([
			{ case: 'null', value: null },
			{ case: 'a string', value: 'window' },
			{ case: 'a missing elapsed time', value: { lastSeenAt: 1 } },
			{ case: 'a negative elapsed time', value: { elapsedMs: -1 } },
			{ case: 'a NaN elapsed time', value: { elapsedMs: Number.NaN } },
			{ case: 'an infinite elapsed time', value: { elapsedMs: Infinity } },
			{ case: 'a string elapsed time', value: { elapsedMs: '1' } }
		])('should refuse $case', ({ value }) => {
			expect(isLifiStoredUnresolvedWindow(value)).toBeFalsy();
		});
	});

	describe('nextLifiUnresolvedWindow', () => {
		const now = 1_000_000_000;

		it('should open the window at zero', () => {
			expect(nextLifiUnresolvedWindow({ window: undefined, now })).toEqual({
				elapsedMs: 0,
				lastSeenAt: now
			});
		});

		it('should resume a stored window without adding to it', () => {
			expect(nextLifiUnresolvedWindow({ window: { elapsedMs: 5_000 }, now })).toEqual({
				elapsedMs: 5_000,
				lastSeenAt: now
			});
		});

		it('should add the time since the last poll', () => {
			expect(
				nextLifiUnresolvedWindow({ window: { elapsedMs: 5_000, lastSeenAt: now - 30_000 }, now })
			).toEqual({ elapsedMs: 35_000, lastSeenAt: now });
		});

		it('should add at most one capped step, however long since the last poll', () => {
			expect(
				nextLifiUnresolvedWindow({
					window: { elapsedMs: 5_000, lastSeenAt: now - 86_400_000 },
					now
				})
			).toEqual({ elapsedMs: 5_000 + LIFI_STATUS_UNRESOLVED_MAX_STEP_MILLIS, lastSeenAt: now });
		});

		it('should add nothing when the clock went back', () => {
			expect(
				nextLifiUnresolvedWindow({ window: { elapsedMs: 5_000, lastSeenAt: now + 60_000 }, now })
			).toEqual({ elapsedMs: 5_000, lastSeenAt: now });
		});
	});

	describe('buildLifiSwapTrackingMetadata', () => {
		it('should report the row like the other swap providers', () => {
			expect(buildLifiSwapTrackingMetadata({ tx: mockLifiActiveUserTransaction })).toEqual({
				sourceToken: 'USDC',
				destinationToken: 'USDC',
				dApp: SwapProvider.LIFI,
				tokenAmount: '50',
				usdSourceValue: '50.01',
				sourceNetwork: 'Base',
				destinationNetwork: 'Solana'
			});
		});

		it("should never report the row's error, which may be LI.FI's own text", () => {
			const metadata = buildLifiSwapTrackingMetadata({
				tx: {
					...mockLifiActiveUserTransaction,
					status: { Failed: null },
					error: ['bridge failed for 0x1234']
				}
			});

			expect(metadata).not.toHaveProperty('error');
		});
	});

	describe('toLifiData', () => {
		it("should name both tokens by their backend id, with the amount in the source's units", () => {
			expect(
				toLifiData({
					sourceToken: BASE_ETH_TOKEN,
					destinationToken: mockLifiBaseUsdcToken,
					amount: 10n
				})
			).toStrictEqual({
				Lifi: {
					source_token: { EvmNative: 8453n },
					dest_token: { Erc20: [mockLifiBaseUsdcToken.address, 8453n] },
					amount: 10n
				}
			});
		});

		it.each([
			{ side: 'source', sourceToken: BTC_REGTEST_TOKEN, destinationToken: mockLifiBaseUsdcToken },
			{ side: 'destination', sourceToken: BASE_ETH_TOKEN, destinationToken: BTC_REGTEST_TOKEN }
		])('should be undefined for a $side token without a backend id', (tokens) => {
			expect(toLifiData({ ...tokens, amount: 10n })).toBeUndefined();
		});
	});

	describe('toLifiCreationRefs', () => {
		const params = {
			hash: `0x${'ab'.repeat(32)}`,
			nonce: 7,
			quote: { tool: 'across', transactionId: `0x${'cd'.repeat(32)}` },
			sourceToken: BASE_ETH_TOKEN,
			destinationToken: mockLifiBaseUsdcToken,
			amount: '0.01',
			usdSourceValue: '25'
		};

		it('should carry the poll keys, the tool, the transaction id and the display metadata', () => {
			expect(toLifiCreationRefs(params)).toStrictEqual({
				[LIFI_EXTERNAL_REF_KEYS.TX_HASH]: params.hash,
				[LIFI_EXTERNAL_REF_KEYS.TX_NONCE]: '7',
				[LIFI_EXTERNAL_REF_KEYS.TOOL]: 'across',
				[LIFI_EXTERNAL_REF_KEYS.TRANSACTION_ID]: params.quote.transactionId,
				[LIFI_EXTERNAL_REF_KEYS.AMOUNT]: '0.01',
				[LIFI_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE]: '25',
				[LIFI_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]: BASE_ETH_TOKEN.symbol,
				[LIFI_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL]: BASE_ETH_TOKEN.network.name,
				[LIFI_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL]: mockLifiBaseUsdcToken.symbol,
				[LIFI_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL]: mockLifiBaseUsdcToken.network.name
			});
		});

		// Cut, it would be wrong rather than shorter; oversized, the backend would refuse the row.
		it.each([
			{ case: 'a tool key', quote: { ...params.quote, tool: 'across bridge' } },
			{ case: 'an overlong tool key', quote: { ...params.quote, tool: 'a'.repeat(65) } },
			{ case: 'a transaction id', quote: { ...params.quote, transactionId: 'not-hex' } },
			{
				case: 'an overlong transaction id',
				quote: { ...params.quote, transactionId: `0x${'a'.repeat(129)}` }
			}
		])('should leave out $case that is not valid', ({ quote }) => {
			const refs = toLifiCreationRefs({ ...params, quote });

			expect(refs[LIFI_EXTERNAL_REF_KEYS.TX_HASH]).toBe(params.hash);
			expect(
				quote.tool === params.quote.tool
					? refs[LIFI_EXTERNAL_REF_KEYS.TRANSACTION_ID]
					: refs[LIFI_EXTERNAL_REF_KEYS.TOOL]
			).toBeUndefined();
		});

		it('should leave out a USD value it was not given', () => {
			expect(
				toLifiCreationRefs({ ...params, usdSourceValue: undefined })[
					LIFI_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE
				]
			).toBeUndefined();
		});
	});
});
