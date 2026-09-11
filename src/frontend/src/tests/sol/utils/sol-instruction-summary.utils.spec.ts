import { WSOL_TOKEN } from '$env/tokens/tokens-spl/tokens.wsol.env';
import { ZERO } from '$lib/constants/app.constants';
import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
import { mapSolInstructionSummaries } from '$sol/utils/sol-instruction-summary.utils';
import { asSolParsedRpcInstructionOrSelf } from '$sol/utils/sol-instructions.utils';
import { MOCK_SOL_INSTRUCTIONS } from '$tests/mocks/sol-instructions.mock';
import { mockAtaAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { getTransferSolInstruction } from '@solana-program/system';
import {
	AuthorityType,
	getApproveCheckedInstruction,
	getApproveInstruction,
	getBurnInstruction,
	getFreezeAccountInstruction,
	getMintToInstruction,
	getRevokeInstruction,
	getSetAuthorityInstruction,
	getTransferCheckedInstruction
} from '@solana-program/token';
import { address as toAddress } from '@solana/kit';

describe('sol-instruction-summary.utils', () => {
	describe('mapSolInstructionSummaries', () => {
		const kinds = (views: SolInstructionSummary[]): string[] => views.map(({ kind }) => kind);

		describe('an SPL send that opens the recipient an account', () => {
			const views = () => mapSolInstructionSummaries(MOCK_SOL_INSTRUCTIONS.SPL_SEND_WITH_ATA);

			// The four instructions an associated token account creation takes are one thing to a
			// user, and the only part of it they care about is what it costs them.
			it('should collapse the account creation into a single row carrying its rent', () => {
				const [creation] = views();

				expect(creation.kind).toBe('createTokenAccount');
				expect(creation.rent).toBe(2_108_880n);
			});

			it('should report the transfer with the mint and decimals the instruction states', () => {
				const [, transfer] = views();

				expect(transfer.kind).toBe('send');
				expect(transfer.amount).toBe(5_000_000n);
				expect(transfer.decimals).toBe(6);
				expect(transfer.tokenAddress).toBe('pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn');
			});

			it('should drop the plumbing the creation needed', () => {
				expect(kinds(views())).toStrictEqual(['createTokenAccount', 'send']);
			});
		});

		describe('a routed swap', () => {
			const views = () => mapSolInstructionSummaries(MOCK_SOL_INSTRUCTIONS.DFLOW_SWAP);

			it('should recognise a System transfer into a wrapped SOL account as wrapping', () => {
				const wrap = views().find(({ kind }) => kind === 'wrap');

				expect(wrap?.amount).toBe(5_000_000n);
			});

			// Closing a wrapped SOL account is how the swap gives the user their SOL back. Reported
			// as an ordinary account close it would read as housekeeping.
			it('should recognise closing that account as unwrapping', () => {
				const unwrap = views().find(({ kind }) => kind === 'unwrap');

				expect(unwrap?.tokenAddress).toBe(WSOL_TOKEN.address);
			});

			// A confirmed transaction comes back from the RPC naming the program `programId`; an
			// unsigned message carries kit instructions, which name the same thing
			// `programAddress`. Reading only the first leaves every simulated route unnamed.
			it('should name the route program however the instruction spells the field', () => {
				const { instructions, ...rest } = MOCK_SOL_INSTRUCTIONS.DFLOW_SWAP;

				const asKitInstructions = instructions.map(({ programId, ...instruction }) => ({
					...instruction,
					programAddress: programId
				}));

				const route = mapSolInstructionSummaries({
					...rest,
					instructions: asKitInstructions
				}).find(({ kind }) => kind === 'route');

				expect(route?.program).toBe('DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH');
			});

			it('should gather consecutive legs under the route that produced them', () => {
				const route = views().find(({ kind }) => kind === 'route');

				expect(route?.children?.length).toBeGreaterThan(1);
				expect(route?.program).toBe('DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH');
				expect(
					route?.children?.every(({ kind }) => kind === 'send' || kind === 'receive')
				).toBeTruthy();
			});

			it('should keep far fewer rows than the transaction has instructions', () => {
				const { instructions, innerInstructions } = MOCK_SOL_INSTRUCTIONS.DFLOW_SWAP;

				const total =
					instructions.length +
					innerInstructions.reduce((acc, { instructions: inner }) => acc + inner.length, 0);

				expect(total).toBe(24);
				expect(views().length).toBeLessThan(total / 2);
			});
		});

		describe('a swap split across several pools', () => {
			const views = () => mapSolInstructionSummaries(MOCK_SOL_INSTRUCTIONS.ORCA_SPLIT_SWAP);

			// Three pools, each a top-level instruction with its own pair of legs. Merging them
			// would claim a single route the transaction never took.
			it('should keep one route per top-level instruction', () => {
				const routes = views().filter(({ kind }) => kind === 'route');

				expect(routes).toHaveLength(3);
				expect(routes.every(({ children }) => children?.length === 2)).toBeTruthy();
			});

			it('should leave the standalone SOL transfer outside any route', () => {
				const [first] = views();

				expect(first.kind).toBe('send');
				expect(first.amount).toBe(415_968n);
				expect(first.tokenAddress).toBeUndefined();
			});
		});

		describe('a transaction the user is not part of', () => {
			it('should produce nothing at all', () => {
				expect(mapSolInstructionSummaries(MOCK_SOL_INSTRUCTIONS.THIRD_PARTY)).toStrictEqual([]);
			});
		});

		describe('deciding whether a transfer is the user’s', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const ata = 'ownerTokenAccount111111111111111111111111111';
			const other = 'stranger1111111111111111111111111111111111';

			const transfer = (info: object) => ({
				instructions: [
					{ program: 'spl-token', programId: 'Tokenkeg', parsed: { type: 'transfer', info } }
				],
				ownedAddresses: [owner, ata]
			});

			// An SPL transfer names token accounts, not wallets. The authority is the only field
			// that says whose transfer it is.
			it('should read a transfer as outgoing when the user signs for it', () => {
				const [view] = mapSolInstructionSummaries(
					transfer({ source: ata, destination: other, authority: owner, amount: '10' })
				);

				expect(view.kind).toBe('send');
				expect(view.counterparty).toBe(other);
				expect(view.own).toBeFalsy();
			});

			it('should read a transfer into an account of ours as incoming', () => {
				const [view] = mapSolInstructionSummaries(
					transfer({ source: other, destination: ata, authority: other, amount: '10' })
				);

				expect(view.kind).toBe('receive');
				expect(view.counterparty).toBe(other);
			});

			// Our own account is the destination of every swap, since a swap is how the user
			// receives. Unmarked it would read as paying a stranger.
			it('should mark a counterparty that is one of our own accounts', () => {
				const [view] = mapSolInstructionSummaries(
					transfer({ source: ata, destination: owner, authority: owner, amount: '10' })
				);

				expect(view.own).toBeTruthy();
			});

			it('should ignore a transfer between two accounts that are not ours', () => {
				expect(
					mapSolInstructionSummaries(
						transfer({ source: other, destination: other, authority: other, amount: '10' })
					)
				).toStrictEqual([]);
			});
		});

		// A plain incoming SOL payment is a system transfer whose destination is the wallet itself;
		// reporting only the outgoing side would leave every received payment invisible.
		it('should read a system transfer into the wallet as a receive', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';

			const [view] = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'transfer',
							info: { source: 'sender', destination: owner, lamports: 7 }
						}
					}
				],
				ownedAddresses: [owner]
			});

			expect(view.kind).toBe('receive');
			expect(view.counterparty).toBe('sender');
		});

		// The live RPC client decodes lamports as bigint; dropping them demoted a plain SOL tip
		// into the nothing-to-say fallback on every real transaction.
		it('should read a bigint lamports amount', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';

			const [view] = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'transfer',
							info: { source: owner, destination: 'tip', lamports: 415_968n }
						}
					}
				],
				ownedAddresses: [owner]
			});

			expect(view.kind).toBe('send');
			expect(view.amount).toBe(415_968n);
		});

		// Closing hands the destination the account's whole balance. For a wrapped SOL account that
		// is the rent-exempt reserve plus the SOL that was wrapped, which is why the amount is worth
		// stating rather than calling it rent.
		it('should say what a closed account hands back', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const ata = 'ataAddress111111111111111111111111111111111';

			const [view] = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'closeAccount',
							info: { account: ata, destination: owner, owner }
						}
					}
				],
				ownedAddresses: [owner, ata],
				accountLamports: { [ata]: 2_039_280n }
			});

			expect(view.kind).toBe('closeTokenAccount');
			expect(view.returned).toBe(2_039_280n);
		});

		it('should count the wrapped SOL in what an unwrap hands back', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const ata = 'wsolAta11111111111111111111111111111111111';

			const [view] = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'closeAccount',
							info: { account: ata, destination: owner, owner }
						}
					}
				],
				ownedAddresses: [owner, ata],
				addressToToken: { [ata]: WSOL_TOKEN.address },
				// rent plus the wrapped SOL still sitting in the account
				accountLamports: { [ata]: 2_039_280n + 5_000_000n }
			});

			expect(view.kind).toBe('unwrap');
			expect(view.returned).toBe(7_039_280n);
		});

		// Opened and closed inside one transaction, the account held nothing before the run: its
		// balance going in says zero, and the rent it was funded with is what comes back.
		it('should return the rent of an account the same transaction opened', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const ata = 'ataAddress111111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-associated-token-account',
						programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
						parsed: { type: 'create', info: { account: ata, wallet: owner, mint: 'mint' } }
					},
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'createAccount',
							info: { newAccount: ata, source: owner, lamports: 2_039_280 }
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: ata, destination: owner, owner } }
					}
				],
				ownedAddresses: [owner, ata],
				// The account did not exist before the run, so its balance going in is zero.
				accountLamports: { [ata]: ZERO }
			});

			const close = views.find(({ kind }) => kind === 'closeTokenAccount');

			expect(close?.returned).toBe(2_039_280n);
		});

		// The wrap is a System transfer into the account after its creation, so the close hands back
		// the rent and the wrapped SOL together. Counting only the rent understates it by the wrap.
		it('should count a wrap into what an unwrap hands back', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const ata = 'wsolAta11111111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-associated-token-account',
						programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
						parsed: {
							type: 'create',
							info: { account: ata, wallet: owner, mint: WSOL_TOKEN.address }
						}
					},
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'createAccount',
							info: { newAccount: ata, source: owner, lamports: 2_039_280 }
						}
					},
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'transfer',
							info: { source: owner, destination: ata, lamports: 5_000_000 }
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'syncNative', info: { account: ata } }
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: ata, destination: owner, owner } }
					}
				],
				ownedAddresses: [owner, ata],
				accountLamports: { [ata]: ZERO }
			});

			const close = views.find(({ kind }) => kind === 'unwrap');

			expect(close?.returned).toBe(7_039_280n);
		});

		it('should say nothing about the amount when the balance is unknown', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const ata = 'ataAddress111111111111111111111111111111111';

			const [view] = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'closeAccount',
							info: { account: ata, destination: owner, owner }
						}
					}
				],
				ownedAddresses: [owner, ata]
			});

			expect(view.kind).toBe('closeTokenAccount');
			expect(view.returned).toBeUndefined();
		});

		describe('control changes', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const ata = 'ownerTokenAccount111111111111111111111111111';

			it('should report handing an account to somebody else', () => {
				const [view] = mapSolInstructionSummaries({
					instructions: [
						{
							program: 'spl-token',
							programId: 'Tokenkeg',
							parsed: {
								type: 'setAuthority',
								info: { account: ata, authorityType: 'accountOwner', newAuthority: 'somebody' }
							}
						}
					],
					ownedAddresses: [owner, ata]
				});

				expect(view.kind).toBe('setAuthority');
				expect(view.newAuthority).toBe('somebody');
			});

			it('should report an approval with its delegate', () => {
				const [view] = mapSolInstructionSummaries({
					instructions: [
						{
							program: 'spl-token',
							programId: 'Tokenkeg',
							parsed: {
								type: 'approve',
								info: { source: ata, delegate: 'spender', owner, amount: '5' }
							}
						}
					],
					ownedAddresses: [owner, ata]
				});

				expect(view.kind).toBe('approve');
				expect(view.counterparty).toBe('spender');
				expect(view.amount).toBe(5n);
			});
		});

		// A wrapped SOL account is opened and closed inside the same message, so it appears in no
		// balance and no caller can pass it in. Everything paid from it depends on this.
		describe('an account the transaction opens for the user', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const opened = 'openedMidTransaction11111111111111111111111';

			const openThenSpend = {
				instructions: [
					{
						program: 'spl-token',
						programId: 'Tokenkeg',
						parsed: {
							type: 'initializeAccount3',
							info: { account: opened, mint: WSOL_TOKEN.address, owner }
						}
					},
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: { type: 'transfer', info: { source: owner, destination: opened, lamports: 7 } }
					},
					{
						program: 'spl-token',
						programId: 'Tokenkeg',
						parsed: { type: 'closeAccount', info: { account: opened, owner } }
					}
				],
				ownedAddresses: [owner]
			};

			it('should treat it as the user’s own without being told', () => {
				expect(kinds(mapSolInstructionSummaries(openThenSpend))).toStrictEqual(['wrap', 'unwrap']);
			});

			it('should not claim an account opened for somebody else', () => {
				const stranger = {
					...openThenSpend,
					instructions: [
						{
							...openThenSpend.instructions[0],
							parsed: {
								type: 'initializeAccount3',
								info: { account: opened, mint: WSOL_TOKEN.address, owner: 'stranger' }
							}
						},
						...openThenSpend.instructions.slice(1, 2)
					]
				};

				const [view] = mapSolInstructionSummaries(stranger);

				expect(view.kind).toBe('send');
				expect(view.own).toBeFalsy();
			});
		});

		// A WalletConnect request carries its instructions as raw bytes rather than the parsed form
		// the RPC returns. Read on their own they yielded nothing, which left the summary unstated
		// and put "unrecognised" against the commonest transaction on Solana.
		describe('the instructions of an unsigned message', () => {
			const me = 'FzjDPHxrEUUuVMcMSGjNMjPGmXWqoUgqYuP5MunKzKNn';
			const them = '9zsjmwXjZzuKfArqhLDpvcvLKUxLZfCzeMcqhAcPr8Jm';
			const mint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

			const signer = (address: string) => ({ address }) as never;

			// A message delivers kit instructions; the review decodes them before the effects are
			// read. Going straight to the mapper would test a path no caller takes.
			const summariesFromMessage = ({
				instructions,
				...rest
			}: {
				instructions: unknown[];
				ownedAddresses: string[];
				includeUnrecognised?: boolean;
			}): SolInstructionSummary[] =>
				mapSolInstructionSummaries({
					...rest,
					instructions: instructions.map(asSolParsedRpcInstructionOrSelf)
				});

			it('should read a plain SOL transfer as the send it is', () => {
				const [transfer] = summariesFromMessage({
					instructions: [
						getTransferSolInstruction({
							source: signer(me),
							destination: toAddress(them),
							amount: 10_000_000n
						})
					],
					ownedAddresses: [me]
				});

				expect(transfer).toStrictEqual({
					kind: 'send',
					amount: 10_000_000n,
					counterparty: them,
					own: false
				});
			});

			it('should not call a transfer it can read unrecognised', () => {
				expect(
					kinds(
						summariesFromMessage({
							instructions: [
								getTransferSolInstruction({
									source: signer(me),
									destination: toAddress(them),
									amount: 10_000_000n
								})
							],
							ownedAddresses: [me],
							includeUnrecognised: true
						})
					)
				).toStrictEqual(['send']);
			});

			it('should read a checked SPL transfer with its mint and decimals', () => {
				const [transfer] = summariesFromMessage({
					instructions: [
						getTransferCheckedInstruction({
							source: toAddress(mockAtaAddress),
							mint: toAddress(mint),
							destination: toAddress(mockSolAddress2),
							authority: signer(me),
							amount: 5_000_000n,
							decimals: 6
						})
					],
					ownedAddresses: [me]
				});

				expect(transfer?.kind).toBe('send');
				expect(transfer?.amount).toBe(5_000_000n);
				expect(transfer?.decimals).toBe(6);
				expect(transfer?.tokenAddress).toBe(mint);
			});

			// Granting a spender is the instruction behind most drains, so a message that carries one
			// must not read as something the wallet could not make out.
			it('should read an approval with its delegate', () => {
				const [approval] = summariesFromMessage({
					instructions: [
						getApproveInstruction({
							source: toAddress(mockAtaAddress),
							delegate: toAddress(them),
							owner: toAddress(me),
							amount: 5_000_000n
						})
					],
					ownedAddresses: [me, mockAtaAddress]
				});

				expect(approval?.kind).toBe('approve');
				expect(approval?.amount).toBe(5_000_000n);
				expect(approval?.counterparty).toBe(them);
				expect(approval?.account).toBe(mockAtaAddress);
			});

			it('should read a checked approval the same way', () => {
				const [approval] = summariesFromMessage({
					instructions: [
						getApproveCheckedInstruction({
							source: toAddress(mockAtaAddress),
							mint: toAddress(mint),
							delegate: toAddress(them),
							owner: toAddress(me),
							amount: 5_000_000n,
							decimals: 6
						})
					],
					ownedAddresses: [me, mockAtaAddress]
				});

				expect(approval?.kind).toBe('approve');
				expect(approval?.amount).toBe(5_000_000n);
				expect(approval?.counterparty).toBe(them);
			});

			it('should read a revocation', () => {
				const [revocation] = summariesFromMessage({
					instructions: [
						getRevokeInstruction({ source: toAddress(mockAtaAddress), owner: toAddress(me) })
					],
					ownedAddresses: [me, mockAtaAddress]
				});

				expect(revocation?.kind).toBe('revoke');
				expect(revocation?.account).toBe(mockAtaAddress);
			});

			// Handing an account to someone else moves nothing, so no amount and no balance change
			// reports it. Naming the new authority is the only way the review can show it happening.
			it('should read an authority handover with the authority it names', () => {
				const [handover] = summariesFromMessage({
					instructions: [
						getSetAuthorityInstruction({
							owned: toAddress(mockAtaAddress),
							owner: toAddress(me),
							authorityType: AuthorityType.AccountOwner,
							newAuthority: toAddress(them)
						})
					],
					ownedAddresses: [me, mockAtaAddress]
				});

				expect(handover?.kind).toBe('setAuthority');
				expect(handover?.account).toBe(mockAtaAddress);
				expect(handover?.newAuthority).toBe(them);
			});

			// Neither is a transfer, so no counterparty names either and nothing but the instruction
			// says which way the balance went.
			it('should read a burn as the tokens it destroys', () => {
				const [burn] = summariesFromMessage({
					instructions: [
						getBurnInstruction({
							account: toAddress(mockAtaAddress),
							mint: toAddress(mint),
							authority: toAddress(me),
							amount: 7_000_000n
						})
					],
					ownedAddresses: [me, mockAtaAddress]
				});

				expect(burn?.kind).toBe('burn');
				expect(burn?.amount).toBe(7_000_000n);
				expect(burn?.tokenAddress).toBe(mint);
			});

			it('should read a mint as the tokens it creates', () => {
				const [minted] = summariesFromMessage({
					instructions: [
						getMintToInstruction({
							mint: toAddress(mint),
							token: toAddress(mockAtaAddress),
							mintAuthority: toAddress(me),
							amount: 9_000_000n
						})
					],
					ownedAddresses: [me, mockAtaAddress]
				});

				expect(minted?.kind).toBe('mint');
				expect(minted?.amount).toBe(9_000_000n);
			});

			// A frozen account holds exactly what it held, so no balance anywhere reports it.
			it('should read a freeze, which no balance change can show', () => {
				const [frozen] = summariesFromMessage({
					instructions: [
						getFreezeAccountInstruction({
							account: toAddress(mockAtaAddress),
							mint: toAddress(mint),
							owner: toAddress(me)
						})
					],
					ownedAddresses: [me, mockAtaAddress]
				});

				expect(frozen?.kind).toBe('freeze');
				expect(frozen?.account).toBe(mockAtaAddress);
			});

			// The decoders assert on their input, and a signing flow must not be taken down by a
			// variant they do not cover.
			it('should leave an instruction it cannot decode unread rather than throwing', () => {
				expect(() =>
					summariesFromMessage({
						instructions: [
							{
								programAddress: '11111111111111111111111111111111',
								accounts: [],
								data: new Uint8Array([255, 255, 255, 255])
							}
						],
						ownedAddresses: [me]
					})
				).not.toThrow();
			});
		});

		describe('instructions it cannot read', () => {
			it('should ignore an instruction the RPC did not parse', () => {
				expect(
					mapSolInstructionSummaries({
						instructions: [{ programId: 'SomeUnknownProgram', accounts: [], data: 'AQID' }],
						ownedAddresses: ['ownerWa11etAddress1111111111111111111111111']
					})
				).toStrictEqual([]);
			});

			it('should ignore a transaction with no instructions at all', () => {
				expect(mapSolInstructionSummaries({ instructions: [], ownedAddresses: [] })).toStrictEqual(
					[]
				);
			});

			it('should keep a line naming the program when asked to list what it cannot read', () => {
				expect(
					mapSolInstructionSummaries({
						instructions: [{ programId: 'SomeUnknownProgram', accounts: [], data: 'AQID' }],
						ownedAddresses: ['ownerWa11etAddress1111111111111111111111111'],
						includeUnrecognised: true
					})
				).toStrictEqual([{ kind: 'unknown', program: 'SomeUnknownProgram' }]);
			});

			// The regression this exists for. A WalletConnect request carries kit instructions,
			// whose data is raw bytes rather than the parsed form the RPC returns, so not one of
			// them yields an effect. Without a line each, the review listed nothing whatsoever for
			// a transaction the user was being asked to sign.
			it('should list the instructions of an unsigned message, which are never parsed', () => {
				const message = [
					{ programAddress: '11111111111111111111111111111111', accounts: [], data: 'AQID' },
					{
						programAddress: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						accounts: [],
						data: 'BAUG'
					}
				];

				expect(
					mapSolInstructionSummaries({
						instructions: message,
						ownedAddresses: ['ownerWa11etAddress1111111111111111111111111'],
						includeUnrecognised: true
					})
				).toStrictEqual([
					{ kind: 'unknown', program: '11111111111111111111111111111111' },
					{ kind: 'unknown', program: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }
				]);
			});

			// The list is read as the order the run takes, so an instruction that says nothing
			// still holds its place among the ones that do.
			it('should leave the instructions it can read where they were', () => {
				const { instructions, ...rest } = MOCK_SOL_INSTRUCTIONS.SPL_SEND_WITH_ATA;

				expect(
					kinds(
						mapSolInstructionSummaries({
							...rest,
							instructions: [
								...instructions,
								{ programId: 'SomeUnknownProgram', accounts: [], data: 'AQID' }
							],
							includeUnrecognised: true
						})
					)
				).toStrictEqual(['createTokenAccount', 'send', 'unknown']);
			});

			// The review states these as the priority fee it charges for, so calling them
			// unreadable is untrue, and doing it on every transaction that sets a compute budget
			// buries the instructions that moved something under two lines of housekeeping.
			it('should not add a line for a compute budget instruction', () => {
				const withFlag = (
					mock: Parameters<typeof mapSolInstructionSummaries>[0]
				): SolInstructionSummary[] =>
					mapSolInstructionSummaries({ ...mock, includeUnrecognised: true });

				expect(kinds(withFlag(MOCK_SOL_INSTRUCTIONS.DFLOW_SWAP))).toStrictEqual(
					kinds(mapSolInstructionSummaries(MOCK_SOL_INSTRUCTIONS.DFLOW_SWAP))
				);

				expect(kinds(withFlag(MOCK_SOL_INSTRUCTIONS.JUPITER_SWAP))).toStrictEqual(
					kinds(mapSolInstructionSummaries(MOCK_SOL_INSTRUCTIONS.JUPITER_SWAP))
				);
			});

			// The case the flag exists for: a transaction whose every call sits inside programs the
			// wallet cannot read listed nothing whatsoever before.
			it('should list a transaction it could read nothing of', () => {
				expect(kinds(mapSolInstructionSummaries(MOCK_SOL_INSTRUCTIONS.THIRD_PARTY))).toStrictEqual(
					[]
				);

				expect(
					kinds(
						mapSolInstructionSummaries({
							...MOCK_SOL_INSTRUCTIONS.THIRD_PARTY,
							includeUnrecognised: true
						})
					)
				).toStrictEqual(['unknown', 'unknown', 'unknown', 'unknown']);
			});

			it('should drop them by default, so the activity keeps the list it had', () => {
				const { instructions, ...rest } = MOCK_SOL_INSTRUCTIONS.SPL_SEND_WITH_ATA;

				expect(
					kinds(
						mapSolInstructionSummaries({
							...rest,
							instructions: [
								...instructions,
								{ programId: 'SomeUnknownProgram', accounts: [], data: 'AQID' }
							]
						})
					)
				).toStrictEqual(['createTokenAccount', 'send']);
			});
		});
	});
});
