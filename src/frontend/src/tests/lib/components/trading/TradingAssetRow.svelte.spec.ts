import TradingAssetRow from '$lib/components/trading/TradingAssetRow.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { TRADING_ASSET_WITHDRAW_BUTTON } from '$lib/constants/test-ids.constants';
import type { OisyTradeAsset } from '$lib/types/oisy-trade';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('TradingAssetRow', () => {
	const token = { ...mockValidIcToken, symbol: 'ICP', decimals: 8 };

	const buildAsset = (overrides: Partial<OisyTradeAsset> = {}): OisyTradeAsset => ({
		token,
		free: 100000000n,
		reserved: ZERO,
		total: 100000000n,
		totalUsd: 12.34,
		freeUsd: 12.34,
		...overrides
	});

	beforeEach(() => {
		setPrivacyMode({ enabled: false });
	});

	it('should render the token symbol and the provider tag', () => {
		const { getAllByText, getByText } = render(TradingAssetRow, {
			props: { asset: buildAsset() }
		});

		expect(getAllByText('ICP').length).toBeGreaterThan(0);
		expect(getByText(en.trading.text.provider_name)).toBeInTheDocument();
	});

	it('should render the total amount when not in privacy mode', () => {
		const { getByText } = render(TradingAssetRow, {
			props: { asset: buildAsset() }
		});

		expect(getByText('1 ICP')).toBeInTheDocument();
	});

	it('should not render the available line when nothing is reserved', () => {
		const { queryByText } = render(TradingAssetRow, {
			props: { asset: buildAsset({ reserved: ZERO }) }
		});

		expect(queryByText(en.trading.assets.available_label)).toBeNull();
	});

	it('should render the available line when funds are reserved', () => {
		const { getByText } = render(TradingAssetRow, {
			props: {
				asset: buildAsset({ free: 40000000n, reserved: 60000000n, total: 100000000n })
			}
		});

		expect(getByText('Available: 0.4 ICP')).toBeInTheDocument();
	});

	it('should mask amounts in privacy mode', () => {
		setPrivacyMode({ enabled: true });

		const { queryByText } = render(TradingAssetRow, {
			props: { asset: buildAsset() }
		});

		expect(queryByText('1 ICP')).toBeNull();
	});

	it('should call onWithdraw with the asset when the withdraw button is clicked', async () => {
		const onWithdraw = vi.fn();
		const asset = buildAsset();

		const { getByTestId } = render(TradingAssetRow, {
			props: { asset, onWithdraw }
		});

		await fireEvent.click(getByTestId(TRADING_ASSET_WITHDRAW_BUTTON));

		expect(onWithdraw).toHaveBeenCalledExactlyOnceWith(asset);
	});
});
