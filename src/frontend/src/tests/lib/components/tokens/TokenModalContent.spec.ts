import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import TokenModalContent from '$lib/components/tokens/TokenModalContent.svelte';
import type { Token } from '$lib/types/token';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
import en from '$tests/mocks/i18n.mock';
import { mockIndexCanisterId, mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

describe('TokenModalContent', () => {
	it('renders all values correctly for ICP token', () => {
		const { getByText, getAllByText, container } = render(TokenModalContent, {
			props: {
				token: ICP_TOKEN
			}
		});

		expect(container).toHaveTextContent(getTokenDisplaySymbol(ICP_TOKEN));

		expect(getByText(en.tokens.details.network)).toBeInTheDocument();
		expect(getAllByText(ICP_TOKEN.network.name)[0]).toBeInTheDocument();

		expect(getByText(en.tokens.details.token)).toBeInTheDocument();
		expect(getAllByText(ICP_TOKEN.name)[1]).toBeInTheDocument();

		expect(getByText(en.core.text.symbol)).toBeInTheDocument();

		expect(getByText(en.core.text.decimals)).toBeInTheDocument();
		expect(getByText(ICP_TOKEN.decimals)).toBeInTheDocument();
	});

	it('renders all values correctly for ICRC token with index canister', () => {
		const { getByText, container } = render(TokenModalContent, {
			props: {
				token: { ...mockValidIcrcToken, indexCanisterId: mockIndexCanisterId } as Token
			}
		});

		expect(container).toHaveTextContent(getTokenDisplaySymbol(mockValidIcrcToken));

		expect(getByText(en.tokens.details.network)).toBeInTheDocument();
		expect(getByText(mockValidIcrcToken.network.name)).toBeInTheDocument();

		expect(getByText(en.tokens.details.token)).toBeInTheDocument();
		expect(getByText(mockValidIcrcToken.name)).toBeInTheDocument();

		expect(getByText(en.tokens.details.standard)).toBeInTheDocument();
		expect(getByText(mockValidIcrcToken.standard)).toBeInTheDocument();

		expect(getByText(en.tokens.import.text.index_canister_id)).toBeInTheDocument();
		expect(getByText(mockIndexCanisterId)).toBeInTheDocument();

		expect(getByText(en.core.text.symbol)).toBeInTheDocument();

		expect(getByText(en.core.text.decimals)).toBeInTheDocument();
		expect(getByText(mockValidIcrcToken.decimals)).toBeInTheDocument();
	});

	it('renders all values correctly for ICRC token without index canister', () => {
		const { getByText, container } = render(TokenModalContent, {
			props: {
				token: mockValidIcrcToken,
				onEditClick: () => {}
			}
		});

		expect(container).toHaveTextContent(getTokenDisplaySymbol(mockValidIcrcToken));

		expect(getByText(en.tokens.details.network)).toBeInTheDocument();
		expect(getByText(mockValidIcrcToken.network.name)).toBeInTheDocument();

		expect(getByText(en.tokens.details.token)).toBeInTheDocument();
		expect(getByText(mockValidIcrcToken.name)).toBeInTheDocument();

		expect(getByText(en.tokens.details.standard)).toBeInTheDocument();
		expect(getByText(mockValidIcrcToken.standard)).toBeInTheDocument();

		expect(getByText(en.tokens.import.text.index_canister_id)).toBeInTheDocument();
		expect(getByText(en.tokens.details.missing_index_canister_id_label)).toBeInTheDocument();
		expect(getByText(en.tokens.details.missing_index_canister_id_button)).toBeInTheDocument();

		expect(getByText(en.core.text.symbol)).toBeInTheDocument();

		expect(getByText(en.core.text.decimals)).toBeInTheDocument();
		expect(getByText(mockValidIcrcToken.decimals)).toBeInTheDocument();
	});
});
