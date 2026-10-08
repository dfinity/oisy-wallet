/**
 * Verifies the metadata-only flag on the ICRC side: a `metadataOnly: true` entry
 * must be excluded from the visible/curated list but kept in the enrichment index
 * used to resolve manually imported tokens.
 *
 * `mapIcrcData` is mocked to return fixed data (it is covered on its own in
 * map-icrc-data.spec.ts); this isolates the metadataOnly filter / index split.
 * The module is re-imported after `vi.resetModules()` so it re-evaluates against
 * the mock.
 */
vi.mock('$icp/utils/map-icrc-data', () => ({
	mapIcrcData: () => ({
		NORM: {
			ledgerCanisterId: 'aaaaa-aa',
			name: 'Normal token',
			symbol: 'NORM',
			decimals: 8,
			fee: 1000n
		},
		META: {
			ledgerCanisterId: 'bbbbb-bb',
			name: 'Metadata-only token',
			symbol: 'META',
			decimals: 8,
			fee: 1000n,
			metadataOnly: true
		}
	})
}));

const importModule = async () => {
	vi.resetModules();
	return await import('$env/tokens/tokens-icrc/tokens.icrc.additional.env');
};

describe('tokens.icrc.additional.env - metadataOnly', () => {
	it('excludes metadata-only tokens from the visible/curated list', async () => {
		const { ADDITIONAL_ICRC_TOKENS } = await importModule();

		expect(ADDITIONAL_ICRC_TOKENS.map(({ ledgerCanisterId }) => ledgerCanisterId)).toEqual([
			'aaaaa-aa'
		]);
	});

	it('keeps metadata-only tokens in the enrichment index', async () => {
		const { ADDITIONAL_ICRC_TOKENS_INDEXED } = await importModule();

		expect(Object.keys(ADDITIONAL_ICRC_TOKENS_INDEXED).sort()).toEqual(['aaaaa-aa', 'bbbbb-bb']);
		expect(ADDITIONAL_ICRC_TOKENS_INDEXED['bbbbb-bb'].metadataOnly).toBeTruthy();
	});
});
