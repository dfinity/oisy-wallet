import type {
	ActiveUserTransaction,
	ActiveUserTransactionStatus,
	ChainFusionDirection
} from '$declarations/backend/backend.did';
import { CKERC20_HELPER_CONTRACT_SIGNATURE } from '$env/networks/networks.cketh.env';
import type * as ckBtcEnv from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import type * as ckEnv from '$env/tokens/tokens-icrc/tokens.icrc.ck.env';
import { infuraCkETHProviders } from '$eth/providers/infura-cketh.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import { tokenAddressToHex } from '$eth/utils/token.utils';
import { minterInfo } from '$icp-eth/api/cketh-minter.api';
import { getUtxosQuery } from '$icp/api/bitcoin.api';
import {
	minterInfo as ckBtcMinterInfo,
	getKnownUtxos,
	updateBalance,
	withdrawalStatuses
} from '$icp/api/ckbtc-minter.api';
import { retrieveEthStatus } from '$icp/api/cketh-minter.api';
import { getTransactions } from '$icp/api/icrc-index-ng.api';
import type { IcCkInterface } from '$icp/types/ic-token';
import { utxoTxIdToString } from '$icp/utils/btc.utils';
import { CHAIN_FUSION_UPDATE_BALANCE_INTERVAL_MILLIS, ZERO } from '$lib/constants/app.constants';
import { applyActiveUserTransactionPollUpdate } from '$lib/services/active-user-transactions.services';
import {
	pollChainFusionActiveUserTransactions,
	resetChainFusionMissingDepositLogObservations,
	resetChainFusionUpdateBalanceThrottle
} from '$lib/services/chain-fusion-swap-active-tx.services';
import { CHAIN_FUSION_EXTERNAL_REF_KEYS } from '$lib/types/chain-fusion-swap';
import { toChainFusionExternalRefs } from '$lib/utils/chain-fusion-swap-active-tx.utils';
import { mockUtxo } from '$tests/mocks/btc.mock';
import { mockCkMinterInfo } from '$tests/mocks/ck-minter.mock';
import { mockCkBtcMinterInfo } from '$tests/mocks/ckbtc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { MinterNoNewUtxosError, type CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';
import { encodePrincipalToEthAddress } from '@icp-sdk/canisters/cketh';
import type { IcrcIndexDid } from '@icp-sdk/canisters/ledger/icrc';
import { Cbor } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

vi.mock('$icp/api/cketh-minter.api', () => ({
	retrieveEthStatus: vi.fn()
}));

vi.mock('$icp/api/ckbtc-minter.api', () => ({
	withdrawalStatuses: vi.fn(),
	updateBalance: vi.fn(),
	getKnownUtxos: vi.fn(),
	minterInfo: vi.fn()
}));

vi.mock('$icp/api/bitcoin.api', () => ({
	getUtxosQuery: vi.fn()
}));

vi.mock('$icp/api/icrc-index-ng.api', () => ({
	getTransactions: vi.fn()
}));

// `BITCOIN_CANISTER_IDS` is empty under `DFX_NETWORK=local`, which would make every case
// take the "Bitcoin canister not deployed" path and skip the confirmation gate entirely.
vi.mock('$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env', async (importOriginal) => ({
	...(await importOriginal<typeof ckBtcEnv>()),
	BITCOIN_CANISTER_IDS: { [MINTER_CANISTER_ID]: BITCOIN_CANISTER_ID }
}));

// The ck token data carries no mainnet ckBTC entry under `DFX_NETWORK=local`, which would
// leave the minter without a ledger index to settle the double-absent deposit against.
// Typed rather than cast, so a change to the required `IcCkInterface` fields breaks here
// instead of letting the lookup read a shape the env can no longer produce.
vi.mock('$env/tokens/tokens-icrc/tokens.icrc.ck.env', async (importOriginal) => ({
	...(await importOriginal<typeof ckEnv>()),
	PUBLIC_ICRC_TOKENS: [
		{
			ledgerCanisterId: IC_CKBTC_LEDGER,
			indexCanisterId: INDEX_CANISTER_ID,
			minterCanisterId: MINTER_CANISTER_ID
		} satisfies IcCkInterface
	]
}));

vi.mock('$icp-eth/api/cketh-minter.api', () => ({
	minterInfo: vi.fn()
}));

vi.mock('$eth/providers/infura.providers', () => ({
	infuraProviders: vi.fn()
}));

vi.mock('$eth/providers/infura-cketh.providers', () => ({
	infuraCkETHProviders: vi.fn()
}));

vi.mock('$lib/services/active-user-transactions.services', () => ({
	applyActiveUserTransactionPollUpdate: vi.fn()
}));

