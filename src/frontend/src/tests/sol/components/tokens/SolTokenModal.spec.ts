import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { modalStore } from '$lib/stores/modal.store';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import SplTokenModal from '$sol/components/tokens/SolTokenModal.svelte';
import { enabledSplTokens } from '$sol/derived/spl.derived';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSplCustomToken } from '$tests/mocks/spl-tokens.mock';
import { render } from '@testing-library/svelte';

describe('SolTokenModal', () => {
	beforeEach(() => {
		mockPage.reset();
	});

	it('displays all required values including the delete button', () => {
		vi.spyOn(enabledSplTokens, 'subscribe').mockImplementation((fn) => {
			fn([mockSplCustomToken]);
			return () => {};
		});

		mockPage.mock({
			token: mockSplCustomToken.name,
			network: mockSplCustomToken.network.id.description
		});

		const { container } = render(SplTokenModal);

		modalStore.openSolToken({ id: mockSplCustomToken.id, data: undefined });

		expect(container).toHaveTextContent(mockSplCustomToken.network.name);
		expect(container).toHaveTextContent(mockSplCustomToken.name);
		expect(container).toHaveTextContent(mockSplCustomToken.symbol);
		expect(container).toHaveTextContent(
			shortenWithMiddleEllipsis({ text: mockSplCustomToken.address })
		);
		expect(container).toHaveTextContent(`${mockSplCustomToken.decimals}`);
		expect(container).toHaveTextContent(en.tokens.text.delete_token);
	});

	it('displays all required values without the delete button for a default SPL token', () => {
		mockPage.mock({
			token: SOLANA_TOKEN.name,
			network: SOLANA_TOKEN.network.id.description
		});

		const { container } = render(SplTokenModal);

		modalStore.openSolToken({ id: SOLANA_TOKEN.id, data: undefined });

		expect(container).toHaveTextContent(SOLANA_TOKEN.network.name);
		expect(container).toHaveTextContent(SOLANA_TOKEN.name);
		expect(container).toHaveTextContent(SOLANA_TOKEN.symbol);
		expect(container).toHaveTextContent(`${SOLANA_TOKEN.decimals}`);
		expect(container).not.toHaveTextContent(en.tokens.text.delete_token);
	});
});
