import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import * as trustLineTokensEnv from '$env/xrp-trust-line-tokens.env';
import * as analyticsServices from '$lib/services/analytics.services';
import * as saveCustomTokensServices from '$lib/services/save-custom-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { token } from '$lib/stores/token.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockXrpTrustLine } from '$tests/mocks/xrp.mock';
import XrpHideTokenModal from '$xrp/components/tokens/XrpHideTokenModal.svelte';
import { xrpCustomTokensStore } from '$xrp/stores/xrp-custom-tokens.store';
import { xrpTrustLinesStore } from '$xrp/stores/xrp-trust-lines.store';
import type { XrpTrustLineCustomToken } from '$xrp/types/xrp-trust-line-token';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$lib/services/save-custom-tokens.services', () => ({
	saveCustomTokens: vi.fn()
}));

vi.mock('$lib/utils/nav.utils', () => ({
	back: vi.fn(),
	gotoReplaceRoot: vi.fn()
}));

describe('XrpHideTokenModal', () => {
	const shownRlusd = { ...RLUSD_TOKEN, enabled: true, version: 2n };

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(trustLineTokensEnv, 'XRP_TRUST_LINE_TOKENS_ENABLED', 'get').mockReturnValue(true);
		vi.mocked(saveCustomTokensServices.saveCustomTokens).mockResolvedValue(undefined);
		vi.spyOn(analyticsServices, 'trackEvent').mockImplementation(() => {});

		mockAuthStore();

		xrpTrustLinesStore.set({ tokenId: XRP_TOKEN.id, lines: [mockXrpTrustLine] });
		xrpCustomTokensStore.set({ tokens: [shownRlusd], certified: true });

		mockPage.mockToken(RLUSD_TOKEN);
		token.set(shownRlusd);
	});

	afterEach(() => {
		xrpTrustLinesStore.clear(XRP_TOKEN.id);
		xrpCustomTokensStore.reset();
		mockPage.reset();
		token.reset();
	});

	it('saves the token as disabled, with its version, and nothing else', async () => {
		const { getByText } = render(XrpHideTokenModal);

		await fireEvent.click(getByText(get(i18n).tokens.hide.confirm));

		await waitFor(() => {
			expect(saveCustomTokensServices.saveCustomTokens).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [{ ...shownRlusd, networkKey: 'XrpTrustLineMainnet', enabled: false }]
			});
		});
	});

	it('tracks the hiding under the token’s currency and issuer', async () => {
		const { getByText } = render(XrpHideTokenModal);

		await fireEvent.click(getByText(get(i18n).tokens.hide.confirm));

		await waitFor(() => {
			expect(analyticsServices.trackEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						address: `${RLUSD_TOKEN.currency}.${RLUSD_TOKEN.issuer}`,
						tokenStandard: 'xrp-trust-line'
					})
				})
			);
		});
	});

	it('refuses a token without a currency and an issuer', async () => {
		const withoutCurrency: XrpTrustLineCustomToken = { ...shownRlusd, currency: '' };
		token.set(withoutCurrency);
		const toastsSpy = vi.spyOn(toastsStore, 'toastsError');

		const { getByText } = render(XrpHideTokenModal);

		await fireEvent.click(getByText(get(i18n).tokens.hide.confirm));

		expect(toastsSpy).toHaveBeenCalledOnce();
		expect(saveCustomTokensServices.saveCustomTokens).not.toHaveBeenCalled();
	});
});