// Hoisted: the canister-id factories above run before the module body.
const { MINTER_CANISTER_ID, BITCOIN_CANISTER_ID, INDEX_CANISTER_ID, IC_CKBTC_LEDGER } = vi.hoisted(
	() => ({
		MINTER_CANISTER_ID: 'sv3dd-oaaaa-aaaar-qacoa-cai',
		BITCOIN_CANISTER_ID: 'ghsi2-tqaaa-aaaan-aaaca-cai',
		INDEX_CANISTER_ID: 'n5wcd-faaaa-aaaar-qaaea-cai',
		IC_CKBTC_LEDGER: 'mxzaz-hqaaa-aaaar-qaada-cai'
	})
);

const CKETH_LEDGER = 'ss2fx-dyaaa-aaaar-qacoq-cai';

// `mockUtxo` sits at height 1 000; the ckBTC minter's floor is six confirmations.
const DEPOSIT_TXID = utxoTxIdToString(mockUtxo.outpoint.txid);
const DEPOSIT_ADDRESS = 'bc1qminterdepositaddressforthischainfusionswap0000';
const CONFIRMED_TIP_HEIGHT = mockUtxo.height + mockCkBtcMinterInfo.min_confirmations - 1;

const OTHER_UTXO: CkBtcMinterDid.Utxo = {
	...mockUtxo,
	outpoint: { txid: Uint8Array.from([9, 9, 9]), vout: 0 }
};

const DEPOSIT_TX_HASH = '0xDEADBEEF';
const HELPER_CONTRACT = '0x7574eB42cA208A4f6960ECCAfDF186D627dCC175';
const DEPOSIT_BLOCK = 1_000;

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const getTransactionReceipt = vi.fn();
const getLogs = vi.fn();

const toTx = ({
	id = 'tx-id',
	status = { Pending: null },
	direction,
	source_token = { Icrc: Principal.fromText(CKETH_LEDGER) },
	refs
}: {
	id?: string;
	status?: ActiveUserTransactionStatus;
	direction: ChainFusionDirection;
	source_token?: ActiveUserTransaction['data'] extends never ? never : { Icrc: Principal } | object;
	refs: Partial<Record<string, string>>;
}): ActiveUserTransaction =>
	({
		id,
		status,
		data: {
			ChainFusion: {
				direction,
				source_token,
				dest_token: { EvmNative: 1n },
				amount: 1_000n
			}
		},
		progress_step: [],
		external_refs: toChainFusionExternalRefs(refs),
		created_at_ns: 1n,
		updated_at_ns: 1n,
		error: []
	}) as ActiveUserTransaction;

const withdrawalTx = (refs?: Partial<Record<string, string>>) =>
	toTx({
		direction: { CkEthToEth: null },
		refs: {
			[CHAIN_FUSION_EXTERNAL_REF_KEYS.MINTER_CANISTER_ID]: MINTER_CANISTER_ID,
			[CHAIN_FUSION_EXTERNAL_REF_KEYS.CKETH_BLOCK_INDEX]: '7',
			...refs
		}
	});

const mintTx = ({ id, refs }: { id?: string; refs?: Partial<Record<string, string>> } = {}) =>
	toTx({
		id,
		direction: { EthToCkEth: null },
		source_token: { EvmNative: 1n },
		refs: {
			[CHAIN_FUSION_EXTERNAL_REF_KEYS.MINTER_CANISTER_ID]: MINTER_CANISTER_ID,
			[CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_TX_HASH]: DEPOSIT_TX_HASH,
			[CHAIN_FUSION_EXTERNAL_REF_KEYS.HELPER_CONTRACT_ADDRESS]: HELPER_CONTRACT,
			...refs
		}
	});

const btcWithdrawalTx = (refs?: Partial<Record<string, string>>) =>
	toTx({
		direction: { CkBtcToBtc: null },
		source_token: { Icrc: Principal.fromText(IC_CKBTC_LEDGER) },
		refs: {
			[CHAIN_FUSION_EXTERNAL_REF_KEYS.MINTER_CANISTER_ID]: MINTER_CANISTER_ID,
			[CHAIN_FUSION_EXTERNAL_REF_KEYS.RETRIEVE_BTC_BLOCK_INDEX]: '42',
			...refs
		}
	});

const btcMintTx = ({ id, refs }: { id?: string; refs?: Partial<Record<string, string>> } = {}) =>
	toTx({
		id,
		direction: { BtcToCkBtc: null },
		source_token: { BtcNativeMainnet: null },
		refs: {
			[CHAIN_FUSION_EXTERNAL_REF_KEYS.MINTER_CANISTER_ID]: MINTER_CANISTER_ID,
			[CHAIN_FUSION_EXTERNAL_REF_KEYS.BTC_TXID]: DEPOSIT_TXID,
			[CHAIN_FUSION_EXTERNAL_REF_KEYS.BTC_DEPOSIT_ADDRESS]: DEPOSIT_ADDRESS,
			...refs
		}
	});

const setDepositUtxos = ({
	utxos = [mockUtxo],
	tipHeight = CONFIRMED_TIP_HEIGHT
}: { utxos?: CkBtcMinterDid.Utxo[]; tipHeight?: number } = {}) =>
	vi.mocked(getUtxosQuery).mockResolvedValue({
		utxos,
		tip_height: tipHeight,
		tip_block_hash: Uint8Array.from([]),
		next_page: []
	});

