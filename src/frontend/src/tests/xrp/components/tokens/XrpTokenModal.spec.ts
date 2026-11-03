import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { modalStore } from '$lib/stores/modal.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import XrpTokenModal from '$xrp/components/tokens/XrpTokenModal.svelte';
import { render } from '@testing-library/svelte';

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
});
