import { modalStore } from '$lib/stores/modal.store';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import SplTokenModal from '$sol/components/tokens/SolTokenModal.svelte';
import { enabledSplTokens } from '$sol/derived/spl.derived';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSplCustomToken } from '$tests/mocks/spl-tokens.mock';
import { render } from '@testing-library/svelte';

describe('SolTokenModal', () => {
	beforeEach(() => {
		mockPage.reset();
	});

	it('displays all required values', () => {
		vi.spyOn(enabledSplTokens, 'subscribe').mockImplementation((fn) => {
			fn([mockSplCustomToken]);
			return () => {};
		});

		mockPage.mock({
			token: mockSplCustomToken.name,
			network: mockSplCustomToken.network.id.description
		});

		const { container } = render(SplTokenModal);

		modalStore.openBtcToken(mockSplCustomToken.id);

		expect(container).toHaveTextContent(mockSplCustomToken.network.name);
		expect(container).toHaveTextContent(mockSplCustomToken.name);
		expect(container).toHaveTextContent(mockSplCustomToken.symbol);
		expect(container).toHaveTextContent(
			shortenWithMiddleEllipsis({ text: mockSplCustomToken.address })
		);
		expect(container).toHaveTextContent(`${mockSplCustomToken.decimals}`);
	});
});
