import EthTokenModal from '$eth/components/tokens/EthTokenModal.svelte';
import { enabledErc20Tokens, erc20DefaultTokens } from '$eth/derived/erc20.derived';
import { modalStore } from '$lib/stores/modal.store';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSplCustomToken } from '$tests/mocks/spl-tokens.mock';
import { render } from '@testing-library/svelte';

describe('EthTokenModal', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockPage.reset();

		vi.spyOn(enabledErc20Tokens, 'subscribe').mockImplementation((fn) => {
			fn([{ ...mockValidErc20Token, enabled: true }]);
			return () => {};
		});

		mockPage.mock({
			token: mockValidErc20Token.name,
			network: mockValidErc20Token.network.id.description
		});
	});

	it('displays all required values including the delete button', () => {
		const { container } = render(EthTokenModal);

		modalStore.openBtcToken({ id: mockValidErc20Token.id, data: undefined });

		expect(container).toHaveTextContent(mockValidErc20Token.network.name);
		expect(container).toHaveTextContent(mockValidErc20Token.name);
		expect(container).toHaveTextContent(mockValidErc20Token.symbol);
		expect(container).toHaveTextContent(
			shortenWithMiddleEllipsis({ text: mockValidErc20Token.address })
		);
		expect(container).toHaveTextContent(`${mockSplCustomToken.decimals}`);

		expect(container).toHaveTextContent(en.tokens.text.delete_token);
	});

	it('displays all required values without the delete button for a default token', () => {
		vi.spyOn(erc20DefaultTokens, 'subscribe').mockImplementation((fn) => {
			fn([mockValidErc20Token]);
			return () => {};
		});

		const { container } = render(EthTokenModal);

		modalStore.openBtcToken({ id: mockValidErc20Token.id, data: undefined });

		expect(container).toHaveTextContent(mockValidErc20Token.network.name);
		expect(container).toHaveTextContent(mockValidErc20Token.name);
		expect(container).toHaveTextContent(mockValidErc20Token.symbol);
		expect(container).toHaveTextContent(
			shortenWithMiddleEllipsis({ text: mockValidErc20Token.address })
		);
		expect(container).toHaveTextContent(`${mockSplCustomToken.decimals}`);

		expect(container).not.toHaveTextContent(en.tokens.text.delete_token);
	});
});
