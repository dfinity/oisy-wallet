import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import SolWalletConnectSignReview from '$sol/components/wallet-connect/SolWalletConnectSignReview.svelte';
import en from '$tests/mocks/i18n.mock';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { render } from '@testing-library/svelte';

describe('SolWalletConnectSignReview', () => {
	const props = {
		amount: 1_000_000n,
		application: 'https://example.com',
		destination: mockSolAddress2,
		source: mockSolAddress,
		token: SOLANA_TOKEN,
		onApprove: vi.fn(),
		onReject: vi.fn()
	};

	it('should render the unreviewed instructions warning', () => {
		const { getByText } = render(SolWalletConnectSignReview, {
			props: {
				...props,
				unreviewed: true
			}
		});

		expect(getByText(en.wallet_connect.text.unreviewed_instructions)).toBeInTheDocument();
	});

	it('should render the unreviewed instructions warning above the application', () => {
		const { getByText } = render(SolWalletConnectSignReview, {
			props: {
				...props,
				unreviewed: true
			}
		});

		const warning = getByText(en.wallet_connect.text.unreviewed_instructions);
		const application = getByText(en.wallet_connect.text.application);

		expect(warning.compareDocumentPosition(application) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING
		);
	});

	it('should not render the unreviewed instructions warning by default', () => {
		const { queryByText } = render(SolWalletConnectSignReview, {
			props
		});

		expect(queryByText(en.wallet_connect.text.unreviewed_instructions)).not.toBeInTheDocument();
	});

	it('should render the network row with the same label-above-value shape as the other rows', () => {
		const { container } = render(SolWalletConnectSignReview, { props });

		const label = container.querySelector('label[for="network"]');
		const value = container.querySelector('#network');

		expect(label).toHaveTextContent(en.send.text.network);
		expect(value).toHaveTextContent(SOLANA_TOKEN.network.name);
	});

	it('should render the network logo within the network row', () => {
		const { container } = render(SolWalletConnectSignReview, { props });

		const logo = container.querySelector(
			`#network img[alt="${replacePlaceholders(en.core.alt.logo, {
				$name: SOLANA_TOKEN.network.name
			})}"]`
		);

		expect(logo).toBeInTheDocument();
	});
});
