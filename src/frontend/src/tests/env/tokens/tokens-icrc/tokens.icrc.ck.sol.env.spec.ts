import type * as AppConstants from '$lib/constants/app.constants';

type BuildFlavour = Partial<Pick<typeof AppConstants, 'LOCAL' | 'STAGING' | 'BETA' | 'PROD'>>;

describe('tokens.icrc.ck.sol.env', () => {
	afterEach(() => {
		vi.doUnmock('$lib/constants/app.constants');
		vi.resetModules();
	});

	// The rollout flag and the token both read the build flavour at import, so the
	// constants are mocked and the modules imported again for each flavour.
	const importForFlavour = async (flavour: BuildFlavour) => {
		vi.doMock('$lib/constants/app.constants', async (importOriginal) => ({
			...(await importOriginal<typeof AppConstants>()),
			LOCAL: false,
			STAGING: false,
			BETA: false,
			PROD: false,
			...flavour
		}));

		vi.resetModules();

		const { CKSOL_IC_DATA, ICRC_CK_SOL_TOKENS } =
			await import('$env/tokens/tokens-icrc/tokens.icrc.ck.sol.env');
		const { SOLANA_TOKEN } = await import('$env/tokens/tokens.sol.env');
		const { SOL_TOKEN_GROUP } = await import('$env/tokens/groups/groups.sol.env');

		return { CKSOL_IC_DATA, ICRC_CK_SOL_TOKENS, SOLANA_TOKEN, SOL_TOKEN_GROUP };
	};

	it('should list mainnet ckSOL as the twin of SOL, grouped with it, on staging', async () => {
		const { CKSOL_IC_DATA, ICRC_CK_SOL_TOKENS, SOLANA_TOKEN, SOL_TOKEN_GROUP } =
			await importForFlavour({ STAGING: true });

		expect(CKSOL_IC_DATA).toEqual({
			ledgerCanisterId: 'ls5lp-lqaaa-aaaar-qb5oa-cai',
			indexCanisterId: '2ezyf-hqaaa-aaaar-qb6ga-cai',
			minterCanisterId: 'lh22c-kyaaa-aaaar-qb5nq-cai',
			exchangeCoinId: 'solana',
			twinToken: SOLANA_TOKEN,
			groupData: SOL_TOKEN_GROUP
		});
		expect(ICRC_CK_SOL_TOKENS).toEqual([CKSOL_IC_DATA]);
		expect(SOLANA_TOKEN.groupData).toEqual(SOL_TOKEN_GROUP);
	});

	it('should list no ckSOL on local builds, which reach no mainnet canister', async () => {
		const { CKSOL_IC_DATA, ICRC_CK_SOL_TOKENS } = await importForFlavour({ LOCAL: true });

		expect(CKSOL_IC_DATA).toBeUndefined();
		expect(ICRC_CK_SOL_TOKENS).toEqual([]);
	});

	it.each<BuildFlavour>([{ BETA: true }, { PROD: true }])(
		'should list no ckSOL and leave SOL ungrouped while the flag is off: %o',
		async (flavour) => {
			const { CKSOL_IC_DATA, ICRC_CK_SOL_TOKENS, SOLANA_TOKEN } = await importForFlavour(flavour);

			expect(CKSOL_IC_DATA).toBeUndefined();
			expect(ICRC_CK_SOL_TOKENS).toEqual([]);
			expect(SOLANA_TOKEN.groupData).toBeUndefined();
		}
	);

	it('should name ckSOL as the twin symbol of SOL', async () => {
		const { SOLANA_TOKEN } = await importForFlavour({ PROD: true });

		expect(SOLANA_TOKEN.twinTokenSymbol).toBe('ckSOL');
	});
});