// One page of the account's mint history as the index canister returns it. `utxos` name
// the deposits the minter credited, encoded exactly as its `Convert` mint memo does.
// Mints are stamped after the row's creation (`created_at_ns: 1n`) unless a test dates
// them earlier to exercise the walk's cutoff; `hasMore` leaves older history behind the
// page instead of ending it at the account's oldest transaction.
const ledgerMintsPage = ({
	utxos,
	firstId = 100n,
	timestamp = 1n,
	hasMore = false
}: {
	utxos: CkBtcMinterDid.Utxo[];
	firstId?: bigint;
	timestamp?: bigint;
	hasMore?: boolean;
}): IcrcIndexDid.GetTransactions =>
	({
		balance: ZERO,
		oldest_tx_id: utxos.length === 0 ? [] : [hasMore ? ZERO : firstId - BigInt(utxos.length - 1)],
		transactions: utxos.map(({ outpoint: { txid, vout } }, index) => ({
			id: firstId - BigInt(index),
			transaction: {
				kind: 'mint',
				mint: [{ memo: [new Uint8Array(Cbor.encode([0, [txid, vout, 100]]))] }],
				burn: [],
				transfer: [],
				approve: [],
				timestamp
			}
		}))
	}) as unknown as IcrcIndexDid.GetTransactions;

const setLedgerMints = (utxos: CkBtcMinterDid.Utxo[]) =>
	vi.mocked(getTransactions).mockResolvedValue(ledgerMintsPage({ utxos }));

const setLastObservedBlock = (blockNumber: number | undefined) =>
	vi.mocked(minterInfo).mockResolvedValue({
		...mockCkMinterInfo,
		last_observed_block_number: toNullable(
			blockNumber === undefined ? undefined : BigInt(blockNumber)
		)
	});

const poll = (transactions: ActiveUserTransaction[]) =>
	pollChainFusionActiveUserTransactions({ identity: mockIdentity, transactions });

const lastUpdate = () => vi.mocked(applyActiveUserTransactionPollUpdate).mock.lastCall?.[0].update;

