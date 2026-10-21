import WalletConnectReview from '$lib/components/wallet-connect/WalletConnectReview.svelte';
import {
	walletConnectListenerStore,
	walletConnectProposalStore
} from '$lib/stores/wallet-connect.store';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import en from '$tests/mocks/i18n.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { render } from '@testing-library/svelte';
import type { Verify } from '@walletconnect/types';
import { tick } from 'svelte';

describe('WalletConnectReview', () => {
	const proposal = (
		verified: Pick<Verify.Context['verified'], 'validation' | 'isScam'>
	): WalletKitTypes.SessionProposal => ({
		id: 1,
		params: {
			id: 1,
			expiryTimestamp: 0,
			relays: [{ protocol: 'irn' }],
			proposer: {
				publicKey: 'mock-public-key',
				metadata: {
					name: 'Test dApp',
					description: 'A test dApp',
					url: 'https://dapp.example',
					icons: []
				}
			},
			requiredNamespaces: {},
			optionalNamespaces: {},
			pairingTopic: 'mock-pairing-topic'
		},
		verifyContext: {
			verified: {
				verifyUrl: 'https://verify.walletconnect.org',
				origin: 'https://dapp.example',
				...verified
			}
		}
	});

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

	describe('approving', () => {
		const approveSession = vi.fn();

		const listener: WalletConnectListener = {
			pair: vi.fn(),
			approveSession,
			rejectSession: vi.fn(),
			attachHandlers: vi.fn(),
			detachHandlers: vi.fn(),
			rejectRequest: vi.fn(),
			getActiveSessions: vi.fn().mockReturnValue({}),
			approveRequest: vi.fn(),
			disconnectSession: vi.fn(),
			disconnect: vi.fn()
		};

		beforeEach(() => {
			vi.clearAllMocks();

			walletConnectListenerStore.set(listener);
		});

		it('approves the proposal under review', async () => {
			const unflagged = proposal({ validation: 'VALID', isScam: false });
			walletConnectProposalStore.set(unflagged);

			const { getByRole } = render(WalletConnectReview);

			getByRole('button', { name: en.core.text.approve }).click();
			await tick();

			expect(approveSession).toHaveBeenCalledExactlyOnceWith(unflagged);
		});

		// The click lands before the review re-renders without the Approve button.
		it('does not approve a flagged proposal that replaced the one under review', async () => {
			walletConnectProposalStore.set(proposal({ validation: 'VALID', isScam: false }));

			const { getByRole } = render(WalletConnectReview);

			const approve = getByRole('button', { name: en.core.text.approve });

			walletConnectProposalStore.set(proposal({ validation: 'VALID', isScam: true }));
			approve.click();
			await tick();

			expect(approveSession).not.toHaveBeenCalled();
		});
	});
});
