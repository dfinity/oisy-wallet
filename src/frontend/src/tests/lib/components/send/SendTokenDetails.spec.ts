import { POL_AMOY_TOKEN } from '$env/tokens/tokens-evm/tokens-polygon/tokens.pol.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import SendTokenDetails from '$lib/components/send/SendTokenDetails.svelte';
import type { Token } from '$lib/types/token';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { render } from '@testing-library/svelte';

describe('SendTokenDetails', () => {
	const addressLabels = [en.tokens.text.token_address, en.tokens.import.text.ledger_canister_id];

	it('shows the token symbol and name', () => {
		const token: Token = {
			...mockValidErc20Token,
			symbol: 'USDC',
			name: 'USD Coin'
		};

		const { getByText } = render(SendTokenDetails, { props: { token } });

		expect(getByText(en.tokens.details.token)).toBeInTheDocument();
		expect(getByText('USDC')).toBeInTheDocument();
		expect(getByText('USD Coin')).toBeInTheDocument();
	});

	it('shows the token address of an ERC-20 token', () => {
		const { getByText, queryByText, getByRole } = render(SendTokenDetails, {
			props: { token: mockValidErc20Token }
		});

		expect(getByText(en.tokens.text.token_address)).toBeInTheDocument();
		expect(queryByText(en.tokens.text.contract_address)).not.toBeInTheDocument();
		expect(
			getByText(shortenWithMiddleEllipsis({ text: mockValidErc20Token.address }))
		).toBeInTheDocument();
		expect(
			getByRole('button', { name: `${en.core.text.copy}: ${mockValidErc20Token.address}` })
		).toBeInTheDocument();
	});

	it('shows the token address of an SPL token', () => {
		const { getByText, getByRole } = render(SendTokenDetails, {
			props: { token: mockValidSplToken }
		});

		expect(getByText(en.tokens.text.token_address)).toBeInTheDocument();
		expect(
			getByText(shortenWithMiddleEllipsis({ text: mockValidSplToken.address }))
		).toBeInTheDocument();
		expect(
			getByRole('button', { name: `${en.core.text.copy}: ${mockValidSplToken.address}` })
		).toBeInTheDocument();
	});

	it.each([
		{ name: 'an ICRC token', token: mockValidIcrcToken },
		{ name: 'ICP', token: ICP_TOKEN }
	])('shows the ledger canister ID of $name', ({ token }) => {
		const { getByText, getByRole } = render(SendTokenDetails, { props: { token } });

		expect(getByText(en.tokens.import.text.ledger_canister_id)).toBeInTheDocument();
		expect(
			getByText(shortenWithMiddleEllipsis({ text: token.ledgerCanisterId }))
		).toBeInTheDocument();
		expect(
			getByRole('button', { name: `${en.core.text.copy}: ${token.ledgerCanisterId}` })
		).toBeInTheDocument();
	});

	it.each([
		{ name: 'ETH', token: ETHEREUM_TOKEN },
		{ name: 'POL', token: POL_AMOY_TOKEN },
		{ name: 'SOL', token: SOLANA_TOKEN }
	])('shows no address line for the native coin $name', ({ token }) => {
		const { getByText, queryByText, queryByRole } = render(SendTokenDetails, {
			props: { token }
		});

		expect(getByText(en.tokens.details.token)).toBeInTheDocument();

		addressLabels.forEach((label) => expect(queryByText(label)).not.toBeInTheDocument());

		expect(queryByRole('button')).not.toBeInTheDocument();
	});
});