describe('chain-fusion-swap-active-tx.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetChainFusionMissingDepositLogObservations();
		resetChainFusionUpdateBalanceThrottle();

		vi.mocked(infuraProviders).mockReturnValue({
			getTransactionReceipt
		} as unknown as ReturnType<typeof infuraProviders>);

		vi.mocked(infuraCkETHProviders).mockReturnValue({ getLogs } as unknown as ReturnType<
			typeof infuraCkETHProviders
		>);

		vi.mocked(ckBtcMinterInfo).mockResolvedValue(mockCkBtcMinterInfo);
		vi.mocked(getKnownUtxos).mockResolvedValue([]);
		vi.mocked(updateBalance).mockResolvedValue([]);
		setDepositUtxos();
		setLedgerMints([]);
	});

	it('should do nothing for an empty batch', async () => {
		await poll([]);

		expect(retrieveEthStatus).not.toHaveBeenCalled();
		expect(minterInfo).not.toHaveBeenCalled();
	});

	describe('withdrawal directions', () => {
		it('should advance a finalized withdrawal to Succeeded and learn its transaction hash', async () => {
			vi.mocked(retrieveEthStatus).mockResolvedValue({
				TxFinalized: { Success: { transaction_hash: '0xok', effective_transaction_fee: [] } }
			});

			await poll([withdrawalTx()]);

			expect(retrieveEthStatus).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				minterCanisterId: MINTER_CANISTER_ID,
				blockIndex: 7n
			});

			expect(lastUpdate()).toStrictEqual({
				status: { Succeeded: null },
				externalRefs: expect.arrayContaining([{ key: 'chain_fusion_eth_tx', value: '0xok' }])
			});
		});

		it('should fail a reimbursed withdrawal with an error message', async () => {
			vi.mocked(retrieveEthStatus).mockResolvedValue({
				TxFinalized: {
					Reimbursed: {
						transaction_hash: '0xrefund',
						reimbursed_amount: 1n,
						reimbursed_in_block: 2n
					}
				}
			});

			await poll([withdrawalTx()]);

			expect(lastUpdate()).toStrictEqual(
				expect.objectContaining({ status: { Failed: null }, error: expect.any(String) })
			);
		});

		// Acceptance criterion 17: the window between the burn and the minter indexing
		// it must never terminalize the row.
		it('should leave a NotFound withdrawal untouched', async () => {
			vi.mocked(retrieveEthStatus).mockResolvedValue({ NotFound: null });

			await poll([withdrawalTx()]);

			expect(applyActiveUserTransactionPollUpdate).not.toHaveBeenCalled();
		});

		it('should not regress a row whose status is already ahead of the candidate', async () => {
			vi.mocked(retrieveEthStatus).mockResolvedValue({ TxSent: { transaction_hash: '0xsent' } });

			const tx = withdrawalTx();

			await poll([
				{
					...tx,
					status: { Succeeded: null },
					external_refs: toChainFusionExternalRefs({
						[CHAIN_FUSION_EXTERNAL_REF_KEYS.MINTER_CANISTER_ID]: MINTER_CANISTER_ID,
						[CHAIN_FUSION_EXTERNAL_REF_KEYS.CKETH_BLOCK_INDEX]: '7',
						[CHAIN_FUSION_EXTERNAL_REF_KEYS.WITHDRAWAL_TX_HASH]: '0xsent'
					})
				}
			]);

			// Neither a status nor a ref changed, so there is nothing to write.
			expect(applyActiveUserTransactionPollUpdate).not.toHaveBeenCalled();
		});

		it('should persist a newly learned hash even when the status does not advance', async () => {
			vi.mocked(retrieveEthStatus).mockResolvedValue({ TxSent: { transaction_hash: '0xsent' } });

			await poll([{ ...withdrawalTx(), status: { Executing: null } }]);

			expect(lastUpdate()).toStrictEqual({
				externalRefs: expect.arrayContaining([{ key: 'chain_fusion_eth_tx', value: '0xsent' }])
			});
		});

		it('should skip a row missing its burn index', async () => {
			await poll([
				toTx({
					direction: { CkEthToEth: null },
					refs: { [CHAIN_FUSION_EXTERNAL_REF_KEYS.MINTER_CANISTER_ID]: MINTER_CANISTER_ID }
				})
			]);

			expect(retrieveEthStatus).not.toHaveBeenCalled();
		});

		it('should leave the row pending when the minter query throws', async () => {
			vi.mocked(retrieveEthStatus).mockRejectedValue(new Error('replica unavailable'));

			await expect(poll([withdrawalTx()])).resolves.toBeUndefined();

			expect(applyActiveUserTransactionPollUpdate).not.toHaveBeenCalled();
		});

		// A withdrawal of a different minter: asking the ckETH minter about it would be
		// nonsense, and the ckETH burn index a legacy row might carry is not its poll key.
		it('should not route a ckBTC withdrawal to the ckETH minter', async () => {
			await poll([
				toTx({
					direction: { CkBtcToBtc: null },
					refs: {
						[CHAIN_FUSION_EXTERNAL_REF_KEYS.MINTER_CANISTER_ID]: MINTER_CANISTER_ID,
						[CHAIN_FUSION_EXTERNAL_REF_KEYS.CKETH_BLOCK_INDEX]: '7'
					}
				})
			]);

			expect(retrieveEthStatus).not.toHaveBeenCalled();
			expect(applyActiveUserTransactionPollUpdate).not.toHaveBeenCalled();
		});
	});

	describe('ckBTC withdrawal direction', () => {
		it('should succeed a confirmed withdrawal and learn its payout transaction', async () => {
			vi.mocked(withdrawalStatuses).mockResolvedValue([
				{ id: 41n, status: { Pending: null } },
				{ id: 42n, status: { Confirmed: { txid: mockUtxo.outpoint.txid } } }
			]);

			await poll([btcWithdrawalTx()]);

			expect(withdrawalStatuses).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				minterCanisterId: MINTER_CANISTER_ID,
				certified: false
			});

			expect(lastUpdate()).toStrictEqual({
				status: { Succeeded: null },
				externalRefs: expect.arrayContaining([{ key: 'chain_fusion_btc_tx', value: DEPOSIT_TXID }])
			});
		});

		it('should fail a reimbursed withdrawal with an error message', async () => {
			vi.mocked(withdrawalStatuses).mockResolvedValue([
				{
					id: 42n,
					status: {
						WillReimburse: {
							account: { owner: mockIdentity.getPrincipal(), subaccount: [] },
							amount: 1n,
							reason: { CallFailed: null }
						}
					}
				}
			]);

			await poll([btcWithdrawalTx()]);

			expect(lastUpdate()).toStrictEqual(
				expect.objectContaining({ status: { Failed: null }, error: expect.any(String) })
			);
		});

		// The ckBTC counterpart of the ckETH minter's `NotFound`, and equally irreversible if
		// it were mistaken for a failure.
		it.each<{ name: string; status: CkBtcMinterDid.RetrieveBtcStatusV2 | undefined }>([
			{ name: 'Unknown', status: { Unknown: null } },
			{ name: 'an unset status', status: undefined }
		])('should leave a withdrawal reported as $name untouched', async ({ status }) => {
			vi.mocked(withdrawalStatuses).mockResolvedValue([{ id: 42n, status }]);

			await poll([btcWithdrawalTx()]);

			expect(applyActiveUserTransactionPollUpdate).not.toHaveBeenCalled();
		});

		it('should leave a withdrawal the minter does not list untouched', async () => {
			vi.mocked(withdrawalStatuses).mockResolvedValue([{ id: 7n, status: { Pending: null } }]);

			await poll([btcWithdrawalTx()]);

			expect(applyActiveUserTransactionPollUpdate).not.toHaveBeenCalled();
		});

		// The minter answers per account, so a batch costs one round-trip however many
		// ckBTC withdrawals it holds.
		it('should share one status round-trip across the batch', async () => {
			vi.mocked(withdrawalStatuses).mockResolvedValue([
				{ id: 42n, status: { Submitted: { txid: mockUtxo.outpoint.txid } } }
			]);

			await poll([btcWithdrawalTx(), btcWithdrawalTx()]);

			expect(withdrawalStatuses).toHaveBeenCalledOnce();
			expect(applyActiveUserTransactionPollUpdate).toHaveBeenCalledTimes(2);
		});

		it('should skip a row missing its withdrawal index', async () => {
			await poll([
				toTx({
					direction: { CkBtcToBtc: null },
					refs: { [CHAIN_FUSION_EXTERNAL_REF_KEYS.MINTER_CANISTER_ID]: MINTER_CANISTER_ID }
				})
			]);

			expect(withdrawalStatuses).not.toHaveBeenCalled();
		});

		it('should leave the row pending when the minter query throws', async () => {
			vi.mocked(withdrawalStatuses).mockRejectedValue(new Error('replica unavailable'));

			await expect(poll([btcWithdrawalTx()])).resolves.toBeUndefined();

			expect(applyActiveUserTransactionPollUpdate).not.toHaveBeenCalled();
		});
	});

	describe('ckBTC mint direction', () => {
		// The minter has taken these exact coins off the deposit address — by an earlier call
		// of ours, by the app-wide worker, or in another session.
		it('should succeed a deposit the minter has already consumed, without minting again', async () => {
			vi.mocked(getKnownUtxos).mockResolvedValue([OTHER_UTXO, mockUtxo]);

			await poll([btcMintTx()]);

			expect(updateBalance).not.toHaveBeenCalled();
			expect(getUtxosQuery).not.toHaveBeenCalled();
			expect(lastUpdate()).toStrictEqual({ status: { Succeeded: null } });
		});

		it('should keep a deposit the Bitcoin canister has not indexed executing', async () => {
			setDepositUtxos({ utxos: [OTHER_UTXO] });

			await poll([btcMintTx()]);

			expect(updateBalance).not.toHaveBeenCalled();
			expect(lastUpdate()).toStrictEqual({ status: { Executing: null } });
		});

		// The minter spends a deposit once it has minted it, which erases it from both the
		// known UTXOs and the deposit address — the same shape as a deposit that was never
		// indexed. Without the ledger the row would sit Executing for good.
		it('should succeed a deposit the ledger shows as minted after the minter spent it', async () => {
			setDepositUtxos({ utxos: [OTHER_UTXO] });
			setLedgerMints([mockUtxo]);

			await poll([btcMintTx()]);

			expect(getTransactions).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ identity: mockIdentity, indexCanisterId: INDEX_CANISTER_ID })
			);
			expect(updateBalance).not.toHaveBeenCalled();
			expect(lastUpdate()).toStrictEqual({ status: { Succeeded: null } });
		});

		it('should keep a deposit executing when the ledger only shows unrelated mints', async () => {
			setDepositUtxos({ utxos: [OTHER_UTXO] });
			setLedgerMints([OTHER_UTXO]);

			await poll([btcMintTx()]);

			expect(lastUpdate()).toStrictEqual({ status: { Executing: null } });
		});

		// `get_account_transactions` pages; a mint deeper than the first page must still
		// settle the row.
		it('should find the mint beyond the first page of the account history', async () => {
			setDepositUtxos({ utxos: [OTHER_UTXO] });
			vi.mocked(getTransactions)
				.mockResolvedValueOnce(ledgerMintsPage({ utxos: [OTHER_UTXO], hasMore: true }))
				.mockResolvedValueOnce(ledgerMintsPage({ utxos: [mockUtxo], firstId: 50n }));

			await poll([btcMintTx()]);

			expect(getTransactions).toHaveBeenCalledTimes(2);
			expect(getTransactions).toHaveBeenNthCalledWith(2, expect.objectContaining({ start: 100n }));
			expect(lastUpdate()).toStrictEqual({ status: { Succeeded: null } });
		});

		// The walk is bounded by the row's creation time: a mint cannot predate the row that
		// initiated the deposit, so older pages are never fetched however deep the history goes.
		it('should stop walking the account history behind the row creation time', async () => {
			setDepositUtxos({ utxos: [OTHER_UTXO] });
			vi.mocked(getTransactions).mockResolvedValue(
				ledgerMintsPage({ utxos: [OTHER_UTXO], timestamp: ZERO, hasMore: true })
			);

			await poll([btcMintTx()]);

			expect(getTransactions).toHaveBeenCalledOnce();
			expect(lastUpdate()).toStrictEqual({ status: { Executing: null } });
		});

		// `get_utxos` paginates for addresses with many UTXOs; a deposit beyond the first
		// page must not read as unseen, which would skip the update call for good.
		it('should find a deposit beyond the first page of the address UTXO set', async () => {
			const pageToken = Uint8Array.from([1, 2, 3]);

			vi.mocked(getUtxosQuery)
				.mockResolvedValueOnce({
					utxos: [OTHER_UTXO],
					tip_height: CONFIRMED_TIP_HEIGHT,
					tip_block_hash: Uint8Array.from([]),
					next_page: [pageToken]
				})
				.mockResolvedValueOnce({
					utxos: [mockUtxo],
					tip_height: CONFIRMED_TIP_HEIGHT,
					tip_block_hash: Uint8Array.from([]),
					next_page: []
				});
			vi.mocked(updateBalance).mockResolvedValue([
				{ Minted: { minted_amount: 900n, block_index: 3n, utxo: mockUtxo } }
			]);

			await poll([btcMintTx()]);

			expect(getUtxosQuery).toHaveBeenCalledTimes(2);
			expect(getUtxosQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: pageToken }));
			expect(lastUpdate()).toStrictEqual({ status: { Succeeded: null } });
		});

		// Below the minter's floor `update_balance` could only answer `NoNewUtxos`, so the
		// update call is skipped outright.
		it('should not ask the minter to mint before the confirmation floor', async () => {
			setDepositUtxos({ tipHeight: CONFIRMED_TIP_HEIGHT - 1 });

			await poll([btcMintTx()]);

			expect(getUtxosQuery).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				bitcoinCanisterId: BITCOIN_CANISTER_ID,
				network: 'mainnet',
				address: DEPOSIT_ADDRESS
			});
			expect(updateBalance).not.toHaveBeenCalled();
			expect(lastUpdate()).toStrictEqual({ status: { Executing: null } });
		});

		// Acceptance criterion 24: a row resumed in a later session is minted by the poller
		// itself, from `external_refs` alone.
		it('should mint a confirmed deposit and succeed on the minter response', async () => {
			vi.mocked(updateBalance).mockResolvedValue([
				{ Minted: { minted_amount: 900n, block_index: 3n, utxo: mockUtxo } }
			]);

			await poll([btcMintTx()]);

			expect(updateBalance).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				minterCanisterId: MINTER_CANISTER_ID
			});
			expect(lastUpdate()).toStrictEqual({ status: { Succeeded: null } });
		});

		it('should fail a deposit the Bitcoin checker rejected', async () => {
			vi.mocked(updateBalance).mockResolvedValue([{ Tainted: mockUtxo }]);

			await poll([btcMintTx()]);

			expect(lastUpdate()).toStrictEqual(
				expect.objectContaining({ status: { Failed: null }, error: expect.any(String) })
			);
		});

		it('should keep a checked deposit executing until the mint lands', async () => {
			vi.mocked(updateBalance).mockResolvedValue([{ Checked: mockUtxo }]);

			await poll([btcMintTx()]);

			expect(lastUpdate()).toStrictEqual({ status: { Executing: null } });
		});

		it('should read no verdict from a response about another deposit', async () => {
			vi.mocked(updateBalance).mockResolvedValue([
				{ Minted: { minted_amount: 900n, block_index: 3n, utxo: OTHER_UTXO } }
			]);

			await poll([btcMintTx()]);

			expect(lastUpdate()).toStrictEqual({ status: { Executing: null } });
		});

		// Acceptance criterion 26. `NoNewUtxos` is also what the app-wide worker leaves
		// behind when it got there first.
		it.each<{ name: string; err: Error }>([
			{
				name: 'NoNewUtxos',
				err: new MinterNoNewUtxosError({ pending_utxos: [[]], required_confirmations: 6 })
			},
			{ name: 'a transient failure', err: new Error('minter overloaded') }
		])('should leave the row pending when update_balance fails with $name', async ({ err }) => {
			vi.mocked(updateBalance).mockRejectedValue(err);

			await poll([btcMintTx()]);

			expect(lastUpdate()).toStrictEqual({ status: { Executing: null } });
		});

		// Acceptance criterion 25.
		it('should ask the minter to mint at most once per throttle window per row', async () => {
			vi.useFakeTimers();

			try {
				await poll([btcMintTx()]);
				await poll([btcMintTx()]);

				expect(updateBalance).toHaveBeenCalledOnce();

				vi.advanceTimersByTime(CHAIN_FUSION_UPDATE_BALANCE_INTERVAL_MILLIS);

				await poll([btcMintTx()]);

				expect(updateBalance).toHaveBeenCalledTimes(2);
			} finally {
				vi.useRealTimers();
			}
		});

		it('should throttle each row on its own', async () => {
			await poll([btcMintTx({ id: 'first' }), btcMintTx({ id: 'second' })]);

			expect(updateBalance).toHaveBeenCalledTimes(2);
		});

		// Parity with OneSec's poller, which drops its per-row throttle entry once the
		// forwarding is done: a terminal verdict clears the entry, so the throttle never
		// holds back a row whose id resurfaces and never accumulates settled conversions.
		it('should clear the throttle for a row the minter settled', async () => {
			vi.mocked(updateBalance).mockResolvedValue([
				{ Minted: { minted_amount: 900n, block_index: 3n, utxo: mockUtxo } }
			]);

			await poll([btcMintTx()]);
			await poll([btcMintTx()]);

			expect(updateBalance).toHaveBeenCalledTimes(2);
		});

		it.each<{ name: string; refs: Partial<Record<string, string>> }>([
			{ name: 'deposit transaction', refs: { [CHAIN_FUSION_EXTERNAL_REF_KEYS.BTC_TXID]: '' } },
			{
				name: 'deposit address',
				refs: { [CHAIN_FUSION_EXTERNAL_REF_KEYS.BTC_DEPOSIT_ADDRESS]: '' }
			},
			{
				name: 'minter',
				refs: { [CHAIN_FUSION_EXTERNAL_REF_KEYS.MINTER_CANISTER_ID]: '' }
			}
		])('should skip a row missing its $name', async ({ refs }) => {
			await poll([btcMintTx({ refs })]);

			expect(getKnownUtxos).not.toHaveBeenCalled();
			expect(updateBalance).not.toHaveBeenCalled();
			expect(applyActiveUserTransactionPollUpdate).not.toHaveBeenCalled();
		});

		it('should leave the row pending when the known-UTXO query throws', async () => {
			vi.mocked(getKnownUtxos).mockRejectedValue(new Error('replica unavailable'));

			await expect(poll([btcMintTx()])).resolves.toBeUndefined();

			expect(updateBalance).not.toHaveBeenCalled();
			expect(applyActiveUserTransactionPollUpdate).not.toHaveBeenCalled();
		});
	});

	describe('mint directions', () => {
		it('should keep a deposit still in the mempool executing, without asking the minter', async () => {
			getTransactionReceipt.mockResolvedValue(null);

			await poll([mintTx()]);

			expect(minterInfo).not.toHaveBeenCalled();
			expect(lastUpdate()).toStrictEqual({ status: { Executing: null } });
		});

		it('should fail a deposit whose transaction reverted', async () => {
			getTransactionReceipt.mockResolvedValue({ status: 0, blockNumber: DEPOSIT_BLOCK });

			await poll([mintTx()]);

			expect(lastUpdate()).toStrictEqual(
				expect.objectContaining({ status: { Failed: null }, error: expect.any(String) })
			);
		});

		it('should learn the deposit block from the receipt and keep it for later ticks', async () => {
			getTransactionReceipt.mockResolvedValue({ status: 1, blockNumber: DEPOSIT_BLOCK });
			setLastObservedBlock(DEPOSIT_BLOCK - 1);

			await poll([mintTx()]);

			expect(lastUpdate()).toStrictEqual({
				status: { Executing: null },
				externalRefs: expect.arrayContaining([
					{ key: 'chain_fusion_deposit_block', value: `${DEPOSIT_BLOCK}` }
				])
			});

			// Nothing to look for yet: the minter has not reached the block.
			expect(getLogs).not.toHaveBeenCalled();
		});

		it('should not re-read the receipt once the deposit block is known', async () => {
			setLastObservedBlock(DEPOSIT_BLOCK - 1);

			await poll([
				mintTx({
					refs: {
						[CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_NUMBER]: `${DEPOSIT_BLOCK}`
					}
				})
			]);

			expect(getTransactionReceipt).not.toHaveBeenCalled();
		});

		it('should succeed once the minter has passed the block and the deposit log is there', async () => {
			setLastObservedBlock(DEPOSIT_BLOCK + 1);
			// Lower-cased by the node, as Infura returns it — the comparison must not care.
			getLogs.mockResolvedValue([{ transactionHash: DEPOSIT_TX_HASH.toLowerCase() }]);

			await poll([
				mintTx({
					refs: {
						[CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_NUMBER]: `${DEPOSIT_BLOCK}`
					}
				})
			]);

			// Bounded to the single block the deposit mined in, so an abandoned row costs
			// the same query as a fresh one.
			expect(getLogs).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					contract: { address: HELPER_CONTRACT },
					startBlock: DEPOSIT_BLOCK,
					endBlock: DEPOSIT_BLOCK
				})
			);

			expect(lastUpdate()).toStrictEqual({ status: { Succeeded: null } });
		});

		it('should keep the row executing until the minter has scanned strictly past the block', async () => {
			// Equality is still in flight: the Convert flow's virtual row survives while
			// `getLogs(startBlock = last_observed)` — an inclusive bound — returns the log.
			setLastObservedBlock(DEPOSIT_BLOCK);

			await poll([
				mintTx({
					refs: {
						[CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_NUMBER]: `${DEPOSIT_BLOCK}`
					}
				})
			]);

			expect(getLogs).not.toHaveBeenCalled();
			expect(lastUpdate()).toStrictEqual({ status: { Executing: null } });
		});

		it('should keep the row executing when the minter reports no scan position', async () => {
			setLastObservedBlock(undefined);

			await poll([
				mintTx({
					refs: {
						[CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_NUMBER]: `${DEPOSIT_BLOCK}`
					}
				})
			]);

			expect(lastUpdate()).toStrictEqual({ status: { Executing: null } });
		});

		// A missing log is also what a transiently lagging node returns, and `Failed` is
		// irreversible — so it takes two consecutive observations.
		it('should require two consecutive missing-log observations before failing', async () => {
			setLastObservedBlock(DEPOSIT_BLOCK + 1);
			getLogs.mockResolvedValue([]);

			const tx = mintTx({
				refs: { [CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_NUMBER]: `${DEPOSIT_BLOCK}` }
			});

			await poll([tx]);

			expect(lastUpdate()).toStrictEqual({ status: { Executing: null } });

			await poll([tx]);

			expect(lastUpdate()).toStrictEqual(
				expect.objectContaining({ status: { Failed: null }, error: expect.any(String) })
			);
		});

		it('should forget the observation once the log shows up after all', async () => {
			setLastObservedBlock(DEPOSIT_BLOCK + 1);

			const tx = mintTx({
				refs: { [CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_NUMBER]: `${DEPOSIT_BLOCK}` }
			});

			getLogs.mockResolvedValue([]);
			await poll([tx]);

			getLogs.mockResolvedValue([{ transactionHash: DEPOSIT_TX_HASH }]);
			await poll([tx]);

			expect(lastUpdate()).toStrictEqual({ status: { Succeeded: null } });

			// The counter was cleared, so a later miss starts from scratch.
			getLogs.mockResolvedValue([]);
			await poll([tx]);

			expect(lastUpdate()).toStrictEqual({ status: { Executing: null } });
		});

		it('should read the minter once per tick for rows sharing it', async () => {
			setLastObservedBlock(DEPOSIT_BLOCK - 1);

			const refs = {
				[CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_NUMBER]: `${DEPOSIT_BLOCK}`
			};

			await poll([mintTx({ id: 'a', refs }), mintTx({ id: 'b', refs })]);

			expect(minterInfo).toHaveBeenCalledOnce();
		});

		it('should skip a row missing the helper contract it deposited to', async () => {
			await poll([
				toTx({
					direction: { EthToCkEth: null },
					source_token: { EvmNative: 1n },
					refs: {
						[CHAIN_FUSION_EXTERNAL_REF_KEYS.MINTER_CANISTER_ID]: MINTER_CANISTER_ID,
						[CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_TX_HASH]: DEPOSIT_TX_HASH
					}
				})
			]);

			expect(getTransactionReceipt).not.toHaveBeenCalled();
			expect(applyActiveUserTransactionPollUpdate).not.toHaveBeenCalled();
		});

		it('should filter an ERC20 deposit on its contract address', async () => {
			setLastObservedBlock(DEPOSIT_BLOCK + 1);
			getLogs.mockResolvedValue([{ transactionHash: DEPOSIT_TX_HASH }]);

			await poll([
				toTx({
					direction: { Erc20ToCkErc20: null },
					source_token: { Erc20: [USDC_ADDRESS, 1n] },
					refs: {
						[CHAIN_FUSION_EXTERNAL_REF_KEYS.MINTER_CANISTER_ID]: MINTER_CANISTER_ID,
						[CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_TX_HASH]: DEPOSIT_TX_HASH,
						[CHAIN_FUSION_EXTERNAL_REF_KEYS.HELPER_CONTRACT_ADDRESS]: HELPER_CONTRACT,
						[CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_NUMBER]: `${DEPOSIT_BLOCK}`
					}
				})
			]);

			// Four topics for ckERC20 against three for ckETH: the ERC20 contract sits in
			// the extra slot, so a deposit of a *different* ERC20 cannot match this row.
			expect(getLogs).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					topics: [
						CKERC20_HELPER_CONTRACT_SIGNATURE,
						tokenAddressToHex(USDC_ADDRESS),
						null,
						encodePrincipalToEthAddress(mockIdentity.getPrincipal())
					]
				})
			);
		});

		it('should leave the row pending when the log query throws', async () => {
			setLastObservedBlock(DEPOSIT_BLOCK + 1);
			getLogs.mockRejectedValue(new Error('infura down'));

			await expect(
				poll([
					mintTx({
						refs: { [CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_NUMBER]: `${DEPOSIT_BLOCK}` }
					})
				])
			).resolves.toBeUndefined();

			expect(applyActiveUserTransactionPollUpdate).not.toHaveBeenCalled();
		});
	});

	it('should not let one failing row poison the batch', async () => {
		vi.mocked(retrieveEthStatus)
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValueOnce({
				TxFinalized: { Success: { transaction_hash: '0xok', effective_transaction_fee: [] } }
			});

		await poll([withdrawalTx(), withdrawalTx()]);

		expect(applyActiveUserTransactionPollUpdate).toHaveBeenCalledOnce();
	});
});
