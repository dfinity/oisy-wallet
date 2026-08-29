import type {
	ActiveUserTransaction,
	ActiveUserTransactionRef,
	ActiveUserTransactionStatus
} from '$declarations/backend/backend.did';
import {
	CKERC20_HELPER_CONTRACT_SIGNATURE,
	CKETH_HELPER_CONTRACT_SIGNATURE
} from '$env/networks/networks.cketh.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BTC_MAINNET_TOKEN, BTC_REGTEST_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { tokenAddressToHex } from '$eth/utils/token.utils';
import { utxoTxIdToString } from '$icp/utils/btc.utils';
import { CHAIN_FUSION_EXTERNAL_REF_KEYS } from '$lib/types/chain-fusion-swap';
import { SwapProvider } from '$lib/types/swap';
import {
	buildChainFusionSwapTrackingMetadata,
	chainFusionBtcMintOutcomeError,
	chainFusionBtcMintOutcomeToStatus,
	chainFusionBtcWithdrawalStatusError,
	chainFusionMintOutcomeError,
	chainFusionMintOutcomeToStatus,
	chainFusionWithdrawalStatusError,
	isChainFusionActiveUserTransaction,
	isChainFusionBtcMintDirection,
	isChainFusionBtcWithdrawalDirection,
	isChainFusionEthWithdrawalDirection,
	isChainFusionMintDirection,
	isSameUtxoTxid,
	toChainFusionBtcMintOutcome,
	toChainFusionBtcWithdrawalLearnedRefs,
	toChainFusionBtcWithdrawalStatus,
	toChainFusionData,
	toChainFusionDepositLogTopics,
	toChainFusionDisplayRefs,
	toChainFusionExternalRefs,
	toChainFusionExternalRefsMap,
	toChainFusionWithdrawalLearnedRefs,
	toChainFusionWithdrawalStatus,
	type ChainFusionBtcMintOutcome,
	type ChainFusionMintOutcome
} from '$lib/utils/chain-fusion-swap-active-tx.utils';
import { mockUtxo } from '$tests/mocks/btc.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import type { CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';
import { encodePrincipalToEthAddress, type CkEthMinterDid } from '@icp-sdk/canisters/cketh';
import { Principal } from '@icp-sdk/core/principal';

const CKETH_LEDGER = 'ss2fx-dyaaa-aaaar-qacoq-cai';

// The transaction the ckBTC minter sends on the user's behalf, in the internal byte
// order the minter reports it in.
const MINTER_TXID = Uint8Array.from([4, 5, 6]);

const ckEthToken = {
	...mockValidIcCkToken,
	symbol: 'ckETH',
	ledgerCanisterId: CKETH_LEDGER,
	twinToken: ETHEREUM_TOKEN
};

const toTx = ({
	external_refs = [],
	error = [],
	data
}: {
	external_refs?: ActiveUserTransactionRef[];
	error?: [] | [string];
	data: ActiveUserTransaction['data'];
}): ActiveUserTransaction => ({
	id: 'tx-id',
	status: { Pending: null },
	data,
	progress_step: [],
	external_refs,
	created_at_ns: 1n,
	updated_at_ns: 1n,
	error
});

const chainFusionTx = (
	rest: Omit<Parameters<typeof toTx>[0], 'data'> = {}
): ActiveUserTransaction =>
	toTx({
		data: {
			ChainFusion: {
				direction: { CkEthToEth: null },
				source_token: { Icrc: Principal.fromText(CKETH_LEDGER) },
				dest_token: { EvmNative: 1n },
				amount: 1_000n
			}
		},
		...rest
	});

