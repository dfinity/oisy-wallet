import { WSOL_TOKEN } from '$env/tokens/tokens-spl/tokens.wsol.env';
import { ZERO } from '$lib/constants/app.constants';
import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
import type { SolClosedAccount } from '$sol/types/sol-simulation';
import {
	mapSolInstructionSummaries,
	solOpensAccountBeyondRent
} from '$sol/utils/sol-instruction-summary.utils';
import { asSolParsedRpcInstructionOrSelf } from '$sol/utils/sol-instructions.utils';
import { solClosedAccountsReachWallet } from '$sol/utils/sol-simulation.utils';
import {
	flattenInstructions,
	solClosesPayOthers,
	solWalletLamportsStated
} from '$sol/utils/sol-transaction-summary.utils';
import { decodeTransactionMessage } from '$sol/utils/sol-transactions.utils';
import {
	MOCK_SOL_INSTRUCTIONS,
	MOCK_SOL_METEORA_DLMM_CLOSE_POSITION,
	MOCK_SOL_METEORA_DLMM_OPEN_POSITION
} from '$tests/mocks/sol-instructions.mock';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockSolAddress,
	mockSolAddress2,
	mockSolAddress3
} from '$tests/mocks/sol.mock';
import { nonNullish } from '@dfinity/utils';
import { getCreateAccountInstruction, getTransferSolInstruction } from '@solana-program/system';
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
import {
	AccountRole,
	decompileTransactionMessage,
	getCompiledTransactionMessageDecoder,
	address as toAddress
} from '@solana/kit';

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
				const wrap = flattenInstructions(views()).find(({ kind }) => kind === 'wrap');

				expect(wrap?.amount).toBe(5_000_000n);
			});

			// Closing a wrapped SOL account is how the swap gives the user their SOL back. Reported
			// as an ordinary account close it would read as housekeeping.
			it('should recognise closing that account as unwrapping', () => {
				const unwrap = flattenInstructions(views()).find(({ kind }) => kind === 'unwrap');

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

			// The router's three instructions each made their lines inside themselves: the account it
			// opens and the SOL it wraps as much as the legs belong under the instruction that made them.
			it('should gather every line of an instruction it cannot read under that instruction', () => {
				const dflow = 'DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH';

				expect(
					views().map(({ kind, program, children }) => [
						kind,
						program,
						children?.map(({ kind: line }) => line)
					])
				).toStrictEqual([
					['route', dflow, ['createTokenAccount', 'wrap']],
					['route', dflow, ['send']],
					['route', dflow, ['send', 'receive', 'unwrap', 'send', 'receive']]
				]);
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

		describe('the program each leg of a route goes through', () => {
			const router = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';
			// A pool OISY does not know, and one it does.
			const unread = mockSolAddress3;
			const meteora = 'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG';

			// What the run reports: the depth of every nested call, which says who made it.
			const call = ({ programId, stackHeight }: { programId: string; stackHeight?: number }) => ({
				programId,
				accounts: [],
				data: '',
				...(nonNullish(stackHeight) && { stackHeight })
			});

			const transfer = ({
				outgoing,
				amount,
				stackHeight
			}: {
				outgoing: boolean;
				amount: string;
				stackHeight?: number;
			}) => ({
				program: 'spl-token',
				programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
				parsed: {
					type: 'transfer',
					info: outgoing
						? {
								source: mockAtaAddress,
								destination: mockAtaAddress2,
								authority: mockSolAddress,
								amount
							}
						: {
								source: mockAtaAddress2,
								destination: mockAtaAddress,
								authority: mockSolAddress2,
								amount
							}
				},
				...(nonNullish(stackHeight) && { stackHeight })
			});

			const legs = ({
				top,
				inner
			}: {
				top: string;
				inner: unknown[];
			}): [string, string | undefined][] =>
				flattenInstructions(
					mapSolInstructionSummaries({
						instructions: [call({ programId: top })],
						innerInstructions: [{ index: 0, instructions: inner }],
						ownedAddresses: [mockSolAddress, mockAtaAddress],
						userAddress: mockSolAddress
					})
				)
					.filter(({ kind }) => kind !== 'route')
					.map(({ kind, via }) => [kind, via]);

			it('should name the pool OISY cannot read that made each leg', () => {
				expect(
					legs({
						top: router,
						inner: [
							call({ programId: unread, stackHeight: 2 }),
							transfer({ outgoing: true, amount: '1000', stackHeight: 3 }),
							transfer({ outgoing: false, amount: '900', stackHeight: 3 })
						]
					})
				).toStrictEqual([
					['send', unread],
					['receive', unread]
				]);
			});

			// The notice names only programs off the list, and a known pool on every leg of every
			// routed swap would only repeat itself.
			it('should name no pool among the known programs', () => {
				expect(
					legs({
						top: router,
						inner: [
							call({ programId: unread, stackHeight: 2 }),
							transfer({ outgoing: true, amount: '1000', stackHeight: 3 }),
							call({ programId: meteora, stackHeight: 2 }),
							transfer({ outgoing: false, amount: '450', stackHeight: 3 })
						]
					})
				).toStrictEqual([
					['send', unread],
					['receive', undefined]
				]);
			});

			// The heading already names the router, and a pool called directly is the heading itself.
			it('should name nothing for a leg the heading program made itself', () => {
				expect(
					legs({
						top: unread,
						inner: [
							transfer({ outgoing: true, amount: '1000', stackHeight: 2 }),
							transfer({ outgoing: false, amount: '900', stackHeight: 2 })
						]
					})
				).toStrictEqual([
					['send', undefined],
					['receive', undefined]
				]);
			});

			it('should name nothing when the run does not say how deep a call was', () => {
				expect(
					legs({
						top: router,
						inner: [
							call({ programId: unread }),
							transfer({ outgoing: true, amount: '1000' }),
							transfer({ outgoing: false, amount: '900' })
						]
					})
				).toStrictEqual([
					['send', undefined],
					['receive', undefined]
				]);
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

		describe('an account the message itself opens for the user', () => {
			const creation = {
				program: 'system',
				programId: '11111111111111111111111111111111',
				parsed: {
					type: 'createAccount',
					info: {
						lamports: 2039280,
						newAccount: 'DgdHwEGCLtmQxxh1NbUzDVjbj2mYMY8RoxF83BRHPmSe',
						owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						source: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
						space: 165
					}
				}
			};

			const initialisation = {
				program: 'spl-token',
				programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
				parsed: {
					type: 'initializeAccount',
					info: {
						account: 'DgdHwEGCLtmQxxh1NbUzDVjbj2mYMY8RoxF83BRHPmSe',
						mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
						owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
						rentSysvar: 'SysvarRent111111111111111111111111111111111'
					}
				}
			};

			it('should leave nothing unrecognised in the configuration the review runs', () => {
				// The production path sets `includeUnrecognised`, and the initialisation that follows the
				// creation is read and deliberately unstated - so its index is uncovered, and without the
				// plumbing exclusion the list adds a token-program row for an instruction it decoded. That
				// row would also read as an instruction nothing accounted for, which is what the signing
				// gate refuses on, so a swap that opens a wrapped SOL account this way would be refused.
				expect(
					mapSolInstructionSummaries({
						instructions: [creation, initialisation],
						ownedAddresses: ['5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'],
						userAddress: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
						includeUnrecognised: true
					}).map(({ kind }) => kind)
				).toStrictEqual(['createTokenAccount']);
			});

			it('should read it as the token account it becomes, carrying its rent', () => {
				// Previously the creation produced no effect, so the list called an instruction the wallet
				// had decoded "unrecognised" and named the System program as the whole of what it knew.
				expect(
					mapSolInstructionSummaries({
						instructions: [creation, initialisation],
						ownedAddresses: ['5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'],
						userAddress: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
					})
				).toStrictEqual([
					{
						kind: 'createTokenAccount',
						account: 'DgdHwEGCLtmQxxh1NbUzDVjbj2mYMY8RoxF83BRHPmSe',
						tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
						rent: 2039280n
					}
				]);
			});

			it('should not list the same account twice when a program opened it', () => {
				// The associated token account program opens its account with the same call made inside
				// itself, and that creation is already the line its own instruction produces.
				const summaries = mapSolInstructionSummaries({
					instructions: [
						{
							program: 'spl-associated-token-account',
							programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
							parsed: {
								type: 'create',
								info: {
									account: 'DgdHwEGCLtmQxxh1NbUzDVjbj2mYMY8RoxF83BRHPmSe',
									mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
									source: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
									wallet: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
								}
							}
						}
					],
					innerInstructions: [{ index: 0, instructions: [creation] }],
					ownedAddresses: ['5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'],
					userAddress: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
				});

				expect(summaries.filter(({ kind }) => kind === 'createTokenAccount')).toHaveLength(1);
			});

			// An address closed and opened again is two accounts, each funded by its own creation.
			it('should read the rent of an account opened again from its own creation', () => {
				const user = '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q';

				const summaries = mapSolInstructionSummaries({
					instructions: [
						creation,
						initialisation,
						{
							program: 'spl-token',
							programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
							parsed: {
								type: 'closeAccount',
								info: {
									account: 'DgdHwEGCLtmQxxh1NbUzDVjbj2mYMY8RoxF83BRHPmSe',
									destination: user,
									owner: user
								}
							}
						},
						{
							...creation,
							parsed: { ...creation.parsed, info: { ...creation.parsed.info, lamports: 3_000_000 } }
						},
						initialisation
					],
					ownedAddresses: [user],
					userAddress: user
				});

				expect(
					summaries.filter(({ kind }) => kind === 'createTokenAccount').map(({ rent }) => rent)
				).toStrictEqual([2_039_280n, 3_000_000n]);
			});

			// Each account at the address is opened for its own mint. Read from the run's single map,
			// the first takes the second's: its line names the wrong token, and wrapped SOL funding is
			// read as though there were nothing to wrap in it.
			it('should read the mint of each account opened at an address from its own opening', () => {
				const user = '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q';

				const summaries = mapSolInstructionSummaries({
					instructions: [
						{
							...creation,
							parsed: {
								...creation.parsed,
								info: { ...creation.parsed.info, lamports: 1_002_039_280 }
							}
						},
						{
							...initialisation,
							parsed: {
								...initialisation.parsed,
								info: { ...initialisation.parsed.info, mint: WSOL_TOKEN.address }
							}
						},
						{
							program: 'spl-token',
							programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
							parsed: {
								type: 'closeAccount',
								info: {
									account: 'DgdHwEGCLtmQxxh1NbUzDVjbj2mYMY8RoxF83BRHPmSe',
									destination: user,
									owner: user
								}
							}
						},
						creation,
						initialisation
					],
					ownedAddresses: [user],
					userAddress: user
				});

				expect(
					summaries
						.filter(({ kind }) => kind === 'createTokenAccount')
						.map(({ tokenAddress, rent }) => ({ tokenAddress, rent }))
				).toStrictEqual([
					{ tokenAddress: WSOL_TOKEN.address, rent: undefined },
					{ tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', rent: 2_039_280n }
				]);
			});

			describe('funded with the SOL it wraps', () => {
				const user = '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q';
				const reserve = 2_039_280n;

				const instructions = [
					{
						...creation,
						parsed: {
							...creation.parsed,
							info: { ...creation.parsed.info, lamports: 1_002_039_280 }
						}
					},
					{
						...initialisation,
						parsed: {
							...initialisation.parsed,
							info: { ...initialisation.parsed.info, mint: WSOL_TOKEN.address }
						}
					}
				];

				const rentOf = (rentExemptMinimum?: bigint): bigint | undefined =>
					mapSolInstructionSummaries({
						instructions,
						ownedAddresses: [user],
						userAddress: user,
						rentExemptMinimum
					}).find(({ kind }) => kind === 'createTokenAccount')?.rent;

				// Initialising it reads everything above the reserve as the wrapped balance, so stating
				// the whole funding as rent counts the wrapped SOL a second time.
				it('should state only the reserve as its rent', () => {
					expect(rentOf(reserve)).toBe(reserve);
				});

				// Without the reserve the rent and the SOL to wrap cannot be told apart, and the whole
				// funding would claim the wrapped SOL as rent.
				it('should leave its rent unstated without the reserve', () => {
					expect(rentOf()).toBeUndefined();
				});

				// The associated token account program funds exactly the rent of what it opens, so its
				// creation states the rent without the reserve, wrapped SOL included.
				it('should keep the rent of a wrapped SOL account the associated token program opens', () => {
					const summaries = mapSolInstructionSummaries({
						instructions: [
							{
								program: 'spl-associated-token-account',
								programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
								parsed: {
									type: 'create',
									info: {
										account: 'DgdHwEGCLtmQxxh1NbUzDVjbj2mYMY8RoxF83BRHPmSe',
										mint: WSOL_TOKEN.address,
										source: user,
										wallet: user
									}
								}
							}
						],
						innerInstructions: [{ index: 0, instructions: [creation] }],
						ownedAddresses: [user],
						userAddress: user
					});

					expect(summaries.find(({ kind }) => kind === 'createTokenAccount')?.rent).toBe(reserve);
				});

				// The reserve is for the fixed size of a Token program account. An account of any other
				// size holds no wrapped SOL, so what its creation funds is its rent.
				it('should keep the funding of an account of another size as its rent', () => {
					const summaries = mapSolInstructionSummaries({
						instructions: [
							{
								...creation,
								parsed: {
									...creation.parsed,
									info: {
										...creation.parsed.info,
										lamports: 2_074_080,
										owner: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
										space: 170
									}
								}
							},
							{ ...initialisation, programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' }
						],
						ownedAddresses: [user],
						userAddress: user,
						rentExemptMinimum: reserve
					});

					expect(summaries.find(({ kind }) => kind === 'createTokenAccount')?.rent).toBe(
						2_074_080n
					);
				});
			});
		});

		describe('an account opened for an application', () => {
			const user = '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q';
			const application = 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo';
			const position = 'BNzxjYNsUyyUyJgds2qYqtpThcd6FPnucFKXfWGzweDK';

			// What the chain charges an account of the token account size, and what that price makes
			// an account of 8,120 bytes cost.
			const rentExemptMinimum = 1_488_440n;
			const positionRent = 41_899_840n;

			const opening = ({
				lamports = positionRent,
				source = user,
				owner = application
			}: {
				lamports?: bigint;
				source?: string;
				owner?: string;
			} = {}) => ({
				program: 'system',
				programId: '11111111111111111111111111111111',
				parsed: {
					type: 'createAccount',
					info: { lamports: Number(lamports), newAccount: position, owner, source, space: 8120 }
				}
			});

			const openedInside = ({
				creation = opening(),
				withPrice = true
			}: {
				creation?: ReturnType<typeof opening>;
				withPrice?: boolean;
			} = {}): SolInstructionSummary[] =>
				mapSolInstructionSummaries({
					instructions: [{ programId: application }],
					innerInstructions: [{ index: 0, instructions: [creation] }],
					ownedAddresses: [user],
					userAddress: user,
					...(withPrice && { rentExemptMinimum }),
					includeUnrecognised: true
				});

			it('should state the rent an application opening its account inside its call costs', () => {
				expect(openedInside()).toStrictEqual([
					{
						kind: 'route',
						program: application,
						children: [
							{ kind: 'createAccount', account: position, program: application, rent: positionRent }
						]
					}
				]);
			});

			// Lamports beyond what the size costs are a balance in an account the program controls.
			// Calling them rent would understate a payment, so the instruction stays undescribed.
			it('should not call lamports above what the account’s size costs rent', () => {
				expect(
					kinds(openedInside({ creation: opening({ lamports: positionRent + 1n }) }))
				).toStrictEqual(['unknown']);
			});

			// An account left with the System program is a wallet: whoever holds its key spends what it
			// is funded with, so the funding is a payment rather than rent.
			it('should not call funding an account left with the System program rent', () => {
				expect(
					kinds(openedInside({ creation: opening({ owner: '11111111111111111111111111111111' }) }))
				).toStrictEqual(['unknown']);
			});

			it('should leave out an account somebody else pays for', () => {
				expect(
					kinds(
						openedInside({
							creation: opening({ source: '9zsjmwXjZzuKfArqhLDpvcvLKUxLZfCzeMcqhAcPr8Jm' })
						})
					)
				).toStrictEqual(['unknown']);
			});

			it('should state no rent without the price the chain charges', () => {
				expect(kinds(openedInside({ withPrice: false }))).toStrictEqual(['unknown']);
			});

			// The associated token account program opens its accounts the same way, for the token
			// program, and those are the token accounts its own instruction already lists.
			it('should not read an account opened for the token program as an application’s', () => {
				expect(
					kinds(
						mapSolInstructionSummaries({
							...MOCK_SOL_INSTRUCTIONS.JUPITER_SWAP,
							rentExemptMinimum
						})
					)
				).not.toContain('createAccount');
			});

			it('should read the same opening stated by the message itself', () => {
				const signer = (address: string) => ({ address }) as never;

				expect(
					mapSolInstructionSummaries({
						instructions: [
							getCreateAccountInstruction({
								payer: signer(user),
								newAccount: signer(position),
								lamports: positionRent,
								space: 8120,
								programAddress: toAddress(application)
							})
						].map(asSolParsedRpcInstructionOrSelf),
						ownedAddresses: [user],
						userAddress: user,
						rentExemptMinimum,
						includeUnrecognised: true
					})
				).toStrictEqual([
					{ kind: 'createAccount', account: position, program: application, rent: positionRent }
				]);
			});

			// The request exactly as Meteora sent it to open a DLMM position, read the way the
			// WalletConnect review reads it. An instruction left undescribed here is one the signing
			// gate refuses the whole request over.
			describe('a Meteora DLMM position opened over WalletConnect', () => {
				const { transaction, innerInstructions, userAddress } = MOCK_SOL_METEORA_DLMM_OPEN_POSITION;

				const views = (): SolInstructionSummary[] => {
					const { messageBytes } = decodeTransactionMessage(transaction);
					const { instructions } = decompileTransactionMessage(
						getCompiledTransactionMessageDecoder().decode(messageBytes)
					);

					return mapSolInstructionSummaries({
						instructions: [...instructions].map(asSolParsedRpcInstructionOrSelf),
						innerInstructions,
						ownedAddresses: [userAddress],
						userAddress,
						rentExemptMinimum: MOCK_SOL_METEORA_DLMM_OPEN_POSITION.rentExemptMinimum,
						includeUnrecognised: true
					});
				};

				it('should leave no instruction undescribed', () => {
					expect(kinds(views())).not.toContain('unknown');
				});

				// Both lb_clmm instructions are ones the wallet cannot read, so each heads what it did.
				it('should list each instruction with what it did beneath it', () => {
					expect(
						views().map(({ kind, program, children }) => [
							kind,
							program,
							children?.map(({ kind: line }) => line)
						])
					).toStrictEqual([
						['route', application, ['createAccount']],
						['createTokenAccount', undefined, undefined],
						['wrap', undefined, undefined],
						['route', application, ['send', 'send']],
						['unwrap', undefined, undefined]
					]);
				});

				it('should state the rent of the position account under the instruction opening it', () => {
					const [opening] = views();

					expect(opening.children).toStrictEqual([
						{ kind: 'createAccount', account: position, program: application, rent: positionRent }
					]);
				});

				it('should list the deposit as the two sends it makes', () => {
					const [, , , deposit] = views();

					expect(deposit.children?.map(({ kind, amount }) => [kind, amount])).toStrictEqual([
						['send', 99_982n],
						['send', 810_249n]
					]);
				});
			});
		});

		// An application closing an account of its own moves the lamports itself, so only the run's
		// account states say it happened. The request exactly as Meteora sent it to close a position.
		describe('an account an application closes', () => {
			const {
				transaction,
				innerInstructions,
				userAddress,
				usdcAccount,
				usdc,
				position,
				walletChange,
				fee,
				rentExemptMinimum
			} = MOCK_SOL_METEORA_DLMM_CLOSE_POSITION;

			const views = (closedAccounts: SolClosedAccount[] = []): SolInstructionSummary[] => {
				const { messageBytes } = decodeTransactionMessage(transaction);
				const { instructions } = decompileTransactionMessage(
					getCompiledTransactionMessageDecoder().decode(messageBytes)
				);

				return mapSolInstructionSummaries({
					instructions: [...instructions].map(asSolParsedRpcInstructionOrSelf),
					innerInstructions,
					ownedAddresses: [userAddress, usdcAccount],
					userAddress,
					accountHolders: { [usdcAccount]: userAddress },
					accountMintsBefore: { [usdcAccount]: usdc },
					rentExemptMinimum,
					closedAccounts,
					includeUnrecognised: true
				});
			};

			// What made the request refuse: the instruction that closes the position calls nothing
			// but its own event log.
			it('should leave the closing instruction undescribed without the close', () => {
				expect(kinds(views())).toContain('unknown');
			});

			it('should state the close under the instruction that closes the account', () => {
				const lines = views([position]);

				expect(kinds(lines)).not.toContain('unknown');

				const closing = lines.filter(({ kind }) => kind === 'route').at(-1);

				expect(closing?.program).toBe(position.program);
				expect(closing?.children).toStrictEqual([
					{
						kind: 'closeAccount',
						account: position.account,
						program: position.program,
						returned: position.lamports
					}
				]);
			});

			// The wallet's own change is the witness that the rent came home: with the fee and every
			// line taken out, the rest is exactly what the position held.
			it('should account for the wallet’s change with the position’s rent and nothing else', () => {
				const statedChange = solWalletLamportsStated({ instructions: views(), userAddress });

				expect(
					solClosedAccountsReachWallet({
						closedAccounts: [position],
						walletChange,
						statedChange,
						fee
					})
				).toBeTruthy();
				expect(
					solClosedAccountsReachWallet({
						closedAccounts: [{ ...position, lamports: position.lamports - 1n }],
						walletChange,
						statedChange,
						fee
					})
				).toBeFalsy();
			});

			// The program and the account have to meet in the same call. An instruction that names the
			// account and calls the program on something else never reached it.
			it('should not hang a close under an instruction that calls its program without it', () => {
				const closedAccount = {
					account: 'c1osedAppAccount11111111111111111111111111',
					program: 'App1icationProgram111111111111111111111111',
					lamports: 41_899_840n
				};

				expect(
					mapSolInstructionSummaries({
						instructions: [
							{
								programAddress: 'WrapperProgram11111111111111111111111111111',
								accounts: [{ address: closedAccount.account, role: AccountRole.WRITABLE }]
							}
						],
						innerInstructions: [
							{
								index: 0,
								instructions: [
									{
										programId: closedAccount.program,
										accounts: ['SomethingE1se111111111111111111111111111111']
									}
								]
							}
						],
						ownedAddresses: [userAddress],
						userAddress,
						closedAccounts: [closedAccount],
						includeUnrecognised: true
					})
				).toStrictEqual([
					{ kind: 'unknown', program: 'WrapperProgram11111111111111111111111111111' }
				]);
			});

			it('should hang it under an instruction that calls its program with it', () => {
				const closedAccount = {
					account: 'c1osedAppAccount11111111111111111111111111',
					program: 'App1icationProgram111111111111111111111111',
					lamports: 41_899_840n
				};

				expect(
					kinds(
						mapSolInstructionSummaries({
							instructions: [
								{
									programAddress: 'WrapperProgram11111111111111111111111111111',
									accounts: [{ address: closedAccount.account, role: AccountRole.WRITABLE }]
								}
							],
							innerInstructions: [
								{
									index: 0,
									instructions: [
										{ programId: closedAccount.program, accounts: [closedAccount.account] }
									]
								}
							],
							ownedAddresses: [userAddress],
							userAddress,
							closedAccounts: [closedAccount],
							includeUnrecognised: true
						})
					)
				).toStrictEqual(['route']);
			});

			it('should not hang a close under an instruction that does not run its program', () => {
				expect(
					kinds(views([{ ...position, program: 'SomeOtherProgram111111111111111111111111111' }]))
				).toContain('unknown');
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
				ownedAddresses: [owner, ata],
				userAddress: owner
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
				ownedAddresses: [owner],
				userAddress: owner
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
				ownedAddresses: [owner],
				userAddress: owner
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
				userAddress: owner,
				accountLamports: { [ata]: 2_039_280n }
			});

			expect(view.kind).toBe('closeTokenAccount');
			expect(view.returned).toBe(2_039_280n);
			expect(view.counterparty).toBe(owner);
			expect(view.own).toBeTruthy();
		});

		// Both sources apply at once on an account that pre-dates the message and is paid into during
		// it. Picking one dropped the other, and on a funded account the one dropped was the bulk.
		it('should add what the account already held to what arrived', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const wsol = 'wsolAccount11111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'transfer',
							info: { destination: wsol, lamports: 1_000_000_000, source: owner }
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: wsol, destination: owner, owner } }
					}
				],
				ownedAddresses: [owner, wsol],
				userAddress: owner,
				accountLamports: { [wsol]: 5_000_000_000n }
			});

			const close = views.find(({ kind }) => kind === 'closeTokenAccount');

			// 5 SOL it already held plus the 1 SOL the message paid in.
			expect(close?.returned).toBe(6_000_000_000n);
		});

		// A close hands its whole balance to the account it names, so reading what one hands back
		// walks the closes that paid into it, and those walk the closes that paid into them. A message
		// is the dApp's to arrange, so it can close two accounts into each other over and over - A
		// into B, then B into A - which reaches the same account at the same point along many paths.
		// Walking each of them re-does the same work, doubling with every added close, so a message
		// of a few dozen would hang the review before it could be rejected. Each point is walked once,
		// so the whole message is read in one pass regardless of how the closes are arranged.
		it('should read a message that closes two accounts into each other many times over', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const a = 'aAccount11111111111111111111111111111111111';
			const b = 'bAccount11111111111111111111111111111111111';

			const closes = Array.from({ length: 120 }, (_, index) => ({
				program: 'spl-token',
				programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
				parsed: {
					type: 'closeAccount',
					info:
						index % 2 === 0
							? { account: a, destination: b, owner }
							: { account: b, destination: a, owner }
				}
			}));

			const start = performance.now();

			const views = mapSolInstructionSummaries({
				instructions: closes,
				ownedAddresses: [owner, a, b],
				userAddress: owner,
				accountLamports: { [a]: 2_039_280n, [b]: 2_039_280n }
			});

			// Every close is read, and the read is near-instant. The budget is generous on purpose:
			// it is here to fail if the walk ever grows with the arrangement again, not to measure it.
			expect(views.filter(({ kind }) => kind === 'closeTokenAccount')).toHaveLength(120);
			expect(performance.now() - start).toBeLessThan(2_000);
		});

		// What each close hands back depends on every instruction before it, a transfer of wrapped
		// SOL among them. Reading that afresh for every close grew with the cube of the message, so
		// the payouts are read in one forward pass: five hundred instructions stay near-instant.
		it('should read what every close hands back in one pass over the message', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const a = 'aAccount11111111111111111111111111111111111';
			const b = 'bAccount11111111111111111111111111111111111';

			const instructions = Array.from({ length: 510 }, (_, index) => ({
				program: 'spl-token',
				programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
				parsed:
					index % 3 === 2
						? {
								type: 'transfer',
								info: { source: a, destination: b, authority: owner, amount: '1' }
							}
						: {
								type: 'closeAccount',
								info:
									index % 2 === 0
										? { account: a, destination: b, owner }
										: { account: b, destination: a, owner }
							}
			}));

			const start = performance.now();

			const views = mapSolInstructionSummaries({
				instructions,
				ownedAddresses: [owner, a, b],
				userAddress: owner,
				accountLamports: { [a]: 2_039_280n, [b]: 2_039_280n },
				addressToToken: { [a]: WSOL_TOKEN.address, [b]: WSOL_TOKEN.address }
			});

			expect(
				views.filter(({ kind }) => kind === 'unwrap' || kind === 'closeTokenAccount')
			).toHaveLength(340);
			expect(performance.now() - start).toBeLessThan(1_000);
		});

		// An account this message opens has no state to read beforehand, and a swap that opens one
		// wraps into it and unwraps out of it within the same message. Reading the balance from
		// before the transaction called every such close an unwrap, including the ones that hand
		// back nothing but the rent they were opened with.
		it('should call a close of an account it opened and emptied a close, not an unwrap', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const wsol = 'wsolAccount11111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'createAccount',
							info: {
								newAccount: wsol,
								lamports: 1_488_440,
								owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								source: owner,
								space: 165
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: wsol, destination: owner, owner } }
					}
				],
				ownedAddresses: [owner, wsol],
				userAddress: owner,
				rentExemptMinimum: 1_488_440n,
				addressToToken: { [wsol]: WSOL_TOKEN.address }
			});

			const close = views.find(({ kind }) => kind === 'closeTokenAccount');

			expect(close?.wrapped).toBe(ZERO);
		});

		it('should keep the wrapped amount of an account it opened and wrapped into', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const wsol = 'wsolAccount11111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'createAccount',
							info: {
								newAccount: wsol,
								lamports: 1_488_440,
								owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								source: owner,
								space: 165
							}
						}
					},
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'transfer',
							info: { destination: wsol, lamports: 1_000_000_000, source: owner }
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: wsol, destination: owner, owner } }
					}
				],
				ownedAddresses: [owner, wsol],
				userAddress: owner,
				rentExemptMinimum: 1_488_440n,
				addressToToken: { [wsol]: WSOL_TOKEN.address }
			});

			const close = views.find(({ kind }) => kind === 'unwrap');

			expect(close?.wrapped).toBe(1_000_000_000n);
		});

		// An account that pre-dates the message can be emptied before its close just the same.
		// Reading its balance from before the transaction called that close an unwrap of something
		// already gone.
		it('should hold nothing when a pre-existing account was emptied before its close', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const wsol = 'wsolAccount11111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: {
								source: wsol,
								destination: 'poo11111111111111111111111111111111111111',
								amount: 5_000_000_000
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: wsol, destination: owner, owner } }
					}
				],
				ownedAddresses: [owner, wsol],
				userAddress: owner,
				addressToToken: { [wsol]: WSOL_TOKEN.address },
				accountLamports: { [wsol]: 2_039_280n + 5_000_000_000n },
				accountTokenAmounts: { [wsol]: 5_000_000_000n }
			});

			const close = views.find(({ kind }) => kind === 'closeTokenAccount');

			expect(close?.returned).toBe(2_039_280n);
			expect(close?.wrapped).toBe(ZERO);
		});

		it('should add what a pre-existing account received before its close', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const wsol = 'wsolAccount11111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: {
								source: 'poo11111111111111111111111111111111111111',
								destination: wsol,
								amount: 1_000_000_000
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: wsol, destination: owner, owner } }
					}
				],
				ownedAddresses: [owner, wsol],
				userAddress: owner,
				addressToToken: { [wsol]: WSOL_TOKEN.address },
				accountLamports: { [wsol]: 2_039_280n + 5_000_000_000n },
				accountTokenAmounts: { [wsol]: 5_000_000_000n }
			});

			const close = views.find(({ kind }) => kind === 'unwrap');

			expect(close?.returned).toBe(2_039_280n + 6_000_000_000n);
			expect(close?.wrapped).toBe(6_000_000_000n);
		});

		// Nothing to start from: an account that pre-dates the message and whose state no run read.
		it('should hold an unknown amount when no run read the account', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const wsol = 'wsolAccount11111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: wsol, destination: owner, owner } }
					}
				],
				ownedAddresses: [owner, wsol],
				userAddress: owner,
				addressToToken: { [wsol]: WSOL_TOKEN.address }
			});

			const close = views.find(({ kind }) => kind === 'unwrap');

			expect(close?.wrapped).toBeUndefined();
		});

		// A creation may fund a native account with the reserve and the amount to wrap together, and
		// let its initialisation read the difference as the balance. Seeding from nothing called
		// that close a plain one and its whole payout rent.
		it('should hold what a creation funded above the reserve', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const wsol = 'wsolAccount11111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'createAccount',
							info: {
								newAccount: wsol,
								lamports: 1_488_440 + 5_000_000_000,
								owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								source: owner,
								space: 165
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: wsol, destination: owner, owner } }
					}
				],
				ownedAddresses: [owner, wsol],
				userAddress: owner,
				rentExemptMinimum: 1_488_440n,
				addressToToken: { [wsol]: WSOL_TOKEN.address }
			});

			const close = views.find(({ kind }) => kind === 'unwrap');

			expect(close?.wrapped).toBe(5_000_000_000n);
		});

		// Nothing in the message says where the reserve ends and the balance begins: the creation
		// states one figure and the close hands the same one back.
		it('should hold an unknown amount when the reserve is not known', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const wsol = 'wsolAccount11111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'createAccount',
							info: {
								newAccount: wsol,
								lamports: 1_488_440,
								owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								source: owner,
								space: 165
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: wsol, destination: owner, owner } }
					}
				],
				ownedAddresses: [owner, wsol],
				userAddress: owner,
				addressToToken: { [wsol]: WSOL_TOKEN.address }
			});

			const close = views.find(({ kind }) => kind === 'unwrap');

			expect(close?.wrapped).toBeUndefined();
		});

		// A wrapped SOL account holds its token balance as lamports, so a token transfer into one
		// hands that much more over when it closes. Counting only System funding reported the rent
		// alone and called the close a return of it.
		it('should count wrapped SOL transferred into the account', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const wsol = 'wsolAccount11111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'createAccount',
							info: {
								newAccount: wsol,
								lamports: 1_488_440,
								owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								source: owner,
								space: 165
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: {
								source: 'poo11111111111111111111111111111111111111',
								destination: wsol,
								amount: 5_000_000_000
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: wsol, destination: owner, owner } }
					}
				],
				ownedAddresses: [owner, wsol],
				userAddress: owner,
				rentExemptMinimum: 1_488_440n,
				addressToToken: { [wsol]: WSOL_TOKEN.address }
			});

			const close = views.find(({ kind }) => kind === 'unwrap');

			expect(close?.returned).toBe(5_001_488_440n);
			expect(close?.wrapped).toBe(5_000_000_000n);
		});

		it('should take wrapped SOL sent on out again', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const wsol = 'wsolAccount11111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'createAccount',
							info: {
								newAccount: wsol,
								lamports: 1_488_440,
								owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								source: owner,
								space: 165
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: {
								source: 'poo11111111111111111111111111111111111111',
								destination: wsol,
								amount: 5_000_000_000
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: {
								source: wsol,
								destination: 'poo22222222222222222222222222222222222222',
								amount: 5_000_000_000
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: wsol, destination: owner, owner } }
					}
				],
				ownedAddresses: [owner, wsol],
				userAddress: owner,
				rentExemptMinimum: 1_488_440n,
				addressToToken: { [wsol]: WSOL_TOKEN.address }
			});

			const close = views.find(({ kind }) => kind === 'closeTokenAccount');

			expect(close?.returned).toBe(1_488_440n);
			expect(close?.wrapped).toBe(ZERO);
		});

		// A transfer from an account to itself moves nothing. Read by its destination alone it is an
		// arrival, and the close states more SOL coming back and more of it wrapped than there is.
		it('should not count a transfer of wrapped SOL from an account to itself', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const wsol = 'wso1Account11111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: { source: wsol, destination: wsol, authority: owner, amount: 1_000 }
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: wsol, destination: owner, owner } }
					}
				],
				ownedAddresses: [owner, wsol],
				userAddress: owner,
				rentExemptMinimum: 1_488_440n,
				accountHolders: { [wsol]: owner },
				accountMintsBefore: { [wsol]: WSOL_TOKEN.address },
				accountLamports: { [wsol]: 1_488_445n },
				accountTokenAmounts: { [wsol]: 5n },
				addressToToken: { [wsol]: WSOL_TOKEN.address }
			});

			const close = views.find(({ kind }) => kind === 'unwrap');

			expect(close?.returned).toBe(1_488_445n);
			expect(close?.wrapped).toBe(5n);
		});

		// Whose an account is, is read as of the instruction too. The set of the user's accounts
		// holds every account they had at any point of the message, so an address closed and opened
		// for a different holder would lend each holder's transfers to the other.
		describe('an address closed and opened for a different holder', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const stranger = 'strangerWa11et11111111111111111111111111111';
			const account = 'reusedAccount11111111111111111111111111111';
			const pool = 'poo11111111111111111111111111111111111111';
			const bonk = 'bonkMint1111111111111111111111111111111111';

			const transfer = ({
				source,
				destination,
				authority
			}: {
				source: string;
				destination: string;
				authority: string;
			}) => ({
				program: 'spl-token',
				programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
				parsed: { type: 'transfer', info: { source, destination, authority, amount: '100' } }
			});

			const close = (holder: string) => ({
				program: 'spl-token',
				programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
				parsed: { type: 'closeAccount', info: { account, destination: holder, owner: holder } }
			});

			const reopenFor = (holder: string) => [
				{
					program: 'system',
					programId: '11111111111111111111111111111111',
					parsed: {
						type: 'createAccount',
						info: {
							newAccount: account,
							lamports: 2_039_280,
							owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
							source: holder,
							space: 165
						}
					}
				},
				{
					program: 'spl-token',
					programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					parsed: { type: 'initializeAccount3', info: { account, mint: bonk, owner: holder } }
				}
			];

			it('should not count a send from it as the user sending before it is opened for them', () => {
				const views = mapSolInstructionSummaries({
					instructions: [
						transfer({ source: account, destination: pool, authority: stranger }),
						close(stranger),
						...reopenFor(owner)
					],
					ownedAddresses: [owner],
					userAddress: owner,
					accountHolders: { [account]: stranger },
					accountMintsBefore: { [account]: bonk }
				});

				expect(views.map(({ kind }) => kind)).toStrictEqual(['createTokenAccount']);
			});

			const sol = ({ source, destination }: { source: string; destination: string }) => ({
				program: 'system',
				programId: '11111111111111111111111111111111',
				parsed: { type: 'transfer', info: { source, destination, lamports: 1_000 } }
			});

			const initialiseFor = (holder: string) => ({
				program: 'spl-token',
				programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
				parsed: { type: 'initializeAccount3', info: { account, mint: bonk, owner: holder } }
			});

			// A closed address holds no account, which is not the same as nobody having read whose it
			// was. What arrives there lands in the account opened there next.
			it('should not count SOL sent to it after the close as sent to the user', () => {
				const views = mapSolInstructionSummaries({
					instructions: [
						close(owner),
						sol({ source: owner, destination: account }),
						initialiseFor(stranger)
					],
					ownedAddresses: [owner, account],
					userAddress: owner,
					accountHolders: { [account]: owner },
					accountMintsBefore: { [account]: bonk },
					accountLamports: { [account]: 2_039_280n }
				});

				expect(views.find(({ kind }) => kind === 'send')?.own).toBeFalsy();
			});

			it('should count SOL sent to a fresh address ahead of its opening for the user as theirs', () => {
				const views = mapSolInstructionSummaries({
					instructions: [sol({ source: owner, destination: account }), initialiseFor(owner)],
					ownedAddresses: [owner],
					userAddress: owner
				});

				expect(views.find(({ kind }) => kind === 'send')?.own).toBeTruthy();
			});

			// Nothing of the user's is at an address before an account is opened there, so nothing of
			// theirs can leave it.
			it('should not count SOL sent out of a fresh address before its opening as the user sending', () => {
				const views = mapSolInstructionSummaries({
					instructions: [sol({ source: account, destination: stranger }), initialiseFor(owner)],
					ownedAddresses: [owner],
					userAddress: owner
				});

				expect(views).toStrictEqual([]);
			});

			it('should not count a transfer into it as the user receiving once it is opened for somebody else', () => {
				const views = mapSolInstructionSummaries({
					instructions: [
						close(owner),
						...reopenFor(stranger),
						transfer({ source: pool, destination: account, authority: stranger })
					],
					ownedAddresses: [owner, account],
					userAddress: owner,
					accountHolders: { [account]: owner },
					accountMintsBefore: { [account]: bonk },
					accountLamports: { [account]: 2_039_280n }
				});

				expect(views.map(({ kind }) => kind)).toStrictEqual(['closeTokenAccount']);
			});
		});

		// A transfer into an account is a wrap by the account the address holds at the transfer.
		// Read from the run's single map, an address opened for two mints judges a transfer into
		// either by the last one.
		describe('a SOL transfer into an address opened for two mints', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const account = 'wso1Account11111111111111111111111111111111';

			const openAs = (mint: string) => ({
				program: 'spl-associated-token-account',
				programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
				parsed: { type: 'create', info: { account, mint, source: owner, wallet: owner } }
			});

			const transfer = {
				program: 'system',
				programId: '11111111111111111111111111111111',
				parsed: {
					type: 'transfer',
					info: { source: owner, destination: account, lamports: 1_000_000 }
				}
			};

			const close = {
				program: 'spl-token',
				programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
				parsed: { type: 'closeAccount', info: { account, destination: owner, owner } }
			};

			const kindOfTransfer = (instructions: unknown[]): string | undefined =>
				mapSolInstructionSummaries({
					instructions,
					ownedAddresses: [owner],
					userAddress: owner
				}).find(({ kind }) => kind === 'wrap' || kind === 'send')?.kind;

			it('should read it as a wrap while the address holds wrapped SOL', () => {
				expect(
					kindOfTransfer([
						openAs(WSOL_TOKEN.address),
						transfer,
						close,
						openAs('bonkMint1111111111111111111111111111111111')
					])
				).toBe('wrap');
			});

			it('should read it as a send while the address holds any other mint', () => {
				expect(
					kindOfTransfer([
						openAs('bonkMint1111111111111111111111111111111111'),
						transfer,
						close,
						openAs(WSOL_TOKEN.address)
					])
				).toBe('send');
			});

			// SOL sent to the address before anything is open there ends up in the account the
			// message opens there next.
			it('should read it by the account opened next when nothing is open yet', () => {
				expect(kindOfTransfer([transfer, openAs(WSOL_TOKEN.address)])).toBe('wrap');
			});
		});

		// An unchecked transfer names no mint, so the mint is the one its account holds at the
		// transfer. Read from the run's single map, a send made before the address is opened again
		// for another mint is stated in the later mint, with its decimals.
		it('should read an unchecked transfer by the mint its account holds at the transfer', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const account = 'mineAccount11111111111111111111111111111111';
			const bonk = 'bonkMint1111111111111111111111111111111111';
			const usdc = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: {
								source: account,
								destination: 'friendBonkAccount1111111111111111111111111',
								authority: owner,
								amount: '100'
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account, destination: owner, owner } }
					},
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'createAccount',
							info: {
								newAccount: account,
								lamports: 2_039_280,
								owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								source: owner,
								space: 165
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'initializeAccount3', info: { account, mint: usdc, owner } }
					}
				],
				ownedAddresses: [owner, account],
				userAddress: owner,
				accountHolders: { [account]: owner },
				accountMintsBefore: { [account]: bonk },
				accountLamports: { [account]: 2_039_280n },
				accountTokenAmounts: { [account]: 100n },
				addressToToken: { [account]: usdc }
			});

			expect(views.find(({ kind }) => kind === 'send')?.tokenAddress).toBe(bonk);
		});

		// Any other mint keeps its balance as a number in the account, not as the lamports under
		// it, so a transfer of one moves none.
		it('should not count a transfer of any other mint as lamports', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const ata = 'bonkAccount11111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'createAccount',
							info: {
								newAccount: ata,
								lamports: 1_488_440,
								owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								source: owner,
								space: 165
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: {
								source: 'poo11111111111111111111111111111111111111',
								destination: ata,
								amount: 9_000
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: ata, destination: owner, owner } }
					}
				],
				ownedAddresses: [owner, ata],
				userAddress: owner,
				rentExemptMinimum: 1_488_440n,
				addressToToken: { [ata]: 'bonkMint1111111111111111111111111111111111' }
			});

			const close = views.find(({ kind }) => kind === 'closeTokenAccount');

			expect(close?.returned).toBe(1_488_440n);
		});

		// The idempotent form does nothing when the account is already there. A line saying an
		// account was opened, for a message that opened none, states an operation that did not
		// happen.
		it('should say nothing for an idempotent creation of an account that already exists', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const ata = 'ataAccount111111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-associated-token-account',
						programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
						parsed: {
							type: 'createIdempotent',
							info: {
								account: ata,
								wallet: owner,
								source: owner,
								mint: 'bonkMint1111111111111111111111111111111111'
							}
						}
					}
				],
				ownedAddresses: [owner, ata],
				userAddress: owner,
				accountLamports: { [ata]: 2_039_280n },
				accountHolders: { [ata]: owner },
				accountMintsBefore: { [ata]: 'bonkMint1111111111111111111111111111111111' },
				includeUnrecognised: true
			});

			expect(views).toStrictEqual([]);
		});

		// Dropping the line must not leave the instruction uncovered: listed as one nothing could
		// read, it would also be the entry that stops the request being signed.
		it('should not list that creation as unrecognised either', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const ata = 'ataAccount111111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-associated-token-account',
						programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
						parsed: {
							type: 'createIdempotent',
							info: {
								account: ata,
								wallet: owner,
								source: owner,
								mint: 'bonkMint1111111111111111111111111111111111'
							}
						}
					}
				],
				ownedAddresses: [owner, ata],
				userAddress: owner,
				accountLamports: { [ata]: 2_039_280n },
				accountHolders: { [ata]: owner },
				accountMintsBefore: { [ata]: 'bonkMint1111111111111111111111111111111111' },
				includeUnrecognised: true
			});

			expect(views.map(({ kind }) => kind)).not.toContain('unknown');
		});

		// An associated account's address can hold lamports before anything opens an account at it,
		// and the program then opens one on top of them rather than doing nothing. Lamports alone
		// do not say the account was there, only a token account in the state before does.
		it('should keep an idempotent creation over an address that holds lamports but no account', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const ata = 'ataAccount111111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-associated-token-account',
						programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
						parsed: {
							type: 'createIdempotent',
							info: {
								account: ata,
								wallet: owner,
								source: owner,
								mint: 'bonkMint1111111111111111111111111111111111'
							}
						}
					}
				],
				ownedAddresses: [owner, ata],
				userAddress: owner,
				accountLamports: { [ata]: 1_000_000n },
				includeUnrecognised: true
			});

			expect(views.map(({ kind }) => kind)).toStrictEqual(['createTokenAccount']);
		});

		// An account this message opens has no pre-state, so asking only about the state before the
		// transaction called the second creation a real one and charged the same rent twice.
		it('should say nothing for an idempotent creation of an account this message just opened', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const ata = 'ataAccount111111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-associated-token-account',
						programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
						parsed: {
							type: 'create',
							info: {
								account: ata,
								wallet: owner,
								source: owner,
								mint: 'bonkMint1111111111111111111111111111111111'
							}
						}
					},
					{
						program: 'spl-associated-token-account',
						programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
						parsed: {
							type: 'createIdempotent',
							info: {
								account: ata,
								wallet: owner,
								source: owner,
								mint: 'bonkMint1111111111111111111111111111111111'
							}
						}
					}
				],
				innerInstructions: [
					{
						index: 0,
						instructions: [
							{
								program: 'system',
								programId: '11111111111111111111111111111111',
								parsed: {
									type: 'createAccount',
									info: {
										newAccount: ata,
										lamports: 2_039_280,
										owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
										source: owner,
										space: 165
									}
								}
							}
						]
					}
				],
				ownedAddresses: [owner, ata],
				userAddress: owner
			});

			expect(views.map(({ kind }) => kind)).toStrictEqual(['createTokenAccount']);
		});

		// Closing it puts the address back to nothing, so what follows opens it again.
		it('should keep an idempotent creation that follows a close of the same account', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const ata = 'ataAccount111111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: ata, destination: owner, owner } }
					},
					{
						program: 'spl-associated-token-account',
						programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
						parsed: {
							type: 'createIdempotent',
							info: {
								account: ata,
								wallet: owner,
								source: owner,
								mint: 'bonkMint1111111111111111111111111111111111'
							}
						}
					}
				],
				ownedAddresses: [owner, ata],
				userAddress: owner,
				accountLamports: { [ata]: 2_039_280n },
				accountHolders: { [ata]: owner },
				accountMintsBefore: { [ata]: 'bonkMint1111111111111111111111111111111111' }
			});

			expect(views.map(({ kind }) => kind)).toContain('createTokenAccount');
		});

		// A confirmed transaction's balances carry an entry for every account it names, an account
		// it creates among them, at nothing. Seeding from the keys alone read those as already
		// there and dropped the creation that made them, rent and all.
		it('should keep a creation of an account whose balance going in was nothing', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const ata = 'ataAccount111111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-associated-token-account',
						programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
						parsed: {
							type: 'createIdempotent',
							info: {
								account: ata,
								wallet: owner,
								source: owner,
								mint: 'bonkMint1111111111111111111111111111111111'
							}
						}
					}
				],
				ownedAddresses: [owner, ata],
				userAddress: owner,
				accountLamports: { [owner]: 10_000_000n, [ata]: ZERO }
			});

			expect(views.map(({ kind }) => kind)).toStrictEqual(['createTokenAccount']);
		});

		// Nothing says it was a no-op without a run to say the account was already there.
		it('should keep an idempotent creation when no run read the account', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const ata = 'ataAccount111111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-associated-token-account',
						programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
						parsed: {
							type: 'createIdempotent',
							info: {
								account: ata,
								wallet: owner,
								source: owner,
								mint: 'bonkMint1111111111111111111111111111111111'
							}
						}
					}
				],
				ownedAddresses: [owner, ata],
				userAddress: owner
			});

			expect(views.map(({ kind }) => kind)).toStrictEqual(['createTokenAccount']);
		});

		// Only the idempotent form. The plain one fails on an account that exists, so it is never
		// a no-op.
		it('should keep a plain creation even when the account has a pre-state', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const ata = 'ataAccount111111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-associated-token-account',
						programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
						parsed: {
							type: 'create',
							info: {
								account: ata,
								wallet: owner,
								source: owner,
								mint: 'bonkMint1111111111111111111111111111111111'
							}
						}
					}
				],
				ownedAddresses: [owner, ata],
				userAddress: owner,
				accountLamports: { [ata]: 2_039_280n },
				accountHolders: { [ata]: owner },
				accountMintsBefore: { [ata]: 'bonkMint1111111111111111111111111111111111' }
			});

			expect(views.map(({ kind }) => kind)).toStrictEqual(['createTokenAccount']);
		});

		// The signer of a close is its authority, which is the holder normally and the close
		// authority when one is set. Taking it for the holder let a third party naming this wallet
		// as close authority have their account read as the user's.
		it('should not call an account theirs because the user may close it', () => {
			const theirs = mockAtaAddress2;

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'closeAccount',
							info: { account: theirs, destination: mockSolAddress, owner: mockSolAddress }
						}
					}
				],
				ownedAddresses: [mockSolAddress],
				userAddress: mockSolAddress,
				accountHolders: { [theirs]: mockSolAddress2 },
				accountLamports: { [theirs]: 2_039_280n }
			});

			expect(views).toStrictEqual([
				{
					kind: 'closeTokenAccount',
					account: theirs,
					returned: 2_039_280n,
					ownAccount: false,
					counterparty: mockSolAddress,
					own: true
				}
			]);
		});

		// The holder the run reports for the whole transaction is the one left after it. A message
		// that closes an account of the user's to a stranger and opens the same address again for
		// somebody else would have that first close read as the somebody's, and dropped.
		it('should read the holder at the close, not after the transaction', () => {
			const x = mockAtaAddress2;
			const attacker = 'attackerAddress111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [{ programId: 'evi1Program11111111111111111111111111111111' }],
				innerInstructions: [
					{
						index: 0,
						instructions: [
							{
								program: 'spl-token',
								programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								parsed: {
									type: 'closeAccount',
									info: { account: x, destination: attacker, owner: mockSolAddress }
								}
							},
							{
								program: 'system',
								programId: '11111111111111111111111111111111',
								parsed: {
									type: 'createAccount',
									info: {
										newAccount: x,
										lamports: 2_039_280,
										owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
										source: attacker,
										space: 165
									}
								}
							},
							{
								program: 'spl-token',
								programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								parsed: {
									type: 'initializeAccount3',
									info: {
										account: x,
										mint: 'mint1111111111111111111111111111111111111',
										owner: attacker
									}
								}
							}
						]
					}
				],
				ownedAddresses: [mockSolAddress, x],
				userAddress: mockSolAddress,
				accountHolders: { [x]: mockSolAddress },
				accountLamports: { [mockSolAddress]: 10_000_000n, [x]: 2_039_280n }
			});

			const close = flattenInstructions(views).find(({ kind }) => kind === 'closeTokenAccount');

			expect(close).toBeDefined();
			expect(close).not.toHaveProperty('ownAccount');
			expect(close?.counterparty).toBe(attacker);
		});

		// An address closed and opened again within the one message is two accounts. The second
		// close hands over what the second account held, not what the first one did.
		it('should read a reopened account from its reopening, not from before the transaction', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const wsol = 'wsolAccount11111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: wsol, destination: owner, owner } }
					},
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'createAccount',
							info: {
								newAccount: wsol,
								lamports: 1_488_440,
								owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								source: owner,
								space: 165
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: wsol, destination: owner, owner } }
					}
				],
				ownedAddresses: [owner, wsol],
				userAddress: owner,
				rentExemptMinimum: 1_488_440n,
				addressToToken: { [wsol]: WSOL_TOKEN.address },
				accountLamports: { [wsol]: 1_488_440n + 5_000_000_000n },
				accountTokenAmounts: { [wsol]: 5_000_000_000n }
			});

			const [first, second] = views.filter(
				({ kind }) => kind === 'unwrap' || kind === 'closeTokenAccount'
			);

			expect(first?.kind).toBe('unwrap');
			expect(second?.kind).toBe('closeTokenAccount');

			expect(first?.returned).toBe(1_488_440n + 5_000_000_000n);
			expect(first?.wrapped).toBe(5_000_000_000n);
			expect(second?.returned).toBe(1_488_440n);
			expect(second?.wrapped).toBe(ZERO);
		});

		// A Token program account is always the same size, so its reserve is the chain's minimum
		// for that size. A Token-2022 account's size varies with its extensions. The RPC labels
		// both programs `spl-token`, so only the program's address tells them apart.
		it('should carry the reserve of a Token program account and not of a Token-2022 one', () => {
			const close = ({ programId, program }: { programId: string; program: string }) =>
				mapSolInstructionSummaries({
					instructions: [
						{
							program,
							programId,
							parsed: {
								type: 'closeAccount',
								info: {
									account: mockAtaAddress2,
									destination: mockSolAddress,
									owner: mockSolAddress
								}
							}
						}
					],
					ownedAddresses: [mockSolAddress, mockAtaAddress2],
					userAddress: mockSolAddress,
					accountLamports: { [mockAtaAddress2]: 2_039_280n },
					rentExemptMinimum: 2_039_280n
				})[0];

			expect(
				close({ programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', program: 'spl-token' })
					?.reserve
			).toBe(2_039_280n);
			expect(
				close({
					programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
					program: 'spl-token'
				})
			).not.toHaveProperty('reserve');
		});

		// The run's single map of mints is written by the last initialisation. An address reopened
		// for another mint later in the message would lend its first close that later mint - the
		// wrong kind, the wrong label, and no split of the wrapped SOL out of the payout.
		it('should read the mint a close was opened with, not the one opened after it', () => {
			const x = mockAtaAddress2;
			const bonk = 'bonkMint1111111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [{ programId: 'evi1Program11111111111111111111111111111111' }],
				innerInstructions: [
					{
						index: 0,
						instructions: [
							{
								program: 'spl-token',
								programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								parsed: {
									type: 'closeAccount',
									info: { account: x, destination: mockSolAddress, owner: mockSolAddress }
								}
							},
							{
								program: 'system',
								programId: '11111111111111111111111111111111',
								parsed: {
									type: 'createAccount',
									info: {
										newAccount: x,
										lamports: 2_039_280,
										owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
										source: mockSolAddress,
										space: 165
									}
								}
							},
							{
								program: 'spl-token',
								programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								parsed: {
									type: 'initializeAccount3',
									info: { account: x, mint: bonk, owner: mockSolAddress }
								}
							}
						]
					}
				],
				ownedAddresses: [mockSolAddress, x],
				userAddress: mockSolAddress,
				addressToToken: { [x]: bonk },
				accountHolders: { [x]: mockSolAddress },
				accountMintsBefore: { [x]: WSOL_TOKEN.address },
				accountLamports: { [mockSolAddress]: 10_000_000n, [x]: 2_039_280n + 5_000_000_000n },
				accountTokenAmounts: { [x]: 5_000_000_000n },
				rentExemptMinimum: 2_039_280n
			});

			const [close] = views
				.flatMap((view) => view.children ?? [view])
				.filter(({ kind }) => kind === 'unwrap' || kind === 'closeTokenAccount');

			expect(close?.kind).toBe('unwrap');
			expect(close?.tokenAddress).toBe(WSOL_TOKEN.address);
			expect(close?.wrapped).toBe(5_000_000_000n);
		});

		// For an address the message never opens, the account is the same one throughout and the
		// run's map is the only reading there may be.
		it("should take the run's mint for an account the message never opens", () => {
			const x = mockAtaAddress2;

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'closeAccount',
							info: { account: x, destination: mockSolAddress, owner: mockSolAddress }
						}
					}
				],
				ownedAddresses: [mockSolAddress, x],
				userAddress: mockSolAddress,
				addressToToken: { [x]: WSOL_TOKEN.address }
			});

			expect(views[0]?.kind).toBe('unwrap');
		});

		// A hand-over of ownership changes who may act on an account, not whose lamports it holds.
		// Following it let a message hand the user's account to a program's own address and close
		// it to a stranger, with the close read as the program's and never refused.
		it('should keep an account with the user through a hand-over to its close', () => {
			const x = mockAtaAddress2;
			const pda = 'programDerived1111111111111111111111111111';
			const stranger = 'stranger1111111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [{ programId: 'evi1Program11111111111111111111111111111111' }],
				innerInstructions: [
					{
						index: 0,
						instructions: [
							{
								program: 'spl-token',
								programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								parsed: {
									type: 'setAuthority',
									info: {
										account: x,
										authority: mockSolAddress,
										authorityType: 'accountOwner',
										newAuthority: pda
									}
								}
							},
							{
								program: 'spl-token',
								programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								parsed: {
									type: 'closeAccount',
									info: { account: x, destination: stranger, owner: pda }
								}
							}
						]
					}
				],
				ownedAddresses: [mockSolAddress, x],
				userAddress: mockSolAddress,
				accountHolders: { [x]: mockSolAddress },
				accountLamports: { [mockSolAddress]: 10_000_000n, [x]: 2_039_280n }
			});

			expect(solClosesPayOthers({ instructions: views, userAddress: mockSolAddress })).toBeTruthy();
		});

		// By the same rule an account handed to the user stays whoever's it was, so closing it back
		// to that holder is nothing of the user's.
		it('should not give the user an account by handing it to them', () => {
			const x = mockAtaAddress2;

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'setAuthority',
							info: {
								account: x,
								authority: mockSolAddress2,
								authorityType: 'accountOwner',
								newAuthority: mockSolAddress
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'closeAccount',
							info: { account: x, destination: mockSolAddress2, owner: mockSolAddress }
						}
					}
				],
				ownedAddresses: [mockSolAddress],
				userAddress: mockSolAddress,
				accountHolders: { [x]: mockSolAddress2 },
				accountLamports: { [x]: 2_039_280n }
			});

			expect(views.find(({ kind }) => kind === 'closeTokenAccount')).toBeUndefined();
		});

		// Absent is not the same as somebody else's: an account no run read says nothing either
		// way, and calling it not theirs would drop it out of the refusal.
		it('should leave ownership unsaid for an account no run read', () => {
			const account = mockAtaAddress2;

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'closeAccount',
							info: { account, destination: mockSolAddress, owner: mockSolAddress }
						}
					}
				],
				ownedAddresses: [mockSolAddress],
				userAddress: mockSolAddress
			});

			expect(views[0]).not.toHaveProperty('ownAccount');
		});

		// The lamports arrive in the user's wallet whether or not the account was ever theirs.
		// Left out, the balance changes carry an inflow no line in the list accounts for.
		it('should list a close of an account the user does not own that pays their wallet', () => {
			const theirs = mockAtaAddress2;

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'closeAccount',
							info: { account: theirs, destination: mockSolAddress, owner: mockSolAddress2 }
						}
					}
				],
				ownedAddresses: [mockSolAddress],
				userAddress: mockSolAddress,
				accountHolders: { [theirs]: mockSolAddress2 },
				accountLamports: { [theirs]: 2_039_280n }
			});

			expect(views).toStrictEqual([
				{
					kind: 'closeTokenAccount',
					account: theirs,
					returned: 2_039_280n,
					ownAccount: false,
					counterparty: mockSolAddress,
					own: true
				}
			]);
		});

		it('should leave out a close of an account the user does not own that pays anybody else', () => {
			const theirs = mockAtaAddress2;

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'closeAccount',
							info: { account: theirs, destination: mockSolAddress2, owner: mockSolAddress2 }
						}
					}
				],
				ownedAddresses: [mockSolAddress],
				userAddress: mockSolAddress
			});

			expect(views).toStrictEqual([]);
		});

		// A close hands its whole balance to the account it names, so a chain carries the first
		// account's lamports to the last. Counting System funding alone reports the tail of the
		// chain as though it began there, understating what the final close pays out.
		it('should carry a chained close through to the last account', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const first = 'firstAccount11111111111111111111111111111111';
			const second = 'secondAccount1111111111111111111111111111111';

			const views = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'createAccount',
							info: {
								lamports: 2_039_280,
								newAccount: first,
								owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								source: owner,
								space: 165
							}
						}
					},
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'createAccount',
							info: {
								lamports: 2_039_280,
								newAccount: second,
								owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								source: owner,
								space: 165
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: first, destination: second, owner } }
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: { type: 'closeAccount', info: { account: second, destination: owner, owner } }
					}
				],
				ownedAddresses: [owner, first, second],
				userAddress: owner
			});

			const [firstClose, secondClose] = views.filter(({ kind }) => kind === 'closeTokenAccount');

			// The first hands over its own rent; the second hands over both, since the first paid
			// into it before it was closed.
			expect(firstClose?.returned).toBe(2_039_280n);
			expect(secondClose?.returned).toBe(4_078_560n);
		});

		// The balance goes wherever the close names, and that need not be the user. Left unread, a
		// hand-over of a funded account reads exactly like money coming back.
		it('should name a destination that is not the user', () => {
			const owner = 'ownerWa11etAddress1111111111111111111111111';
			const ata = 'ataAddress111111111111111111111111111111111';
			const stranger = 'strangerAddress1111111111111111111111111111';

			const [view] = mapSolInstructionSummaries({
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'closeAccount',
							info: { account: ata, destination: stranger, owner }
						}
					}
				],
				ownedAddresses: [owner, ata],
				userAddress: owner,
				accountLamports: { [ata]: 2_039_280n }
			});

			expect(view.kind).toBe('closeTokenAccount');
			expect(view.counterparty).toBe(stranger);
			expect(view.own).toBeFalsy();
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
				userAddress: owner,
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
				userAddress: owner,
				rentExemptMinimum: 2_039_280n,
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
				userAddress: owner,
				rentExemptMinimum: 2_039_280n,
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
				ownedAddresses: [owner, ata],
				userAddress: owner
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
					ownedAddresses: [owner, ata],
					userAddress: owner
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
					ownedAddresses: [owner, ata],
					userAddress: owner
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
				ownedAddresses: [owner],
				userAddress: owner
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
				userAddress: string;
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
					ownedAddresses: [me],
					userAddress: me
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
							userAddress: me,
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
					ownedAddresses: [me],
					userAddress: me
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
					ownedAddresses: [me, mockAtaAddress],
					userAddress: me
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
					ownedAddresses: [me, mockAtaAddress],
					userAddress: me
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
					ownedAddresses: [me, mockAtaAddress],
					userAddress: me
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
					ownedAddresses: [me, mockAtaAddress],
					userAddress: me
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
					ownedAddresses: [me, mockAtaAddress],
					userAddress: me
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
					ownedAddresses: [me, mockAtaAddress],
					userAddress: me
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
					ownedAddresses: [me, mockAtaAddress],
					userAddress: me
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
						ownedAddresses: [me],
						userAddress: me
					})
				).not.toThrow();
			});
		});

		describe('instructions it cannot read', () => {
			it('should ignore an instruction the RPC did not parse', () => {
				expect(
					mapSolInstructionSummaries({
						instructions: [{ programId: 'SomeUnknownProgram', accounts: [], data: 'AQID' }],
						ownedAddresses: ['ownerWa11etAddress1111111111111111111111111'],
						userAddress: 'ownerWa11etAddress1111111111111111111111111'
					})
				).toStrictEqual([]);
			});

			it('should ignore a transaction with no instructions at all', () => {
				expect(
					mapSolInstructionSummaries({
						instructions: [],
						ownedAddresses: [],
						userAddress: undefined
					})
				).toStrictEqual([]);
			});

			it('should keep a line naming the program when asked to list what it cannot read', () => {
				expect(
					mapSolInstructionSummaries({
						instructions: [{ programId: 'SomeUnknownProgram', accounts: [], data: 'AQID' }],
						ownedAddresses: ['ownerWa11etAddress1111111111111111111111111'],
						userAddress: 'ownerWa11etAddress1111111111111111111111111',
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
						userAddress: 'ownerWa11etAddress1111111111111111111111111',
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
			// wallet cannot read listed nothing whatsoever before. Its `initializeAccount` is not
			// among them - that one is read and deliberately left unstated, so it is not listed as
			// something nothing could read.
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
				).toStrictEqual(['unknown', 'unknown', 'unknown']);
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

	describe('solOpensAccountBeyondRent', () => {
		// What mainnet charged a token account to exist on 2026-10-06.
		const rentExemptMinimum = 1_488_440n;

		const opening = ({
			type = 'createAccount',
			lamports,
			space,
			owner = 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'
		}: {
			type?: string;
			lamports: bigint;
			space: bigint;
			owner?: string;
		}) => [
			{
				index: 0,
				instructions: [
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type,
							info: {
								source: mockSolAddress,
								newAccount: mockSolAddress2,
								lamports: Number(lamports),
								space: Number(space),
								owner
							}
						}
					}
				]
			}
		];

		it('should not judge an opening funded with exactly its rent', () => {
			expect(
				solOpensAccountBeyondRent({
					innerInstructions: opening({ lamports: 41_899_840n, space: 8_120n }),
					rentExemptMinimum
				})
			).toBeFalsy();
		});

		it('should flag an opening funded a lamport above its rent', () => {
			expect(
				solOpensAccountBeyondRent({
					innerInstructions: opening({ lamports: 41_899_841n, space: 8_120n }),
					rentExemptMinimum
				})
			).toBeTruthy();
		});

		it('should flag the seed-derived form on the same terms', () => {
			expect(
				solOpensAccountBeyondRent({
					innerInstructions: opening({
						type: 'createAccountWithSeed',
						lamports: 1_488_441n,
						space: 165n
					}),
					rentExemptMinimum
				})
			).toBeTruthy();
		});

		it("should not judge the run without the chain's reserve", () => {
			expect(
				solOpensAccountBeyondRent({
					innerInstructions: opening({ lamports: 1_000_000_000n, space: 165n }),
					rentExemptMinimum: undefined
				})
			).toBeFalsy();
		});

		// Nothing governs a System-owned account's lamports but its key, so none of them is rent.
		it('should flag a System-owned opening whatever its funding', () => {
			expect(
				solOpensAccountBeyondRent({
					innerInstructions: opening({
						lamports: 650_240n,
						space: ZERO,
						owner: '11111111111111111111111111111111'
					}),
					rentExemptMinimum
				})
			).toBeTruthy();
		});

		it("should flag a System-owned seed-derived opening without the chain's reserve", () => {
			expect(
				solOpensAccountBeyondRent({
					innerInstructions: opening({
						type: 'createAccountWithSeed',
						lamports: 650_240n,
						space: ZERO,
						owner: '11111111111111111111111111111111'
					}),
					rentExemptMinimum: undefined
				})
			).toBeTruthy();
		});

		it('should not judge the Meteora DLMM position, opened with exactly its rent', () => {
			expect(
				solOpensAccountBeyondRent({
					innerInstructions: MOCK_SOL_METEORA_DLMM_OPEN_POSITION.innerInstructions,
					rentExemptMinimum: MOCK_SOL_METEORA_DLMM_OPEN_POSITION.rentExemptMinimum
				})
			).toBeFalsy();
		});
	});
});
