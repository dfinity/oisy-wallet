import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import TokenModal from '$lib/components/tokens/TokenModal.svelte';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

describe('TokenModal', () => {
	it('renders all values correctly for ICP token', () => {
		const { getByText, getAllByText } = render(TokenModal, {
			props: {
				token: ICP_TOKEN
			}
		});

		expect(getByText(en.tokens.details.title)).toBeInTheDocument();

		expect(getByText(en.tokens.details.network)).toBeInTheDocument();
		expect(getAllByText(ICP_TOKEN.network.name)[0]).toBeInTheDocument();

		expect(getByText(en.tokens.details.token)).toBeInTheDocument();
		expect(getAllByText(ICP_TOKEN.name)[1]).toBeInTheDocument();

		expect(getByText(en.core.text.symbol)).toBeInTheDocument();

		expect(getByText(en.core.text.decimals)).toBeInTheDocument();
		expect(getByText(ICP_TOKEN.decimals)).toBeInTheDocument();
	});

	it('renders all values correctly for ICRC token', () => {
		const { getByText } = render(TokenModal, {
			props: {
				token: mockValidIcrcToken
			}
		});

		expect(getByText(en.tokens.details.title)).toBeInTheDocument();

		expect(getByText(en.tokens.details.network)).toBeInTheDocument();
		expect(getByText(mockValidIcrcToken.network.name)).toBeInTheDocument();

		expect(getByText(en.tokens.details.token)).toBeInTheDocument();
		expect(getByText(mockValidIcrcToken.name)).toBeInTheDocument();

		expect(getByText(en.tokens.details.standard)).toBeInTheDocument();
		expect(getByText(mockValidIcrcToken.standard)).toBeInTheDocument();

		expect(getByText(en.core.text.symbol)).toBeInTheDocument();

		expect(getByText(en.core.text.decimals)).toBeInTheDocument();
		expect(getByText(mockValidIcrcToken.decimals)).toBeInTheDocument();
	});
});
