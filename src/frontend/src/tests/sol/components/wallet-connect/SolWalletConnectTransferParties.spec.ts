import SolWalletConnectTransferParties from '$sol/components/wallet-connect/SolWalletConnectTransferParties.svelte';
import type { SolTransferParties } from '$sol/types/sol-transaction';
import en from '$tests/mocks/i18n.mock';
import { mockAtaAddress, mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { render } from '@testing-library/svelte';

describe('SolWalletConnectTransferParties', () => {
	const parties = (partial: Partial<SolTransferParties> = {}): SolTransferParties => ({
		sources: [],
		destinations: [],
		partial: false,
		...partial
	});

	const props = (overrides: Partial<SolTransferParties> = {}) => ({
		parties: parties(overrides),
		userAddress: mockSolAddress
	});

	it('should render the destinations of the transaction', () => {
		const { getByText } = render(SolWalletConnectTransferParties, {
			props: props({ destinations: [{ address: mockSolAddress2, own: false }] })
		});

		expect(getByText(en.wallet_connect.text.transfer_destinations)).toBeInTheDocument();
		expect(getByText(mockSolAddress2)).toBeInTheDocument();
	});

	it('should show a token account by the wallet that owns it', () => {
		const { getByText, queryByText } = render(SolWalletConnectTransferParties, {
			props: props({
				destinations: [{ address: mockAtaAddress, owner: mockSolAddress2, own: false }]
			})
		});

		expect(getByText(mockSolAddress2)).toBeInTheDocument();
		expect(queryByText(mockAtaAddress)).not.toBeInTheDocument();
	});

	it('should mark our own account among the destinations rather than drop it', () => {
		const { getByText, getByTestId } = render(SolWalletConnectTransferParties, {
			props: props({
				destinations: [
					{ address: mockSolAddress2, own: false },
					{ address: mockAtaAddress, owner: mockSolAddress, own: true }
				]
			})
		});

		expect(getByText(mockSolAddress)).toBeInTheDocument();
		expect(getByTestId('transfer-party-own')).toHaveTextContent(
			en.wallet_connect.text.transfer_party_own
		);
	});

	it('should not render the destinations section when there is nothing to put in it', () => {
		const { queryByText } = render(SolWalletConnectTransferParties, { props: props() });

		expect(queryByText(en.wallet_connect.text.transfer_destinations)).not.toBeInTheDocument();
	});

	describe('sources', () => {
		it('should not render a list that only repeats the wallet the review already names', () => {
			const { queryByText } = render(SolWalletConnectTransferParties, {
				props: props({
					sources: [{ address: mockAtaAddress, owner: mockSolAddress, own: true }]
				})
			});

			expect(queryByText(en.wallet_connect.text.transfer_sources)).not.toBeInTheDocument();
		});

		it('should render a source that cannot be resolved to that wallet', () => {
			const { getByText } = render(SolWalletConnectTransferParties, {
				props: props({ sources: [{ address: mockAtaAddress, own: true }] })
			});

			expect(getByText(en.wallet_connect.text.transfer_sources)).toBeInTheDocument();
			expect(getByText(mockAtaAddress)).toBeInTheDocument();
		});
	});

	describe('partial lists', () => {
		it('should say that the lists are partial whenever they were built without inner instructions', () => {
			const { getByText } = render(SolWalletConnectTransferParties, {
				props: props({ partial: true })
			});

			expect(getByText(en.wallet_connect.text.transfer_parties_partial)).toBeInTheDocument();
		});

		// A hidden Sources list and one that could not be derived must not render identically.
		it('should say so even when the lists it produced are empty', () => {
			const { getByText, queryByText } = render(SolWalletConnectTransferParties, {
				props: props({ partial: true })
			});

			expect(queryByText(en.wallet_connect.text.transfer_destinations)).not.toBeInTheDocument();
			expect(getByText(en.wallet_connect.text.transfer_parties_partial)).toBeInTheDocument();
		});

		it('should say nothing when the lists are complete', () => {
			const { queryByText } = render(SolWalletConnectTransferParties, {
				props: props({ destinations: [{ address: mockSolAddress2, own: false }] })
			});

			expect(queryByText(en.wallet_connect.text.transfer_parties_partial)).not.toBeInTheDocument();
		});
	});
});
