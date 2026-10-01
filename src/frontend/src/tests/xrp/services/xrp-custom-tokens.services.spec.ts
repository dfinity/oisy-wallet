import type { CustomToken } from '$declarations/backend/backend.did';
import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import * as customTokensServices from '$lib/services/custom-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockRlusdCurrencyCode, mockRlusdIssuer, mockXrpAddress2 } from '$tests/mocks/xrp.mock';
import { loadCustomTokens, processCustomTokens } from '$xrp/services/xrp-custom-tokens.services';
import { xrpCustomTokensStore } from '$xrp/stores/xrp-custom-tokens.store';
import { toNullable } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

vi.mock('$lib/services/custom-tokens.services');

vi.mock(import('@dfinity/utils'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		queryAndUpdate: vi.fn(async ({ request, onLoad, onUpdateError, identity }) => {
			try {
				const response = await request({ identity, certified: true });
				onLoad({ response, certified: true });
			} catch (error) {
				onUpdateError?.({ error });
			}
		})
	};
});

describe('xrp-custom-tokens.services', () => {
	const rlusdEntry: CustomToken = {
		token: { XrpTrustLineMainnet: { currency: mockRlusdCurrencyCode, issuer: mockRlusdIssuer } },
		enabled: false,
		version: toNullable(4n),
		section: toNullable(),
		allow_external_content_source: toNullable(),
		allowed_external_content_source_urls: toNullable()
	};

	const usdEntry: CustomToken = {
		...rlusdEntry,
		token: { XrpTrustLineMainnet: { currency: 'USD', issuer: mockXrpAddress2 } },
		enabled: true,
		version: toNullable()
	};

	const icrcEntry: CustomToken = {
		...rlusdEntry,
		token: {
			Icrc: { ledger_id: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'), index_id: toNullable() }
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
		xrpCustomTokensStore.reset();
	});

	describe('processCustomTokens', () => {
		it('keeps the trust-line entries of the list, as tokens with their state', async () => {
			await processCustomTokens({
				identity: mockIdentity,
				certified: true,
				tokens: [rlusdEntry, icrcEntry, usdEntry]
			});

			const data = get(xrpCustomTokensStore);

			expect(data?.certified).toBeTruthy();
			expect(data?.tokens).toHaveLength(2);
			expect(data?.tokens[0]).toEqual({ ...RLUSD_TOKEN, enabled: false, version: 4n });
			expect(data?.tokens[1]).toEqual(
				expect.objectContaining({
					currency: 'USD',
					issuer: mockXrpAddress2,
					symbol: 'USD',
					enabled: true
				})
			);
			expect(data?.tokens[1]).not.toHaveProperty('version');
		});

		it('records that the list is not certified yet', async () => {
			await processCustomTokens({ identity: mockIdentity, certified: false, tokens: [rlusdEntry] });

			expect(get(xrpCustomTokensStore)?.certified).toBeFalsy();
		});

		it('fetches the list when none is given', async () => {
			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockResolvedValue([usdEntry]);

			await processCustomTokens({ identity: mockIdentity, certified: true });

			expect(customTokensServices.loadNetworkCustomTokens).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				certified: true
			});
			expect(get(xrpCustomTokensStore)?.tokens).toHaveLength(1);
		});

		it('keeps the previous list and reports a certified failure', async () => {
			await processCustomTokens({ identity: mockIdentity, certified: true, tokens: [rlusdEntry] });

			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockRejectedValue(new Error('fail'));
			const toastsSpy = vi.spyOn(toastsStore, 'toastsError');

			await processCustomTokens({ identity: mockIdentity, certified: true });

			expect(get(xrpCustomTokensStore)?.tokens).toHaveLength(1);
			expect(toastsSpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ msg: { text: get(i18n).init.error.xrp_custom_tokens } })
			);
		});

		it('does not report an uncertified failure', async () => {
			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockRejectedValue(new Error('fail'));
			const toastsSpy = vi.spyOn(toastsStore, 'toastsError');

			await processCustomTokens({ identity: mockIdentity, certified: false });

			expect(toastsSpy).not.toHaveBeenCalled();
			expect(get(xrpCustomTokensStore)).toBeUndefined();
		});
	});

	describe('loadCustomTokens', () => {
		it('loads the list into the store', async () => {
			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockResolvedValue([rlusdEntry]);

			await loadCustomTokens({ identity: mockIdentity });

			expect(get(xrpCustomTokensStore)).toEqual({
				tokens: [{ ...RLUSD_TOKEN, enabled: false, version: 4n }],
				certified: true
			});
		});

		it('keeps the previous list and reports a failure', async () => {
			xrpCustomTokensStore.set({ tokens: [{ ...RLUSD_TOKEN, enabled: false }], certified: true });

			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockRejectedValue(new Error('fail'));
			const toastsSpy = vi.spyOn(toastsStore, 'toastsError');

			await loadCustomTokens({ identity: mockIdentity });

			expect(get(xrpCustomTokensStore)?.tokens).toHaveLength(1);
			expect(toastsSpy).toHaveBeenCalledOnce();
		});
	});
});