describe('chain-fusion-swap-active-tx.utils', () => {
	describe('isChainFusionActiveUserTransaction', () => {
		it('should match a ChainFusion row', () => {
			expect(isChainFusionActiveUserTransaction(chainFusionTx())).toBeTruthy();
		});

		it('should not match another provider', () => {
			expect(
				isChainFusionActiveUserTransaction(
					toTx({
						data: {
							NearIntents: {
								source_token: { EvmNative: 1n },
								dest_token: { EvmNative: 1n },
								amount: 1n
							}
						}
					})
				)
			).toBeFalsy();
		});
	});

	describe('direction predicates', () => {
		it('should classify the two mint directions', () => {
			expect(isChainFusionMintDirection({ EthToCkEth: null })).toBeTruthy();
			expect(isChainFusionMintDirection({ Erc20ToCkErc20: null })).toBeTruthy();

			expect(isChainFusionMintDirection({ CkEthToEth: null })).toBeFalsy();
			expect(isChainFusionMintDirection({ BtcToCkBtc: null })).toBeFalsy();
		});

		it('should classify the two Ethereum-family withdrawal directions', () => {
			expect(isChainFusionEthWithdrawalDirection({ CkEthToEth: null })).toBeTruthy();
			expect(isChainFusionEthWithdrawalDirection({ CkErc20ToErc20: null })).toBeTruthy();
		});

		// `CkBtcToBtc` is a withdrawal too, but of a different minter — routing it to
		// `retrieve_eth_status` would be nonsense.
		it('should exclude ckBTC → BTC from the Ethereum withdrawal family', () => {
			expect(isChainFusionEthWithdrawalDirection({ CkBtcToBtc: null })).toBeFalsy();
			expect(isChainFusionMintDirection({ CkBtcToBtc: null })).toBeFalsy();
		});

		// The mutating branch — it must not be reachable from any other direction.
		it('should classify the ckBTC mint direction alone', () => {
			expect(isChainFusionBtcMintDirection({ BtcToCkBtc: null })).toBeTruthy();

			expect(isChainFusionBtcMintDirection({ CkBtcToBtc: null })).toBeFalsy();
			expect(isChainFusionBtcMintDirection({ EthToCkEth: null })).toBeFalsy();
		});

		it('should classify the ckBTC withdrawal direction alone', () => {
			expect(isChainFusionBtcWithdrawalDirection({ CkBtcToBtc: null })).toBeTruthy();

			expect(isChainFusionBtcWithdrawalDirection({ BtcToCkBtc: null })).toBeFalsy();
			expect(isChainFusionBtcWithdrawalDirection({ CkEthToEth: null })).toBeFalsy();
		});
	});

	describe('toChainFusionData', () => {
		it('should build the variant with the direction and the immutable trio', () => {
			expect(
				toChainFusionData({
					direction: { CkEthToEth: null },
					sourceToken: ckEthToken,
					destinationToken: ETHEREUM_TOKEN,
					amount: 5_000n
				})
			).toStrictEqual({
				ChainFusion: {
					direction: { CkEthToEth: null },
					source_token: { Icrc: Principal.fromText(CKETH_LEDGER) },
					dest_token: { EvmNative: 1n },
					amount: 5_000n
				}
			});
		});

		it('should map an ERC20 source by contract address and chain id', () => {
			expect(
				toChainFusionData({
					direction: { Erc20ToCkErc20: null },
					sourceToken: USDC_TOKEN,
					destinationToken: ckEthToken,
					amount: 1n
				})
			).toStrictEqual(
				expect.objectContaining({
					ChainFusion: expect.objectContaining({
						source_token: { Erc20: [USDC_TOKEN.address, 1n] }
					})
				})
			);
		});

		// The mapper is shared, so an unmappable token must degrade to "do not track"
		// rather than throw at the point of no return.
		it('should return undefined when a token has no backend TokenId', () => {
			expect(
				toChainFusionData({
					direction: { BtcToCkBtc: null },
					sourceToken: BTC_REGTEST_TOKEN,
					destinationToken: ckEthToken,
					amount: 1n
				})
			).toBeUndefined();
		});

		it('should map a Bitcoin mainnet source, which does have a variant', () => {
			expect(
				toChainFusionData({
					direction: { BtcToCkBtc: null },
					sourceToken: BTC_MAINNET_TOKEN,
					destinationToken: ckEthToken,
					amount: 1n
				})
			).toStrictEqual(
				expect.objectContaining({
					ChainFusion: expect.objectContaining({ source_token: { BtcNativeMainnet: null } })
				})
			);
		});
	});

	describe('external refs round-trip', () => {
		it('should drop empty and undefined values and sort by key', () => {
			expect(
				toChainFusionExternalRefs({
					[CHAIN_FUSION_EXTERNAL_REF_KEYS.MINTER_CANISTER_ID]: 'minter',
					[CHAIN_FUSION_EXTERNAL_REF_KEYS.AMOUNT]: '1',
					[CHAIN_FUSION_EXTERNAL_REF_KEYS.CKETH_BLOCK_INDEX]: '',
					[CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_TX_HASH]: undefined
				})
			).toStrictEqual([
				{ key: 'amount', value: '1' },
				{ key: 'chain_fusion_minter_id', value: 'minter' }
			]);
		});

		it('should round-trip through the keyed map', () => {
			const refs = {
				[CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_TX_HASH]: '0xabc',
				[CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_NUMBER]: '42'
			};

			expect(toChainFusionExternalRefsMap(toChainFusionExternalRefs(refs))).toStrictEqual(refs);
		});

		// The backend caps a row at 16 refs; the widest Phase A row must stay under it.
		it('should keep every key within the backend length limit', () => {
			Object.values(CHAIN_FUSION_EXTERNAL_REF_KEYS).forEach((key) => {
				expect(key.length).toBeLessThanOrEqual(32);
			});
		});
	});

	describe('toChainFusionDisplayRefs', () => {
		it('should snapshot the fields the row is rendered from', () => {
			expect(
				toChainFusionDisplayRefs({
					sourceToken: ckEthToken,
					destinationToken: ETHEREUM_TOKEN,
					amount: '1.5',
					usdSourceValue: '4500'
				})
			).toStrictEqual({
				amount: '1.5',
				usd_source_value: '4500',
				source_token_symbol: 'ckETH',
				source_network_symbol: ckEthToken.network.name,
				destination_token_symbol: ETHEREUM_TOKEN.symbol,
				destination_network_symbol: ETHEREUM_TOKEN.network.name
			});
		});

		it('should omit the USD value when it is unknown', () => {
			expect(
				toChainFusionDisplayRefs({
					sourceToken: ckEthToken,
					destinationToken: ETHEREUM_TOKEN,
					amount: '1'
				})
			).not.toHaveProperty('usd_source_value');
		});
	});

	describe('toChainFusionWithdrawalStatus', () => {
		it('should succeed on a finalized successful transaction', () => {
			expect(
				toChainFusionWithdrawalStatus({
					TxFinalized: { Success: { transaction_hash: '0xabc', effective_transaction_fee: [] } }
				})
			).toStrictEqual({ Succeeded: null });
		});

		it('should fail on a reimbursement, which is what a failed withdrawal looks like', () => {
			expect(
				toChainFusionWithdrawalStatus({
					TxFinalized: {
						Reimbursed: {
							transaction_hash: '0xabc',
							reimbursed_amount: 1n,
							reimbursed_in_block: 2n
						}
					}
				})
			).toStrictEqual({ Failed: null });

			expect(
				toChainFusionWithdrawalStatus({
					TxFinalized: { PendingReimbursement: { transaction_hash: '0xabc' } }
				})
			).toStrictEqual({ Failed: null });
		});

		it.each<{ name: string; status: CkEthMinterDid.RetrieveEthStatus }>([
			{ name: 'TxSent', status: { TxSent: { transaction_hash: '0xabc' } } },
			{ name: 'TxCreated', status: { TxCreated: null } },
			{ name: 'Pending', status: { Pending: null } }
		])('should keep the row executing on $name', ({ status }) => {
			expect(toChainFusionWithdrawalStatus(status)).toStrictEqual({ Executing: null });
		});

		// The window between the ledger burn and the minter indexing it reads as
		// `NotFound`. Terminalizing there would wrongly fail nearly every withdrawal,
		// irreversibly.
		it('should no-op on NotFound rather than fail', () => {
			expect(toChainFusionWithdrawalStatus({ NotFound: null })).toBeUndefined();
		});
	});

	describe('chainFusionWithdrawalStatusError', () => {
		it('should describe a reimbursed withdrawal', () => {
			expect(
				chainFusionWithdrawalStatusError({
					TxFinalized: { PendingReimbursement: { transaction_hash: '0xabc' } }
				})
			).toBeDefined();
		});

		it('should carry no error for a success or an in-flight status', () => {
			expect(
				chainFusionWithdrawalStatusError({
					TxFinalized: { Success: { transaction_hash: '0xabc', effective_transaction_fee: [] } }
				})
			).toBeUndefined();

			expect(chainFusionWithdrawalStatusError({ NotFound: null })).toBeUndefined();
		});
	});

	describe('toChainFusionWithdrawalLearnedRefs', () => {
		it.each<{ name: string; status: CkEthMinterDid.RetrieveEthStatus; hash: string }>([
			{ name: 'TxSent', status: { TxSent: { transaction_hash: '0xsent' } }, hash: '0xsent' },
			{
				name: 'TxFinalized Success',
				status: {
					TxFinalized: { Success: { transaction_hash: '0xok', effective_transaction_fee: [] } }
				},
				hash: '0xok'
			},
			{
				name: 'TxFinalized Reimbursed',
				status: {
					TxFinalized: {
						Reimbursed: {
							transaction_hash: '0xrefund',
							reimbursed_amount: 1n,
							reimbursed_in_block: 2n
						}
					}
				},
				hash: '0xrefund'
			},
			{
				name: 'TxFinalized PendingReimbursement',
				status: { TxFinalized: { PendingReimbursement: { transaction_hash: '0xpending' } } },
				hash: '0xpending'
			}
		])('should learn the minter transaction hash from $name', ({ status, hash }) => {
			expect(toChainFusionWithdrawalLearnedRefs(status)).toStrictEqual({
				chain_fusion_eth_tx: hash
			});
		});

		it('should learn nothing before the minter has created a transaction', () => {
			expect(toChainFusionWithdrawalLearnedRefs({ Pending: null })).toStrictEqual({});
			expect(toChainFusionWithdrawalLearnedRefs({ NotFound: null })).toStrictEqual({});
		});
	});

	describe('chainFusionMintOutcomeToStatus', () => {
		it.each<{ outcome: ChainFusionMintOutcome; expected: ActiveUserTransactionStatus }>([
			{ outcome: 'deposited', expected: { Succeeded: null } },
			{ outcome: 'reverted', expected: { Failed: null } },
			{ outcome: 'notDeposited', expected: { Failed: null } },
			{ outcome: 'notMined', expected: { Executing: null } },
			{ outcome: 'notObserved', expected: { Executing: null } }
		])('should map $outcome', ({ outcome, expected }) => {
			expect(chainFusionMintOutcomeToStatus(outcome)).toStrictEqual(expected);
		});

		it('should describe only the failing outcomes', () => {
			expect(chainFusionMintOutcomeError('reverted')).toBeDefined();
			expect(chainFusionMintOutcomeError('notDeposited')).toBeDefined();

			expect(chainFusionMintOutcomeError('deposited')).toBeUndefined();
			expect(chainFusionMintOutcomeError('notObserved')).toBeUndefined();
		});
	});

	describe('toChainFusionDepositLogTopics', () => {
		it('should filter ckETH deposits on the signature and the principal', () => {
			expect(toChainFusionDepositLogTopics({ principal: mockPrincipal })).toStrictEqual([
				CKETH_HELPER_CONTRACT_SIGNATURE,
				null,
				encodePrincipalToEthAddress(mockPrincipal)
			]);
		});

		it('should insert the ERC20 contract for a ckERC20 deposit', () => {
			expect(
				toChainFusionDepositLogTopics({
					principal: mockPrincipal,
					erc20ContractAddress: USDC_TOKEN.address
				})
			).toStrictEqual([
				CKERC20_HELPER_CONTRACT_SIGNATURE,
				tokenAddressToHex(USDC_TOKEN.address),
				null,
				encodePrincipalToEthAddress(mockPrincipal)
			]);
		});
	});

	describe('toChainFusionBtcWithdrawalStatus', () => {
		it('should succeed once the Bitcoin transaction is confirmed', () => {
			expect(toChainFusionBtcWithdrawalStatus({ Confirmed: { txid: MINTER_TXID } })).toStrictEqual({
				Succeeded: null
			});
		});

		it.each<{ name: string; status: CkBtcMinterDid.RetrieveBtcStatusV2 }>([
			{ name: 'AmountTooLow', status: { AmountTooLow: null } },
			{
				name: 'Reimbursed',
				status: {
					Reimbursed: {
						account: { owner: mockPrincipal, subaccount: [] },
						mint_block_index: 1n,
						amount: 2n,
						reason: { CallFailed: null }
					}
				}
			},
			// Terminal on purpose: the verdict is settled, and unlike the transaction list —
			// which keeps the burn pending until the refund lands — this row is about whether
			// the conversion is over.
			{
				name: 'WillReimburse',
				status: {
					WillReimburse: {
						account: { owner: mockPrincipal, subaccount: [] },
						amount: 2n,
						reason: { CallFailed: null }
					}
				}
			}
		])('should fail on $name', ({ status }) => {
			expect(toChainFusionBtcWithdrawalStatus(status)).toStrictEqual({ Failed: null });
		});

		it.each<{ name: string; status: CkBtcMinterDid.RetrieveBtcStatusV2 }>([
			{ name: 'Pending', status: { Pending: null } },
			{ name: 'Signing', status: { Signing: null } },
			{ name: 'Sending', status: { Sending: { txid: MINTER_TXID } } },
			{ name: 'Submitted', status: { Submitted: { txid: MINTER_TXID } } }
		])('should keep the row executing on $name', ({ status }) => {
			expect(toChainFusionBtcWithdrawalStatus(status)).toStrictEqual({ Executing: null });
		});

		// The ckBTC counterpart of the ckETH minter's `NotFound`: reported both before the
		// minter indexes the burn and after it prunes an old one.
		it('should no-op on Unknown rather than fail', () => {
			expect(toChainFusionBtcWithdrawalStatus({ Unknown: null })).toBeUndefined();
		});
	});

	describe('chainFusionBtcWithdrawalStatusError', () => {
		it('should describe a reimbursed and a too-low withdrawal', () => {
			expect(
				chainFusionBtcWithdrawalStatusError({
					WillReimburse: {
						account: { owner: mockPrincipal, subaccount: [] },
						amount: 2n,
						reason: { CallFailed: null }
					}
				})
			).toBeDefined();

			expect(chainFusionBtcWithdrawalStatusError({ AmountTooLow: null })).toBeDefined();
		});

		it('should carry no error for a success or an in-flight status', () => {
			expect(
				chainFusionBtcWithdrawalStatusError({ Confirmed: { txid: MINTER_TXID } })
			).toBeUndefined();

			expect(chainFusionBtcWithdrawalStatusError({ Unknown: null })).toBeUndefined();
		});
	});

	describe('toChainFusionBtcWithdrawalLearnedRefs', () => {
		it.each<{ name: string; status: CkBtcMinterDid.RetrieveBtcStatusV2 }>([
			{ name: 'Submitted', status: { Submitted: { txid: MINTER_TXID } } },
			{ name: 'Sending', status: { Sending: { txid: MINTER_TXID } } },
			{ name: 'Confirmed', status: { Confirmed: { txid: MINTER_TXID } } }
		])('should learn the payout transaction id from $name', ({ status }) => {
			expect(toChainFusionBtcWithdrawalLearnedRefs(status)).toStrictEqual({
				chain_fusion_btc_tx: utxoTxIdToString(MINTER_TXID)
			});
		});

		it('should learn nothing before the minter has built a transaction', () => {
			expect(toChainFusionBtcWithdrawalLearnedRefs({ Pending: null })).toStrictEqual({});
			expect(toChainFusionBtcWithdrawalLearnedRefs({ Unknown: null })).toStrictEqual({});
		});
	});

	describe('chainFusionBtcMintOutcomeToStatus', () => {
		it.each<{ outcome: ChainFusionBtcMintOutcome; expected: ActiveUserTransactionStatus }>([
			{ outcome: 'minted', expected: { Succeeded: null } },
			{ outcome: 'rejected', expected: { Failed: null } },
			{ outcome: 'unseen', expected: { Executing: null } },
			{ outcome: 'awaitingConfirmations', expected: { Executing: null } },
			{ outcome: 'awaitingMint', expected: { Executing: null } }
		])('should map $outcome', ({ outcome, expected }) => {
			expect(chainFusionBtcMintOutcomeToStatus(outcome)).toStrictEqual(expected);
		});

		it('should describe only the failing outcome', () => {
			expect(chainFusionBtcMintOutcomeError('rejected')).toBeDefined();

			expect(chainFusionBtcMintOutcomeError('minted')).toBeUndefined();
			expect(chainFusionBtcMintOutcomeError('awaitingMint')).toBeUndefined();
		});
	});

	describe('toChainFusionBtcMintOutcome', () => {
		const otherUtxo: CkBtcMinterDid.Utxo = {
			...mockUtxo,
			outpoint: { txid: Uint8Array.from([9, 9, 9]), vout: 0 }
		};

		const txid = utxoTxIdToString(mockUtxo.outpoint.txid);

		it('should read a mint of this deposit', () => {
			expect(
				toChainFusionBtcMintOutcome({
					utxosStatuses: [
						{ Minted: { minted_amount: 1n, block_index: 2n, utxo: mockUtxo } },
						{ Tainted: otherUtxo }
					],
					txid
				})
			).toBe('minted');
		});

		it.each<{ name: string; utxosStatuses: CkBtcMinterDid.UtxoStatus[] }>([
			{ name: 'Tainted', utxosStatuses: [{ Tainted: mockUtxo }] },
			{ name: 'ValueTooSmall', utxosStatuses: [{ ValueTooSmall: mockUtxo }] }
		])('should reject a $name deposit', ({ utxosStatuses }) => {
			expect(toChainFusionBtcMintOutcome({ utxosStatuses, txid })).toBe('rejected');
		});

		// The check passed but the ledger was unavailable, so a later `update_balance` mints
		// it — not a verdict either way.
		it('should keep a checked deposit waiting for its mint', () => {
			expect(toChainFusionBtcMintOutcome({ utxosStatuses: [{ Checked: mockUtxo }], txid })).toBe(
				'awaitingMint'
			);
		});

		it('should read no verdict from a response about other deposits', () => {
			expect(
				toChainFusionBtcMintOutcome({
					utxosStatuses: [{ Minted: { minted_amount: 1n, block_index: 2n, utxo: otherUtxo } }],
					txid
				})
			).toBeUndefined();

			expect(toChainFusionBtcMintOutcome({ utxosStatuses: [], txid })).toBeUndefined();
		});

		// The row snapshots the human-readable txid the signer returned; the minter reports
		// the internal byte order.
		it('should match the row txid against the reversed on-chain one', () => {
			expect(isSameUtxoTxid({ utxo: mockUtxo, txid: txid.toUpperCase() })).toBeTruthy();
			expect(isSameUtxoTxid({ utxo: otherUtxo, txid })).toBeFalsy();
		});
	});

	describe('buildChainFusionSwapTrackingMetadata', () => {
		it('should resolve the metadata entirely from the row snapshot', () => {
			const tx = chainFusionTx({
				external_refs: toChainFusionExternalRefs({
					...toChainFusionDisplayRefs({
						sourceToken: ckEthToken,
						destinationToken: ETHEREUM_TOKEN,
						amount: '2',
						usdSourceValue: '6000'
					})
				})
			});

			expect(buildChainFusionSwapTrackingMetadata({ tx })).toStrictEqual({
				sourceToken: 'ckETH',
				destinationToken: ETHEREUM_TOKEN.symbol,
				dApp: SwapProvider.CHAIN_FUSION,
				tokenAmount: '2',
				usdSourceValue: '6000',
				sourceNetwork: ckEthToken.network.name,
				destinationNetwork: ETHEREUM_TOKEN.network.name
			});
		});

		it('should include the stored error and tolerate missing refs', () => {
			expect(
				buildChainFusionSwapTrackingMetadata({ tx: chainFusionTx({ error: ['boom'] }) })
			).toStrictEqual({
				sourceToken: '',
				destinationToken: '',
				dApp: SwapProvider.CHAIN_FUSION,
				tokenAmount: '',
				usdSourceValue: '',
				sourceNetwork: '',
				destinationNetwork: '',
				error: 'boom'
			});
		});
	});
});
