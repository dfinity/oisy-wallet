import {
	walletConnectListenerStore,
	walletConnectProposalStore
} from '$lib/stores/wallet-connect.store';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import type { WalletKitTypes } from '@reown/walletkit';
import { get } from 'svelte/store';

describe('wallet-connect.store', () => {
	describe('walletConnectListenerStore', () => {
		const mockListener1: WalletConnectListener = {
			pair: vi.fn(),
			approveSession: vi.fn(),
			rejectSession: vi.fn(),
			sessionProposal: vi.fn(),
			rejectRequest: vi.fn(),
			sessionDelete: vi.fn(),
			sessionRequest: vi.fn(),
			offSessionProposal: vi.fn(),
			offSessionDelete: vi.fn(),
			offSessionRequest: vi.fn(),
			getActiveSessions: vi.fn(),
			approveRequest: vi.fn(),
			disconnect: vi.fn()
		};

		const mockListener2: WalletConnectListener = {
			pair: vi.fn(),
			approveSession: vi.fn(),
			rejectSession: vi.fn(),
			sessionProposal: vi.fn(),
			rejectRequest: vi.fn(),
			sessionDelete: vi.fn(),
			sessionRequest: vi.fn(),
			offSessionProposal: vi.fn(),
			offSessionDelete: vi.fn(),
			offSessionRequest: vi.fn(),
			getActiveSessions: vi.fn(),
			approveRequest: vi.fn(),
			disconnect: vi.fn()
		};

		it('should initialize with undefined', () => {
			expect(get(walletConnectListenerStore)).toBeUndefined();
		});

		describe('set', () => {
			it('should set the value', () => {
				walletConnectListenerStore.set(mockListener1);

				expect(get(walletConnectListenerStore)).toStrictEqual(mockListener1);
				expect(get(walletConnectListenerStore)).not.toStrictEqual(mockListener2);

				walletConnectListenerStore.set(mockListener2);

				expect(get(walletConnectListenerStore)).toStrictEqual(mockListener2);
				expect(get(walletConnectListenerStore)).not.toStrictEqual(mockListener1);
			});
		});

		describe('reset', () => {
			it('should reset the value to undefined', () => {
				walletConnectListenerStore.set(mockListener1);

				expect(get(walletConnectListenerStore)).toStrictEqual(mockListener1);

				walletConnectListenerStore.reset();

				expect(get(walletConnectListenerStore)).toBeUndefined();
			});
		});
	});

	describe('walletConnectProposalStore', () => {
		const mockProposal1: WalletKitTypes.SessionProposal = {
			id: 123_456,
			params: {},
			verifyContext: {
				verified: {
					verifyUrl: 'https://verify.walletconnect.org',
					validation: 'VALID',
					origin: 'https://app.uniswap.org',
					isScam: false
				}
			}
		} as WalletKitTypes.SessionProposal;

		const mockProposal2: WalletKitTypes.SessionProposal = {
			id: 654_321,
			params: {},
			verifyContext: {
				verified: {
					verifyUrl: 'https://verify.walletconnect.org',
					validation: 'VALID',
					origin: 'https://app.sushi.com',
					isScam: false
				}
			}
		} as WalletKitTypes.SessionProposal;

		it('should initialize with undefined', () => {
			expect(get(walletConnectProposalStore)).toBeUndefined();
		});

		describe('set', () => {
			it('should set the value', () => {
				walletConnectProposalStore.set(mockProposal1);

				expect(get(walletConnectProposalStore)).toStrictEqual(mockProposal1);
				expect(get(walletConnectProposalStore)).not.toStrictEqual(mockProposal2);

				walletConnectProposalStore.set(mockProposal2);

				expect(get(walletConnectProposalStore)).toStrictEqual(mockProposal2);
				expect(get(walletConnectProposalStore)).not.toStrictEqual(mockProposal1);
			});
		});
	});
});
