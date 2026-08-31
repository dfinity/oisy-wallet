import { WSOL_TOKEN } from '$env/tokens/tokens-spl/tokens.wsol.env';
import { ZERO } from '$lib/constants/app.constants';
import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
import { mapSolInstructionSummaries } from '$sol/utils/sol-instruction-summary.utils';
import { MOCK_SOL_INSTRUCTIONS } from '$tests/mocks/sol-instructions.mock';

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
		});
	});
});
