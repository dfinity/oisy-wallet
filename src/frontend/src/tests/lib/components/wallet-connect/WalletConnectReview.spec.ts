import { LEGACY_SOLANA_MAINNET_NAMESPACE } from '$env/caip10-chains.env';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import WalletConnectReview from '$lib/components/wallet-connect/WalletConnectReview.svelte';
import {
	walletConnectListenerStore,
	walletConnectProposalStore
} from '$lib/stores/wallet-connect.store';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import en from '$tests/mocks/i18n.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { render, within } from '@testing-library/svelte';
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
			approvedNamespaces: vi.fn().mockReturnValue({}),
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

	describe('granted permissions', () => {
		const approvedNamespaces = vi.fn();

		const listener: WalletConnectListener = {
			pair: vi.fn(),
			approveSession: vi.fn(),
			approvedNamespaces,
			rejectSession: vi.fn(),
			attachHandlers: vi.fn(),
			detachHandlers: vi.fn(),
			rejectRequest: vi.fn(),
			getActiveSessions: vi.fn().mockReturnValue({}),
			approveRequest: vi.fn(),
			disconnectSession: vi.fn(),
			disconnect: vi.fn()
		};

		const underReview = proposal({ validation: 'VALID', isScam: false });

		beforeEach(() => {
			vi.clearAllMocks();

			walletConnectListenerStore.set(listener);
			walletConnectProposalStore.set(underReview);
		});

		// The proposal asks for nothing as required, as current WalletConnect SDKs send it, and the
		// review still states what approving grants.
		it('lists the networks, methods and events approving grants', () => {
			approvedNamespaces.mockReturnValue({
				eip155: {
					chains: [`eip155:${ETHEREUM_NETWORK.chainId}`, `eip155:${BASE_NETWORK.chainId}`],
					methods: ['eth_sendTransaction', 'eth_signTypedData_v4'],
					events: ['chainChanged'],
					accounts: []
				},
				solana: {
					chains: [LEGACY_SOLANA_MAINNET_NAMESPACE, `solana:${SOLANA_MAINNET_NETWORK.chainId}`],
					methods: ['solana_signTransaction'],
					events: [],
					accounts: []
				}
			});

			const { getByText, getAllByTestId } = render(WalletConnectReview);

			expect(approvedNamespaces).toHaveBeenCalledWith(underReview);

			expect(getByText(`${en.wallet_connect.text.granted_permissions}:`)).toBeInTheDocument();

			const [eip155, solana] = getAllByTestId('wallet-connect-granted-namespace');

			expect(
				within(eip155).getByText(`${ETHEREUM_NETWORK.name}, ${BASE_NETWORK.name}`)
			).toBeInTheDocument();
			expect(
				within(eip155).getByText('eth_sendTransaction, eth_signTypedData_v4')
			).toBeInTheDocument();
			expect(within(eip155).getByText('chainChanged')).toBeInTheDocument();

			// Two chain IDs for one network are one network to the user.
			expect(within(solana).getByText(SOLANA_MAINNET_NETWORK.name)).toBeInTheDocument();
			expect(within(solana).getByText('solana_signTransaction')).toBeInTheDocument();
			expect(within(solana).getByText('-')).toBeInTheDocument();
		});

		// Approving fails then too, so there is nothing it would grant.
		it('lists nothing when the proposal requires what OISY does not support', () => {
			approvedNamespaces.mockImplementation(() => {
				throw new Error('Non conforming namespaces');
			});

			const { queryByText, queryAllByTestId, getByRole } = render(WalletConnectReview);

			expect(queryByText(`${en.wallet_connect.text.granted_permissions}:`)).not.toBeInTheDocument();
			expect(queryAllByTestId('wallet-connect-granted-namespace')).toHaveLength(0);

			expect(getByRole('button', { name: en.core.text.reject })).toBeInTheDocument();
		});
	});
});
