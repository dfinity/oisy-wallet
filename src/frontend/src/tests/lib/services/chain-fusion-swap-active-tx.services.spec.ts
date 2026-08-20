import type {
	ActiveUserTransaction,
	ActiveUserTransactionStatus,
	ChainFusionDirection
} from '$declarations/backend/backend.did';
import { CKERC20_HELPER_CONTRACT_SIGNATURE } from '$env/networks/networks.cketh.env';
import { infuraCkETHProviders } from '$eth/providers/infura-cketh.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import { tokenAddressToHex } from '$eth/utils/token.utils';
import { minterInfo } from '$icp-eth/api/cketh-minter.api';
import { retrieveEthStatus } from '$icp/api/cketh-minter.api';
import { applyActiveUserTransactionPollUpdate } from '$lib/services/active-user-transactions.services';
import {
	pollChainFusionActiveUserTransactions,
	resetChainFusionMissingDepositLogObservations
} from '$lib/services/chain-fusion-swap-active-tx.services';
import { CHAIN_FUSION_EXTERNAL_REF_KEYS } from '$lib/types/chain-fusion-swap';
import { toChainFusionExternalRefs } from '$lib/utils/chain-fusion-swap-active-tx.utils';
import { mockCkMinterInfo } from '$tests/mocks/ck-minter.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { encodePrincipalToEthAddress } from '@icp-sdk/canisters/cketh';
import { Principal } from '@icp-sdk/core/principal';

vi.mock('$icp/api/cketh-minter.api', () => ({
	retrieveEthStatus: vi.fn()
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

const CKETH_LEDGER = 'ss2fx-dyaaa-aaaar-qacoq-cai';
const MINTER_CANISTER_ID = 'sv3dd-oaaaa-aaaar-qacoa-cai';

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

		vi.mocked(infuraProviders).mockReturnValue({
			getTransactionReceipt
		} as unknown as ReturnType<typeof infuraProviders>);

		vi.mocked(infuraCkETHProviders).mockReturnValue({ getLogs } as unknown as ReturnType<
			typeof infuraCkETHProviders
		>);
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

		// PR 10's arm. Until then a ckBTC row cannot exist, and must certainly not be
		// asked of the ckETH minter.
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
