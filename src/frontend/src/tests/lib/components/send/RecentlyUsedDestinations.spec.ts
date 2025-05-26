import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import RecentlyUsedDestinations from '$lib/components/send/RecentlyUsedDestinations.svelte';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import en from '$tests/mocks/i18n.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { render } from '@testing-library/svelte';
import { expect } from 'vitest';

describe('RecentlyUsedDestinations', () => {
	const recentlyUsedDestinations = {
		[mockBtcAddress]: {
			amounts: [{ value: 10000000n, token: BTC_MAINNET_TOKEN }],
			timestamp: 1671234567890,
			address: mockBtcAddress
		},
		[mockEthAddress]: {
			amounts: [{ value: 10000000n, token: ETHEREUM_TOKEN }],
			timestamp: 1671234567890,
			address: mockEthAddress
		},
		[mockSolAddress]: {
			amounts: [{ value: 10000000n, token: SOLANA_TOKEN }],
			timestamp: 1671234567890,
			address: mockSolAddress
		}
	};

	it('renders content if data is provided', () => {
		const { getByText } = render(RecentlyUsedDestinations, {
			props: {
				destination: '',
				recentlyUsedDestinations
			}
		});

		expect(getByText(en.send.text.recently_used)).toBeInTheDocument();

		expect(getByText(shortenWithMiddleEllipsis({ text: mockBtcAddress }))).toBeInTheDocument();
		expect(getByText(shortenWithMiddleEllipsis({ text: mockEthAddress }))).toBeInTheDocument();
		expect(getByText(shortenWithMiddleEllipsis({ text: mockSolAddress }))).toBeInTheDocument();
	});

	it('renders filtered content if data is provided', () => {
		const { getByText } = render(RecentlyUsedDestinations, {
			props: {
				destination: mockBtcAddress,
				recentlyUsedDestinations
			}
		});

		expect(getByText(en.send.text.recently_used)).toBeInTheDocument();

		expect(getByText(shortenWithMiddleEllipsis({ text: mockBtcAddress }))).toBeInTheDocument();
		expect(() => getByText(shortenWithMiddleEllipsis({ text: mockEthAddress }))).toThrow();
		expect(() => getByText(shortenWithMiddleEllipsis({ text: mockSolAddress }))).toThrow();
	});

	it('renders empty state component if data is empty', () => {
		const { getByText } = render(RecentlyUsedDestinations, {
			props: {
				destination: mockBtcAddress
			}
		});

		expect(() => getByText(en.send.text.recently_used)).toThrow();
		expect(getByText(en.send.text.recently_used_empty_state_title)).toBeInTheDocument();
		expect(getByText(en.send.text.recently_used_empty_state_description)).toBeInTheDocument();
	});
});
