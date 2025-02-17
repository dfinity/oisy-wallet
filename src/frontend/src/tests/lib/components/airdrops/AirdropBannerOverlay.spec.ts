import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import AirdropBannerOverlay from '$lib/components/airdrops/AirdropBannerOverlay.svelte';
import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import { formatToken, formatUSD } from '$lib/utils/format.utils';
import { render } from '@testing-library/svelte';
import { BigNumber } from 'alchemy-sdk';
import { get } from 'svelte/store';

describe('AirdropBannerOverlay', () => {
	Object.defineProperty(window, 'navigator', {
		writable: true,
		value: {
			userAgentData: {
				mobile: false
			}
		}
	});

	it('should render overlay content with balance', () => {
		const token = ICP_TOKEN;
		const balance: BigNumber = BigNumber.from(10000000);
		const usdBalance = 7.22;

		const { getByText } = render(AirdropBannerOverlay, {
			props: {
				token,
				balance,
				usdBalance
			}
		});

		expect(getByText(token.symbol)).toBeInTheDocument();

		const expectedBalance: string = formatToken({
			value: balance,
			unitName: token.decimals,
			displayDecimals: EIGHT_DECIMALS,
			showPlusSign: false
		});
		expect(getByText(expectedBalance)).toBeInTheDocument();

		const expectedUsdBalance: string = formatUSD({ value: usdBalance });
		expect(getByText(expectedUsdBalance)).toBeInTheDocument();
	});

	it('should render overlay content without balance', () => {
		const token = ICP_TOKEN;

		const { getByText } = render(AirdropBannerOverlay, {
			props: {
				token,
				balance: undefined,
				usdBalance: undefined
			}
		});

		expect(getByText(get(i18n).airdrops.text.no_balance_title)).toBeInTheDocument();
		expect(getByText(get(i18n).airdrops.text.no_balance_description)).toBeInTheDocument();
	});
});
