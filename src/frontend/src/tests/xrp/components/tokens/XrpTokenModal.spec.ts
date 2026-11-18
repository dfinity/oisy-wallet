import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import * as trustLineTokensEnv from '$env/xrp-trust-line-tokens.env';
import { TOKEN_MODAL_CONTENT_DELETE_BUTTON } from '$lib/constants/test-ids.constants';
import * as pageTokenDerived from '$lib/derived/page-token.derived';
import { modalStore } from '$lib/stores/modal.store';
import type { OptionToken } from '$lib/types/token';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockXrpTrustLine } from '$tests/mocks/xrp.mock';
import XrpTokenModal from '$xrp/components/tokens/XrpTokenModal.svelte';
import { xrpTrustLinesStore } from '$xrp/stores/xrp-trust-lines.store';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('XrpTokenModal', () => {
	beforeEach(() => {
		mockPage.reset();
	});

	it('necessary content is displayed', () => {
		mockPage.mockToken(XRP_TOKEN);

		const { container } = render(XrpTokenModal);

		modalStore.openXrpToken({ id: XRP_TOKEN.id, data: undefined });

		expect(container).toHaveTextContent(XRP_TOKEN.network.name);
		expect(container).toHaveTextContent(XRP_TOKEN.name);
		expect(container).toHaveTextContent(XRP_TOKEN.symbol);
		expect(container).toHaveTextContent(`${XRP_TOKEN.decimals}`);
	});

	// Removing deletes the token's line on the ledger, which only an exactly zero balance allows.
	describe('Delete token', () => {
		const token = { ...RLUSD_TOKEN, enabled: true };

		const renderFor = (pageToken: OptionToken) => {
			vi.spyOn(pageTokenDerived, 'pageToken', 'get').mockReturnValue(readable(pageToken));

			return render(XrpTokenModal);
		};

		const withBalance = (balance: string) =>
			xrpTrustLinesStore.set({ tokenId: XRP_TOKEN.id, lines: [{ ...mockXrpTrustLine, balance }] });

		beforeEach(() => {
			vi.spyOn(trustLineTokensEnv, 'XRP_TRUST_LINE_TOKENS_ENABLED', 'get').mockReturnValue(true);
		});

		afterEach(() => {
			xrpTrustLinesStore.clear(XRP_TOKEN.id);
		});

		it.each(['0', '0.0'])('is offered for a trust-line token at a balance of %s', (balance) => {
			withBalance(balance);

			const { queryByTestId } = renderFor(token);

			expect(queryByTestId(TOKEN_MODAL_CONTENT_DELETE_BUTTON)).toBeInTheDocument();
		});

		// Dust below the wallet's decimals still keeps the line; the ledger's string decides.
		it.each(['12.5', '1e-20'])('is not offered at a balance of %s', (balance) => {
			withBalance(balance);

			const { queryByTestId } = renderFor(token);

			expect(queryByTestId(TOKEN_MODAL_CONTENT_DELETE_BUTTON)).not.toBeInTheDocument();
		});

		it('is not offered before the account’s lines are read', () => {
			const { queryByTestId } = renderFor(token);

			expect(queryByTestId(TOKEN_MODAL_CONTENT_DELETE_BUTTON)).not.toBeInTheDocument();
		});

		it('is not offered for native XRP', () => {
			withBalance('0');

			const { queryByTestId } = renderFor(XRP_TOKEN);

			expect(queryByTestId(TOKEN_MODAL_CONTENT_DELETE_BUTTON)).not.toBeInTheDocument();
		});

		it('is not offered while trust-line tokens are off', () => {
			vi.spyOn(trustLineTokensEnv, 'XRP_TRUST_LINE_TOKENS_ENABLED', 'get').mockReturnValue(false);
			withBalance('0');

			const { queryByTestId } = renderFor(token);

			expect(queryByTestId(TOKEN_MODAL_CONTENT_DELETE_BUTTON)).not.toBeInTheDocument();
		});
	});
});
