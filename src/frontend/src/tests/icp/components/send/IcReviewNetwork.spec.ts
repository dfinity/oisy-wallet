import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import IcReviewNetwork from '$icp/components/send/IcReviewNetwork.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('IcReviewNetwork', () => {
	it('renders IC network name correctly', () => {
		const { getByText } = render(IcReviewNetwork);

		expect(getByText(en.send.text.network)).toBeInTheDocument();
		expect(getByText(ICP_TOKEN.network.name)).toBeInTheDocument();
	});
});
