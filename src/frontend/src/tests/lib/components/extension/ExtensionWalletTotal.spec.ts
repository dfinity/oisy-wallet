import ExtensionWalletTotal from '$lib/components/extension/ExtensionWalletTotal.svelte';
import { TOKEN_SKELETON_TEXT } from '$lib/constants/test-ids.constants';
import * as settingsDerived from '$lib/derived/settings.derived';
import { Currency } from '$lib/enums/currency';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

const props = {
	usdTotal: 1234.5,
	currency: Currency.USD,
	exchangeRate: {
		currency: Currency.USD,
		exchangeRateToUsd: 1,
		exchangeRate24hChangeMultiplier: null
	},
	label: 'Your balance'
};

describe('ExtensionWalletTotal', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(settingsDerived, 'isPrivacyMode', 'get').mockReturnValue(readable(false));
	});

	it('shows the total and its label as plain text', () => {
		const { getByText, container } = render(ExtensionWalletTotal, { props });

		expect(getByText('$1,234.50')).toBeInTheDocument();
		expect(getByText('Your balance')).toBeInTheDocument();
		expect(container.querySelector('button')).toBeNull();
	});

	it('converts to the chosen currency', () => {
		const { getByText } = render(ExtensionWalletTotal, {
			props: {
				...props,
				currency: Currency.EUR,
				exchangeRate: {
					currency: Currency.EUR,
					exchangeRateToUsd: 2,
					exchangeRate24hChangeMultiplier: null
				}
			}
		});

		expect(getByText(/617\.25/)).toBeInTheDocument();
	});

	it('shows a placeholder while loading, and without an exchange rate', () => {
		const loading = render(ExtensionWalletTotal, { props: { ...props, loading: true } });

		expect(loading.getByTestId(TOKEN_SKELETON_TEXT)).toBeInTheDocument();
		expect(loading.queryByText('$1,234.50')).not.toBeInTheDocument();

		loading.unmount();

		const noRate = render(ExtensionWalletTotal, {
			props: {
				...props,
				currency: Currency.EUR,
				exchangeRate: {
					currency: Currency.EUR,
					exchangeRateToUsd: null,
					exchangeRate24hChangeMultiplier: null
				}
			}
		});

		expect(noRate.getByTestId(TOKEN_SKELETON_TEXT)).toBeInTheDocument();
	});

	it('hides the total in privacy mode', () => {
		vi.spyOn(settingsDerived, 'isPrivacyMode', 'get').mockReturnValue(readable(true));

		const { queryByText, getByText } = render(ExtensionWalletTotal, { props });

		expect(queryByText('$1,234.50')).not.toBeInTheDocument();
		expect(getByText('Your balance')).toBeInTheDocument();
	});
});
