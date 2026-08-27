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

	// Where the value ends up is described by the balance changes, so no list of recipients is
	// rendered here at all.
	it('should not render a destinations list', () => {
		const { queryByText, container } = render(SolWalletConnectTransferParties, {
			props: props({ destinations: [{ address: mockSolAddress2, own: false }] })
		});

		expect(container.querySelector('#transfer-destinations')).toBeNull();
		expect(queryByText(mockSolAddress2)).not.toBeInTheDocument();
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

		it('should show a token account by the wallet that owns it', () => {
			const { getByText, queryByText } = render(SolWalletConnectTransferParties, {
				props: props({
					sources: [{ address: mockAtaAddress, owner: mockSolAddress2, own: true }]
				})
			});

			expect(getByText(mockSolAddress2)).toBeInTheDocument();
			expect(queryByText(mockAtaAddress)).not.toBeInTheDocument();
		});

		it('should mark an account of ours rather than let it read as a counterparty', () => {
			const { getByTestId } = render(SolWalletConnectTransferParties, {
				props: props({ sources: [{ address: mockAtaAddress, own: true }] })
			});

			expect(getByTestId('transfer-party-own')).toHaveTextContent(
				en.wallet_connect.text.transfer_party_own
			);
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
		it('should say so even when the list it produced is empty', () => {
			const { getByText, queryByText } = render(SolWalletConnectTransferParties, {
				props: props({ partial: true })
			});

			expect(queryByText(en.wallet_connect.text.transfer_sources)).not.toBeInTheDocument();
			expect(getByText(en.wallet_connect.text.transfer_parties_partial)).toBeInTheDocument();
		});

		it('should say nothing when the lists are complete', () => {
			const { queryByText } = render(SolWalletConnectTransferParties, {
				props: props({ sources: [{ address: mockAtaAddress, own: true }] })
			});

			expect(queryByText(en.wallet_connect.text.transfer_parties_partial)).not.toBeInTheDocument();
		});
	});
});
