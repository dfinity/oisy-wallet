import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import KnownDestinations from '$lib/components/send/KnownDestinations.svelte';
import { initSendContext, SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('KnownDestinations', () => {
	const mockContext = new Map([]);
	mockContext.set(
		SEND_CONTEXT_KEY,
		initSendContext({
			token: ETHEREUM_TOKEN
		})
	);

	it('renders content if data is provided', () => {
		const { getByText } = render(KnownDestinations, {
			props: {
				destination: mockBtcAddress,
				knownDestinations: {
					[mockBtcAddress]: {
						amounts: [10000000n],
						timestamp: 1671234567890
					}
				}
			},
			context: mockContext
		});

		expect(getByText(en.send.text.recently_used)).toBeInTheDocument();
	});

	it('does not render content if data is empty', () => {
		const { getByText } = render(KnownDestinations, {
			props: {
				destination: mockBtcAddress
			},
			context: mockContext
		});

		expect(() => getByText(en.send.text.recently_used)).toThrow();
	});
});
