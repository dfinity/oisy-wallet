import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import DestinationValue from '$lib/components/address/DestinationValue.svelte';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockEthAddress3 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('DestinationValue', () => {
	const props = {
		token: ETHEREUM_TOKEN,
		destination: mockEthAddress3,
		isDestinationCustom: true
	};

	it('shortens a custom destination by default', () => {
		const { container } = render(DestinationValue, { props });

		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: mockEthAddress3 }));
		expect(container).not.toHaveTextContent(mockEthAddress3);
	});

	it('shows the whole custom destination when asked to', () => {
		const { container } = render(DestinationValue, { props: { ...props, fullAddress: true } });

		expect(container).toHaveTextContent(mockEthAddress3);
	});

	it('names the default destination instead of an address', () => {
		const { container } = render(DestinationValue, {
			props: { ...props, isDestinationCustom: false, fullAddress: true }
		});

		expect(container).toHaveTextContent(en.convert.text.default_destination);
		expect(container).not.toHaveTextContent(mockEthAddress3);
	});
});
