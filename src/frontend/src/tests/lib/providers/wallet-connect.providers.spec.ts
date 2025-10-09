import { UNEXPECTED_ERROR, WALLET_CONNECT_METADATA } from '$lib/constants/wallet-connect.constants';
import { initWalletConnect } from '$lib/providers/wallet-connect.providers';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { WalletKit, type WalletKitTypes } from '@reown/walletkit';
import { Core } from '@walletconnect/core';
import { getSdkError } from '@walletconnect/utils';

describe('wallet-connect.providers', () => {
	describe('initWalletConnect', () => {
		const mockProposal: WalletKitTypes.SessionProposal = {
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

		const mockParams = {
			ethAddress: mockEthAddress,
			solAddressMainnet: mockSolAddress,
			solAddressDevnet: mockSolAddress2
		};

		const initParams = {
			core: new Core({
				projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID
			}),
			metadata: WALLET_CONNECT_METADATA
		};

		const mockGetActiveSessions = vi.fn();
		const mockDisconnectSession = vi.fn();
		const mockRejectSession = vi.fn();
		const mockRespondSessionRequest = vi.fn();
		const mockPair = vi.fn();
		const mockOn = vi.fn();
		const mockOff = vi.fn();
		const mockRemoveListener = vi.fn();

		const walletKitSpy: Awaited<ReturnType<typeof WalletKit.init>> = {
			getActiveSessions: mockGetActiveSessions,
			disconnectSession: mockDisconnectSession,
			rejectSession: mockRejectSession,
			respondSessionRequest: mockRespondSessionRequest,
			core: {
				pairing: { pair: mockPair }
			},
			on: mockOn,
			off: mockOff,
			removeListener: mockRemoveListener
		} as unknown as Awaited<ReturnType<typeof WalletKit.init>>;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(WalletKit, 'init').mockResolvedValue(walletKitSpy);

			mockGetActiveSessions.mockReturnValue({});
		});

		it('should create a new WalletKit instance only if none exists', async () => {
			await initWalletConnect(mockParams);

			expect(WalletKit.init).toHaveBeenCalledExactlyOnceWith(initParams);

			await initWalletConnect(mockParams);

			// Called only once from the first tests
			expect(WalletKit.init).toHaveBeenCalledExactlyOnceWith(initParams);
		});

		it('should disconnect previous sessions by default', async () => {
			mockGetActiveSessions.mockReturnValue({
				session1: { topic: 'topic1' },
				session2: { topic: 'topic2' }
			});

			await initWalletConnect(mockParams);

			expect(mockDisconnectSession).toHaveBeenCalledTimes(2);
			expect(mockDisconnectSession).toHaveBeenNthCalledWith(1, {
				topic: 'topic1',
				reason: getSdkError('USER_DISCONNECTED')
			});
			expect(mockDisconnectSession).toHaveBeenNthCalledWith(2, {
				topic: 'topic2',
				reason: getSdkError('USER_DISCONNECTED')
			});
		});

		it('should disconnect previous sessions if cleanSlate is true', async () => {
			mockGetActiveSessions.mockReturnValue({
				session1: { topic: 'topic1' },
				session2: { topic: 'topic2' }
			});

			await initWalletConnect({ ...mockParams, cleanSlate: true });

			expect(mockDisconnectSession).toHaveBeenCalledTimes(2);
			expect(mockDisconnectSession).toHaveBeenNthCalledWith(1, {
				topic: 'topic1',
				reason: getSdkError('USER_DISCONNECTED')
			});
			expect(mockDisconnectSession).toHaveBeenNthCalledWith(2, {
				topic: 'topic2',
				reason: getSdkError('USER_DISCONNECTED')
			});
		});

		it('should not disconnect previous sessions if cleanSlate is false', async () => {
			mockGetActiveSessions.mockReturnValue({
				session1: { topic: 'topic1' },
				session2: { topic: 'topic2' }
			});

			await initWalletConnect({ ...mockParams, cleanSlate: false });

			expect(mockDisconnectSession).not.toHaveBeenCalled();
		});

		describe('pair', () => {
			it('should pair with a specific provided URI', async () => {
				const mockUri = 'wc:1234@1?bridge=https%3A%2F%2Fbridge.walletconnect.org&key=abcd';

				const listener = await initWalletConnect(mockParams);

				await listener.pair(mockUri);

				expect(mockPair).toHaveBeenCalledExactlyOnceWith({ uri: mockUri });
			});
		});

		describe.todo('approveSession', () => {});

		describe('rejectSession', () => {
			it('should call rejectSession with the correct params', async () => {
				const listener = await initWalletConnect(mockParams);

				await listener.rejectSession(mockProposal);

				expect(mockRejectSession).toHaveBeenCalledExactlyOnceWith({
					id: mockProposal.id,
					reason: getSdkError('USER_REJECTED_METHODS')
				});
			});
		});

		describe('rejectRequest', () => {
			it('should respond to the session request with the correct params', async () => {
				const listener = await initWalletConnect(mockParams);

				await listener.rejectRequest({
					id: mockProposal.id,
					topic: 'mock-topic',
					error: UNEXPECTED_ERROR
				});

				expect(mockRespondSessionRequest).toHaveBeenCalledExactlyOnceWith({
					topic: 'mock-topic',
					response: {
						id: mockProposal.id,
						jsonrpc: '2.0',
						error: UNEXPECTED_ERROR
					}
				});
			});
		});

		describe('approveRequest', () => {
			it('should respond to the session request with the correct params', async () => {
				const listener = await initWalletConnect(mockParams);

				await listener.approveRequest({
					id: mockProposal.id,
					topic: 'mock-topic',
					message: 'request-approved'
				});

				expect(mockRespondSessionRequest).toHaveBeenCalledExactlyOnceWith({
					topic: 'mock-topic',
					response: {
						id: mockProposal.id,
						jsonrpc: '2.0',
						result: 'request-approved'
					}
				});
			});
		});

		describe('sessionProposal', () => {
			it('should set a listener for the session proposal event', async () => {
				const callback = vi.fn();

				const listener = await initWalletConnect(mockParams);

				await listener.sessionProposal(callback);

				expect(mockOn).toHaveBeenCalledExactlyOnceWith('session_proposal', callback);
			});
		});

		describe('sessionDelete', () => {
			it('should set a listener for the session delete event', async () => {
				const callback = vi.fn();

				const listener = await initWalletConnect(mockParams);

				await listener.sessionDelete(callback);

				expect(mockOn).toHaveBeenCalledExactlyOnceWith('session_delete', callback);
			});
		});

		describe('sessionRequest', () => {
			it('should set a listener for the session request event', async () => {
				const callback = vi.fn();

				const listener = await initWalletConnect(mockParams);

				await listener.sessionRequest(callback);

				expect(mockOn).toHaveBeenCalledExactlyOnceWith('session_request', callback);
			});
		});

		describe('offSessionProposal', () => {
			it('should un-set a listener for the session proposal event', async () => {
				const callback = vi.fn();

				const listener = await initWalletConnect(mockParams);

				await listener.offSessionProposal(callback);

				expect(mockOff).toHaveBeenCalledExactlyOnceWith('session_proposal', callback);
			});

			it('should remove a listener for the session proposal event', async () => {
				const callback = vi.fn();

				const listener = await initWalletConnect(mockParams);

				await listener.offSessionProposal(callback);

				expect(mockRemoveListener).toHaveBeenCalledExactlyOnceWith('session_proposal', callback);
			});
		});

		describe('offSessionDelete', () => {
			it('should un-set a listener for the session delete event', async () => {
				const callback = vi.fn();

				const listener = await initWalletConnect(mockParams);

				await listener.offSessionDelete(callback);

				expect(mockOff).toHaveBeenCalledExactlyOnceWith('session_delete', callback);
			});

			it('should remove a listener for the session delete event', async () => {
				const callback = vi.fn();

				const listener = await initWalletConnect(mockParams);

				await listener.offSessionDelete(callback);

				expect(mockRemoveListener).toHaveBeenCalledExactlyOnceWith('session_delete', callback);
			});
		});

		describe('offSessionRequest', () => {
			it('should un-set a listener for the session request event', async () => {
				const callback = vi.fn();

				const listener = await initWalletConnect(mockParams);

				await listener.offSessionRequest(callback);

				expect(mockOff).toHaveBeenCalledExactlyOnceWith('session_request', callback);
			});

			it('should remove a listener for the session request event', async () => {
				const callback = vi.fn();

				const listener = await initWalletConnect(mockParams);

				await listener.offSessionRequest(callback);

				expect(mockRemoveListener).toHaveBeenCalledExactlyOnceWith('session_request', callback);
			});
		});

		describe('getActiveSessions', () => {
			it('should return the active sessions from the WalletKit instance', async () => {
				mockGetActiveSessions.mockReturnValue({
					session1: { topic: 'topic1' },
					session2: { topic: 'topic2' }
				});

				const listener = await initWalletConnect(mockParams);

				const sessions = await listener.getActiveSessions();

				expect(sessions).toStrictEqual({
					session1: { topic: 'topic1' },
					session2: { topic: 'topic2' }
				});
			});
		});

		describe.todo('disconnect', () => {});
	});
});
