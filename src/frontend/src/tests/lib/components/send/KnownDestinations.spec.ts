import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import KnownDestinations from '$lib/components/send/KnownDestinations.svelte';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('KnownDestinations', () => {
	it('renders content if data is provided', () => {
		const { getByText } = render(KnownDestinations, {
			props: {
				destination: mockBtcAddress,
				knownDestinations: {
					[mockBtcAddress]: {
						amounts: [{ value: 10000000n, token: BTC_MAINNET_TOKEN }],
						timestamp: 1671234567890
					}
				}
			}
		});

		expect(getByText(en.send.text.recently_used)).toBeInTheDocument();
	});

	it('does not render content if data is empty', () => {
		const { getByText } = render(KnownDestinations, {
			props: {
				destination: mockBtcAddress
			}
		});

		expect(() => getByText(en.send.text.recently_used)).toThrow();
	});
});
