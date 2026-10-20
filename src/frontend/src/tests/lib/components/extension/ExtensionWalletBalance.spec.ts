import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import ExtensionWalletBalance from '$lib/components/extension/ExtensionWalletBalance.svelte';
import { TOKEN_SKELETON_TEXT } from '$lib/constants/test-ids.constants';
import * as balancesDerived from '$lib/derived/balances.derived';
import * as networkTokensUiDerived from '$lib/derived/network-tokens-ui.derived';
import type { TokenUi } from '$lib/types/token-ui';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

const eth: TokenUi = { ...ETHEREUM_TOKEN, balance: 1_000_000_000_000_000_000n, usdBalance: 2000 };

describe('ExtensionWalletBalance', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(networkTokensUiDerived, 'enabledFungibleNetworkTokensUi', 'get').mockReturnValue(
			readable([eth])
		);
		vi.spyOn(balancesDerived, 'providersUsdBalance', 'get').mockReturnValue(readable(50));
		vi.spyOn(balancesDerived, 'noPositiveBalanceAndNotAllBalancesZero', 'get').mockReturnValue(
			readable(false)
		);
	});

	it("shows OISY's home total with all networks: tokens plus provider value", () => {
		const { getByText } = render(ExtensionWalletBalance);

		expect(getByText('$2,050.00')).toBeInTheDocument();
		expect(getByText(en.hero.text.available_balance)).toBeInTheDocument();
	});

	it('offers no actions', () => {
		const { container } = render(ExtensionWalletBalance);

		expect(container.querySelector('button')).toBeNull();
	});

	it('shows a placeholder while balances load, as OISY does', () => {
		vi.spyOn(balancesDerived, 'noPositiveBalanceAndNotAllBalancesZero', 'get').mockReturnValue(
			readable(true)
		);

		const { getByTestId } = render(ExtensionWalletBalance);

		expect(getByTestId(TOKEN_SKELETON_TEXT)).toBeInTheDocument();
	});
});
