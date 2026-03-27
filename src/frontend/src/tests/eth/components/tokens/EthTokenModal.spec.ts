import EthTokenModal from '$eth/components/tokens/EthTokenModal.svelte';
import { enabledErc20Tokens, erc20DefaultTokens } from '$eth/derived/erc20.derived';
import { enabledErc4626Tokens, erc4626DefaultTokens } from '$eth/derived/erc4626.derived';
import { modalStore } from '$lib/stores/modal.store';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
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

		mockPage.mockToken(mockValidErc20Token);
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

	describe('ERC4626 token', () => {
		beforeEach(() => {
			vi.resetAllMocks();
			mockPage.reset();

			vi.spyOn(enabledErc4626Tokens, 'subscribe').mockImplementation((fn) => {
				fn([{ ...mockValidErc4626Token, enabled: true }]);
				return () => {};
			});

			mockPage.mockToken(mockValidErc4626Token);
		});

		it('displays all required values including the delete button for an ERC4626 token', () => {
			const { container } = render(EthTokenModal);

			modalStore.openBtcToken({ id: mockValidErc4626Token.id, data: undefined });

			expect(container).toHaveTextContent(mockValidErc4626Token.network.name);
			expect(container).toHaveTextContent(mockValidErc4626Token.name);
			expect(container).toHaveTextContent(mockValidErc4626Token.symbol);
			expect(container).toHaveTextContent(
				shortenWithMiddleEllipsis({ text: mockValidErc4626Token.address })
			);

			expect(container).toHaveTextContent(en.tokens.text.delete_token);
		});

		it('displays all required values without the delete button for a default ERC4626 token', () => {
			vi.spyOn(erc4626DefaultTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockValidErc4626Token]);
				return () => {};
			});

			const { container } = render(EthTokenModal);

			modalStore.openBtcToken({ id: mockValidErc4626Token.id, data: undefined });

			expect(container).toHaveTextContent(mockValidErc4626Token.network.name);
			expect(container).toHaveTextContent(mockValidErc4626Token.name);
			expect(container).toHaveTextContent(mockValidErc4626Token.symbol);
			expect(container).toHaveTextContent(
				shortenWithMiddleEllipsis({ text: mockValidErc4626Token.address })
			);

			expect(container).not.toHaveTextContent(en.tokens.text.delete_token);
		});
	});
});
