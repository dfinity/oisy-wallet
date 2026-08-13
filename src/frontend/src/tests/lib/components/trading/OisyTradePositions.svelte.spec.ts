import OisyTradePositions from '$lib/components/trading/OisyTradePositions.svelte';
import { ZERO } from '$lib/constants/app.constants';
import type { OisyTradeAsset } from '$lib/types/oisy-trade';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

const { assetsMock, hasAssetsMock } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable: createWritable } = require('svelte/store');
	return { assetsMock: createWritable([]), hasAssetsMock: createWritable(false) };
});

vi.mock(import('$lib/derived/oisy-trade.derived'), async (importOriginal) => ({
	...(await importOriginal()),
	get oisyTradeAssets() {
		return assetsMock;
	},
	get oisyTradeHasAssets() {
		return hasAssetsMock;
	}
}));

describe('OisyTradePositions', () => {
	const asset: OisyTradeAsset = {
		token: { ...mockValidIcToken, symbol: 'ICP', decimals: 8 },
		free: 100000000n,
		reserved: ZERO,
		total: 100000000n,
		totalUsd: 12.34,
		freeUsd: 12.34
	};

	beforeEach(() => {
		setPrivacyMode({ enabled: false });
		assetsMock.set([]);
		hasAssetsMock.set(false);
	});

	it('renders nothing when the user has no deposits (Empty state hides the section)', () => {
		const { queryByText } = render(OisyTradePositions);

		expect(queryByText(en.trading.page.positions)).toBeNull();
	});

	it('renders the section title and a row per holding once the user has deposits', () => {
		assetsMock.set([asset]);
		hasAssetsMock.set(true);

		const { getByText, getAllByText } = render(OisyTradePositions);

		expect(getByText(en.trading.page.positions)).toBeInTheDocument();
		expect(getAllByText('ICP').length).toBeGreaterThan(0);
	});
});
