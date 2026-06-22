import WalletConnectSessionsModal from '$lib/components/wallet-connect/WalletConnectSessionsModal.svelte';
import * as walletConnectServices from '$lib/services/wallet-connect.services';
import * as toastsStore from '$lib/stores/toasts.store';
import {
	walletConnectListenerStore,
	walletConnectSessionsStore
} from '$lib/stores/wallet-connect.store';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import type { SessionTypes } from '@walletconnect/types';

describe('WalletConnectSessionsModal', () => {
	const mockSession = ({
		accounts,
		name = 'Test dApp',
		url = 'https://test-dapp.com'
	}: {
		accounts: string[];
		name?: string;
		url?: string;
	}): SessionTypes.Struct =>
		({
			topic: 'test-topic',
			peer: {
				metadata: {
					name,
					description: 'A test dApp',
					url,
					icons: ['https://test-dapp.com/icon.png']
				}
			},
			namespaces: {
				eip155: {
					accounts,
					methods: [],
					events: []
				}
			}
		}) as unknown as SessionTypes.Struct;

	const mockListener = {
		pair: vi.fn(),
		approveSession: vi.fn(),
		rejectSession: vi.fn(),
		attachHandlers: vi.fn(),
		detachHandlers: vi.fn(),
		rejectRequest: vi.fn(),
		getActiveSessions: vi.fn(),
		approveRequest: vi.fn(),
		disconnectSession: vi.fn(),
		disconnect: vi.fn()
	} as unknown as WalletConnectListener;

	const setSessions = (sessions: Record<string, SessionTypes.Struct>) =>
		walletConnectListenerStore.set({
			...mockListener,
			getActiveSessions: vi.fn().mockReturnValue(sessions)
		} as unknown as WalletConnectListener);

	beforeEach(() => {
		vi.clearAllMocks();
		walletConnectListenerStore.reset();
		walletConnectSessionsStore.reset();
	});

	it('should render no connected apps message when there are no sessions', () => {
		walletConnectListenerStore.set({
			...mockListener,
			getActiveSessions: vi.fn().mockReturnValue({})
		} as unknown as WalletConnectListener);

		const { getByText } = render(WalletConnectSessionsModal);

		expect(getByText(en.wallet_connect.text.no_connected_apps)).toBeInTheDocument();
	});

	it('should render session with dApp name as title', () => {
		const session = mockSession({
			accounts: ['eip155:1:0xAbCdEf1234567890AbCdEf1234567890AbCdEf12']
		});

		walletConnectListenerStore.set({
			...mockListener,
			getActiveSessions: vi.fn().mockReturnValue({ 'test-topic': session })
		} as unknown as WalletConnectListener);

		const { getByText } = render(WalletConnectSessionsModal);

		expect(getByText('Test dApp')).toBeInTheDocument();
	});

	it('should render session url as external link in description', () => {
		const session = mockSession({
			accounts: ['eip155:1:0xAbCdEf1234567890AbCdEf1234567890AbCdEf12']
		});

		walletConnectListenerStore.set({
			...mockListener,
			getActiveSessions: vi.fn().mockReturnValue({ 'test-topic': session })
		} as unknown as WalletConnectListener);

		const { getByText } = render(WalletConnectSessionsModal);

		const link = getByText('https://test-dapp.com');

		expect(link).toBeInTheDocument();
		expect(link.closest('a')).toHaveAttribute('href', 'https://test-dapp.com');
		expect(link.closest('a')).toHaveAttribute('rel', 'external noopener noreferrer');
		expect(link.closest('a')).toHaveAttribute('target', '_blank');
	});

	it('should render network icons for connected chains', () => {
		const session = mockSession({
			accounts: [
				'eip155:1:0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
				'eip155:1:0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'
			]
		});

		walletConnectListenerStore.set({
			...mockListener,
			getActiveSessions: vi.fn().mockReturnValue({ 'test-topic': session })
		} as unknown as WalletConnectListener);

		const { container } = render(WalletConnectSessionsModal);

		const overlappedLogos = container.querySelectorAll('[style*="z-index"]');

		expect(overlappedLogos.length).toBeGreaterThan(0);
	});

	it('should deduplicate network icons for same chain', () => {
		const session = mockSession({
			accounts: [
				'eip155:1:0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
				'eip155:1:0xBbBbBb1234567890AbCdEf1234567890AbCdEf12'
			]
		});

		walletConnectListenerStore.set({
			...mockListener,
			getActiveSessions: vi.fn().mockReturnValue({ 'test-topic': session })
		} as unknown as WalletConnectListener);

		const { container } = render(WalletConnectSessionsModal);

		const overlappedLogos = container.querySelectorAll('[style*="z-index"]');

		// Two accounts on the same chain should produce only one icon
		expect(overlappedLogos).toHaveLength(1);
	});

	it('should render multiple sessions', () => {
		const session1 = mockSession({
			accounts: ['eip155:1:0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'],
			name: 'dApp One',
			url: 'https://dapp-one.com'
		});
		const session2 = mockSession({
			accounts: ['eip155:1:0xBbBbBb1234567890AbCdEf1234567890AbCdEf12'],
			name: 'dApp Two',
			url: 'https://dapp-two.com'
		});

		walletConnectListenerStore.set({
			...mockListener,
			getActiveSessions: vi.fn().mockReturnValue({
				'topic-1': { ...session1, topic: 'topic-1' },
				'topic-2': { ...session2, topic: 'topic-2' }
			})
		} as unknown as WalletConnectListener);

		const { getByText } = render(WalletConnectSessionsModal);

		expect(getByText('dApp One')).toBeInTheDocument();
		expect(getByText('dApp Two')).toBeInTheDocument();
	});

	it('should disconnect only the clicked session by topic', async () => {
		const spy = vi
			.spyOn(walletConnectServices, 'disconnectSession')
			.mockResolvedValue({ success: true });

		const session1 = mockSession({
			accounts: ['eip155:1:0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'],
			name: 'dApp One'
		});
		const session2 = mockSession({
			accounts: ['eip155:1:0xBbBbBb1234567890AbCdEf1234567890AbCdEf12'],
			name: 'dApp Two'
		});

		setSessions({
			'topic-1': { ...session1, topic: 'topic-1' },
			'topic-2': { ...session2, topic: 'topic-2' }
		});

		const { getByTestId } = render(WalletConnectSessionsModal);

		await fireEvent.click(getByTestId('wallet-connect-disconnect-session-topic-2'));

		expect(spy).toHaveBeenCalledExactlyOnceWith('topic-2');
	});

	it('should give each per-session disconnect button an accessible name with the dApp name', () => {
		setSessions({
			'topic-1': {
				...mockSession({
					accounts: ['eip155:1:0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'],
					name: 'dApp One'
				}),
				topic: 'topic-1'
			},
			'topic-2': {
				...mockSession({
					accounts: ['eip155:1:0xBbBbBb1234567890AbCdEf1234567890AbCdEf12'],
					name: 'dApp Two'
				}),
				topic: 'topic-2'
			}
		});

		const { getByLabelText } = render(WalletConnectSessionsModal);

		expect(getByLabelText('Disconnect dApp One')).toBeInTheDocument();
		expect(getByLabelText('Disconnect dApp Two')).toBeInTheDocument();
	});

	it('should not show the disconnected toast when the per-session disconnect fails', async () => {
		vi.spyOn(walletConnectServices, 'disconnectSession').mockResolvedValue({ success: false });
		const toastSpy = vi.spyOn(toastsStore, 'toastsShow');

		setSessions({
			'topic-1': {
				...mockSession({ accounts: ['eip155:1:0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'] }),
				topic: 'topic-1'
			}
		});

		const { getByTestId } = render(WalletConnectSessionsModal);

		await fireEvent.click(getByTestId('wallet-connect-disconnect-session-topic-1'));

		expect(toastSpy).not.toHaveBeenCalled();
	});

	it('should not show a Disconnect all button when no app is connected', () => {
		setSessions({});

		const { queryByTestId } = render(WalletConnectSessionsModal);

		expect(queryByTestId('wallet-connect-disconnect-all')).not.toBeInTheDocument();
	});

	it('should show a Disconnect all button when at least one app is connected', () => {
		setSessions({
			'topic-1': {
				...mockSession({ accounts: ['eip155:1:0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'] }),
				topic: 'topic-1'
			}
		});

		const { queryByTestId } = render(WalletConnectSessionsModal);

		expect(queryByTestId('wallet-connect-disconnect-all')).toBeInTheDocument();
	});

	it('should disconnect every session when Disconnect all is clicked', async () => {
		const spy = vi.spyOn(walletConnectServices, 'disconnectListener').mockResolvedValue(undefined);

		setSessions({
			'topic-1': {
				...mockSession({ accounts: ['eip155:1:0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'] }),
				topic: 'topic-1'
			}
		});

		const { getByTestId } = render(WalletConnectSessionsModal);

		await fireEvent.click(getByTestId('wallet-connect-disconnect-all'));

		expect(spy).toHaveBeenCalledOnce();
	});

	it('should update the list reactively from the sessions store', async () => {
		const session1 = mockSession({
			accounts: ['eip155:1:0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'],
			name: 'dApp One'
		});
		const session2 = mockSession({
			accounts: ['eip155:1:0xBbBbBb1234567890AbCdEf1234567890AbCdEf12'],
			name: 'dApp Two'
		});

		setSessions({
			'topic-1': { ...session1, topic: 'topic-1' },
			'topic-2': { ...session2, topic: 'topic-2' }
		});

		const { getByText, queryByText } = render(WalletConnectSessionsModal);

		expect(getByText('dApp One')).toBeInTheDocument();
		expect(getByText('dApp Two')).toBeInTheDocument();

		// Simulate a single session being removed from the reactive store.
		walletConnectSessionsStore.set([{ ...session2, topic: 'topic-2' } as SessionTypes.Struct]);

		await waitFor(() => {
			expect(queryByText('dApp One')).not.toBeInTheDocument();
			expect(getByText('dApp Two')).toBeInTheDocument();
		});
	});
});
