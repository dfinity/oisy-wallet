import KnownDestinations from '$lib/components/send/KnownDestinations.svelte';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import en from '$tests/mocks/i18n.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { knownDestinations } from '$tests/mocks/transactions.mock';
import { render } from '@testing-library/svelte';

describe('KnownDestinations', () => {
	it('renders content if data is provided', () => {
		const { getByText } = render(KnownDestinations, {
			props: {
				destination: '',
				knownDestinations
			}
		});

		expect(getByText(shortenWithMiddleEllipsis({ text: mockBtcAddress }))).toBeInTheDocument();
		expect(getByText(shortenWithMiddleEllipsis({ text: mockEthAddress }))).toBeInTheDocument();
		expect(getByText(shortenWithMiddleEllipsis({ text: mockSolAddress }))).toBeInTheDocument();
	});

	it('renders filtered content if data is provided', () => {
		const { getByText } = render(KnownDestinations, {
			props: {
				destination: mockBtcAddress,
				knownDestinations
			}
		});

		expect(getByText(shortenWithMiddleEllipsis({ text: mockBtcAddress }))).toBeInTheDocument();
		expect(() => getByText(shortenWithMiddleEllipsis({ text: mockEthAddress }))).toThrow();
		expect(() => getByText(shortenWithMiddleEllipsis({ text: mockSolAddress }))).toThrow();
	});

	it('renders empty state component if data is empty', () => {
		const { getByText } = render(KnownDestinations, {
			props: {
				destination: mockBtcAddress
			}
		});

		expect(getByText(en.send.text.recently_used_empty_state_title)).toBeInTheDocument();
		expect(getByText(en.send.text.recently_used_empty_state_description)).toBeInTheDocument();
	});
});
