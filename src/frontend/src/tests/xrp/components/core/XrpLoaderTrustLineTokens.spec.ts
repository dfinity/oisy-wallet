import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockXrpAddress2 } from '$tests/mocks/xrp.mock';
import XrpLoaderTrustLineTokens from '$xrp/components/core/XrpLoaderTrustLineTokens.svelte';
import * as xrpTrustLineTokensDerived from '$xrp/derived/xrp-trust-line-tokens.derived';
import * as xrpTrustLineTokensServices from '$xrp/services/xrp-trust-line-tokens.services';
import type { XrpTrustLineCustomToken } from '$xrp/types/xrp-trust-line-token';
import { toXrpTrustLineToken } from '$xrp/utils/xrp-trust-line-tokens.utils';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

vi.mock('$xrp/services/xrp-trust-line-tokens.services', () => ({
	saveUnsavedXrpTrustLineTokens: vi.fn()
}));

describe('XrpLoaderTrustLineTokens', () => {
	const unsaved = toXrpTrustLineToken({
		identity: { currency: 'USD', issuer: mockXrpAddress2 },
		network: XRP_MAINNET_NETWORK
	});

	const mockUnsaved = (tokens: XrpTrustLineCustomToken[]) =>
		vi
			.spyOn(xrpTrustLineTokensDerived, 'xrpUnsavedTrustLineTokens', 'get')
			.mockReturnValue(readable(tokens));

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('saves the held tokens the backend has no entry for', () => {
		mockAuthStore();
		mockUnsaved([unsaved]);

		render(XrpLoaderTrustLineTokens);

		expect(
			xrpTrustLineTokensServices.saveUnsavedXrpTrustLineTokens
		).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			tokens: [unsaved]
		});
	});

	it('saves nothing when every held token has an entry', () => {
		mockAuthStore();
		mockUnsaved([]);

		render(XrpLoaderTrustLineTokens);

		expect(xrpTrustLineTokensServices.saveUnsavedXrpTrustLineTokens).not.toHaveBeenCalled();
	});

	it('saves nothing while signed out', () => {
		mockAuthStore(null);
		mockUnsaved([unsaved]);

		render(XrpLoaderTrustLineTokens);

		expect(xrpTrustLineTokensServices.saveUnsavedXrpTrustLineTokens).not.toHaveBeenCalled();
	});
});
