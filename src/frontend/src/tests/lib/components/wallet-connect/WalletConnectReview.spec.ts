import WalletConnectReview from '$lib/components/wallet-connect/WalletConnectReview.svelte';
import { walletConnectProposalStore } from '$lib/stores/wallet-connect.store';
import en from '$tests/mocks/i18n.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { render } from '@testing-library/svelte';
import type { Verify } from '@walletconnect/types';

describe('WalletConnectReview', () => {
	const proposal = (
		verified: Pick<Verify.Context['verified'], 'validation' | 'isScam'>
	): WalletKitTypes.SessionProposal =>
		({
			id: 1,
			params: {
				proposer: {
					metadata: {
						name: 'Test dApp',
						description: 'A test dApp',
						url: 'https://dapp.example',
						icons: []
					}
				},
				requiredNamespaces: {}
			},
			verifyContext: {
				verified: {
					verifyUrl: 'https://verify.walletconnect.org',
					origin: 'https://dapp.example',
					...verified
				}
			}
		}) as unknown as WalletKitTypes.SessionProposal;

	it('offers to approve a proposal Verify does not flag', () => {
		walletConnectProposalStore.set(proposal({ validation: 'VALID', isScam: false }));

		const { getByRole } = render(WalletConnectReview);

		expect(getByRole('button', { name: en.core.text.approve })).toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.reject })).toBeInTheDocument();
	});

	// A flagged site served from its own domain still validates, so the flag alone decides.
	it('only offers to reject a proposal Verify flags as a scam, and says why', () => {
		walletConnectProposalStore.set(proposal({ validation: 'VALID', isScam: true }));

		const { getByRole, getByText, queryByRole } = render(WalletConnectReview);

		expect(queryByRole('button', { name: en.core.text.approve })).not.toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.reject })).toBeInTheDocument();

		expect(getByText(en.wallet_connect.domain.security_risk_description)).toBeInTheDocument();
	});
});
