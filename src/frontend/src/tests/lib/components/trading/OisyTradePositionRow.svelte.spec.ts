import { goto } from '$app/navigation';
import OisyTradePositionRow from '$lib/components/trading/OisyTradePositionRow.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { AppPath } from '$lib/constants/routes.constants';
import type { OisyTradeAsset } from '$lib/types/oisy-trade';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('OisyTradePositionRow', () => {
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

	it('renders the token symbol and the total deposited amount', () => {
		const { getAllByText, getByText } = render(OisyTradePositionRow, {
			props: { asset: buildAsset() }
		});

		expect(getAllByText('ICP').length).toBeGreaterThan(0);
		expect(getByText('1 ICP')).toBeInTheDocument();
	});

	it('does not render the provider tag (it is the venue’s own page)', () => {
		const { queryByText } = render(OisyTradePositionRow, {
			props: { asset: buildAsset() }
		});

		expect(queryByText(en.trading.text.provider_name)).toBeNull();
	});

	it('shows the "in orders" chip only when part of the balance is reserved', () => {
		const { queryByLabelText } = render(OisyTradePositionRow, {
			props: { asset: buildAsset({ reserved: ZERO }) }
		});

		expect(queryByLabelText(en.trading.page.in_orders_label)).toBeNull();
	});

	it('renders the reserved amount with a lock icon in the "in orders" chip', () => {
		const { getByText, getByLabelText } = render(OisyTradePositionRow, {
			props: { asset: buildAsset({ free: 40000000n, reserved: 60000000n, total: 100000000n }) }
		});

		expect(getByLabelText(en.trading.page.in_orders_label)).toBeInTheDocument();
		expect(getByText('0.6 ICP')).toBeInTheDocument();
	});

	it('masks the amount in privacy mode', () => {
		setPrivacyMode({ enabled: true });

		const { queryByText } = render(OisyTradePositionRow, {
			props: { asset: buildAsset() }
		});

		expect(queryByText('1 ICP')).toBeNull();
	});

	describe('holdings variant', () => {
		it('is not clickable in the default provider variant', () => {
			const { queryByRole } = render(OisyTradePositionRow, {
				props: { asset: buildAsset() }
			});

			expect(queryByRole('button')).toBeNull();
		});

		it('navigates to the Trade provider page when clicked', async () => {
			const { getByRole } = render(OisyTradePositionRow, {
				props: { asset: buildAsset(), variant: 'holdings' }
			});

			await fireEvent.click(getByRole('button'));

			expect(goto).toHaveBeenCalledWith(AppPath.ProvidersOisyTrade);
		});
	});
});
