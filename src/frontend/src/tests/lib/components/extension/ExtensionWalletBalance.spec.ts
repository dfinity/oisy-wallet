import ExtensionWalletBalance from '$lib/components/extension/ExtensionWalletBalance.svelte';
import { RECEIVE_TOKENS_MODAL_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('ExtensionWalletBalance', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPage.mockUrl(new URL('http://localhost:5175/extension/panel/'));
	});

	it("offers OISY's Receive and Open OISY instead of the app's actions", () => {
		const { getByTestId, getByRole, queryByRole } = render(ExtensionWalletBalance);

		expect(getByTestId(RECEIVE_TOKENS_MODAL_OPEN_BUTTON)).toBeInTheDocument();
		expect(getByRole('button', { name: en.extension.panel.open_oisy })).toBeInTheDocument();
		expect(queryByRole('button', { name: en.send.text.send })).not.toBeInTheDocument();
		expect(queryByRole('button', { name: en.swap.text.swap })).not.toBeInTheDocument();
	});

	it('opens OISY in a new tab', async () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		const { getByRole } = render(ExtensionWalletBalance);

		await fireEvent.click(getByRole('button', { name: en.extension.panel.open_oisy }));

		expect(open).toHaveBeenCalledExactlyOnceWith(
			'http://localhost:5175',
			'_blank',
			'noopener,noreferrer'
		);
	});
});
