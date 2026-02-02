import { UNEXPECTED_ERROR, WALLET_CONNECT_METADATA } from '$lib/constants/wallet-connect.constants';
import { WalletConnectClient } from '$lib/providers/wallet-connect.providers';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { WalletKit, type WalletKitTypes } from '@reown/walletkit';
import { Core } from '@walletconnect/core';
import { getSdkError } from '@walletconnect/utils';

describe('wallet-connect.providers', () => {
	describe('WalletConnectClient', () => {
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
			await WalletConnectClient.init(mockParams);

			expect(WalletKit.init).toHaveBeenCalledExactlyOnceWith(initParams);

			await WalletConnectClient.init(mockParams);

			// Called only once from the first tests
			expect(WalletKit.init).toHaveBeenCalledExactlyOnceWith(initParams);
		});

		it('should disconnect previous sessions by default', async () => {
			mockGetActiveSessions.mockReturnValue({
				session1: { topic: 'topic1' },
				session2: { topic: 'topic2' }
			});

			await WalletConnectClient.init(mockParams);

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

			await WalletConnectClient.init({ ...mockParams, cleanSlate: true });

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

			await WalletConnectClient.init({ ...mockParams, cleanSlate: false });

			expect(mockDisconnectSession).not.toHaveBeenCalled();
		});

		describe('pair', () => {
			it('should pair with a specific provided URI', async () => {
				const mockUri = 'wc:1234@1?bridge=https%3A%2F%2Fbridge.walletconnect.org&key=abcd';

				const listener = await WalletConnectClient.init(mockParams);

				await listener.pair(mockUri);

				expect(mockPair).toHaveBeenCalledExactlyOnceWith({ uri: mockUri });
			});
		});

		describe.todo('approveSession', () => {});

		describe('rejectSession', () => {
			it('should call rejectSession with the correct params', async () => {
				const listener = await WalletConnectClient.init(mockParams);

				await listener.rejectSession(mockProposal);

				expect(mockRejectSession).toHaveBeenCalledExactlyOnceWith({
					id: mockProposal.id,
					reason: getSdkError('USER_REJECTED_METHODS')
				});
			});
		});

		describe('rejectRequest', () => {
			it('should respond to the session request with the correct params', async () => {
				const listener = await WalletConnectClient.init(mockParams);

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
				const listener = await WalletConnectClient.init(mockParams);

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

		describe('attachHandlers', () => {
			it('should set a listener for the session events', async () => {
				const onSessionProposal = vi.fn();
				const onSessionDelete = vi.fn();
				const onSessionRequest = vi.fn();

				const listener = await WalletConnectClient.init(mockParams);

				listener.attachHandlers({
					onSessionProposal,
					onSessionDelete,
					onSessionRequest
				});

				expect(mockOn).toHaveBeenCalledTimes(3);
				expect(mockOn).toHaveBeenNthCalledWith(1, 'session_proposal', onSessionProposal);
				expect(mockOn).toHaveBeenNthCalledWith(2, 'session_delete', onSessionDelete);
				expect(mockOn).toHaveBeenNthCalledWith(3, 'session_request', onSessionRequest);
			});

			it('should detach previously attached handlers before attaching new ones', async () => {
				const firstOnSessionProposal = vi.fn();
				const firstOnSessionDelete = vi.fn();
				const firstOnSessionRequest = vi.fn();

				const secondOnSessionProposal = vi.fn();
				const secondOnSessionDelete = vi.fn();
				const secondOnSessionRequest = vi.fn();

				const listener = await WalletConnectClient.init(mockParams);

				listener.attachHandlers({
					onSessionProposal: firstOnSessionProposal,
					onSessionDelete: firstOnSessionDelete,
					onSessionRequest: firstOnSessionRequest
				});

				listener.attachHandlers({
					onSessionProposal: secondOnSessionProposal,
					onSessionDelete: secondOnSessionDelete,
					onSessionRequest: secondOnSessionRequest
				});

				expect(mockOff).toHaveBeenCalledTimes(3);
				expect(mockOff).toHaveBeenNthCalledWith(1, 'session_proposal', firstOnSessionProposal);
				expect(mockOff).toHaveBeenNthCalledWith(2, 'session_delete', firstOnSessionDelete);
				expect(mockOff).toHaveBeenNthCalledWith(3, 'session_request', firstOnSessionRequest);

				expect(mockOn).toHaveBeenCalledTimes(6);
				expect(mockOn).toHaveBeenNthCalledWith(1, 'session_proposal', firstOnSessionProposal);
				expect(mockOn).toHaveBeenNthCalledWith(2, 'session_delete', firstOnSessionDelete);
				expect(mockOn).toHaveBeenNthCalledWith(3, 'session_request', firstOnSessionRequest);
				expect(mockOn).toHaveBeenNthCalledWith(4, 'session_proposal', secondOnSessionProposal);
				expect(mockOn).toHaveBeenNthCalledWith(5, 'session_delete', secondOnSessionDelete);
				expect(mockOn).toHaveBeenNthCalledWith(6, 'session_request', secondOnSessionRequest);
			});
		});

		describe('detachHandlers', () => {
			it('should do nothing if no handlers were attached', async () => {
				const listener = await WalletConnectClient.init(mockParams);

				listener.detachHandlers();

				expect(mockOff).not.toHaveBeenCalled();
				expect(mockRemoveListener).not.toHaveBeenCalled();
			});

			it('should un-set a listener for the session events', async () => {
				const onSessionProposal = vi.fn();
				const onSessionDelete = vi.fn();
				const onSessionRequest = vi.fn();

				const listener = await WalletConnectClient.init(mockParams);

				listener.attachHandlers({
					onSessionProposal,
					onSessionDelete,
					onSessionRequest
				});

				listener.detachHandlers();

				expect(mockOff).toHaveBeenCalledTimes(3);
				expect(mockOff).toHaveBeenNthCalledWith(1, 'session_proposal', onSessionProposal);
				expect(mockOff).toHaveBeenNthCalledWith(2, 'session_delete', onSessionDelete);
				expect(mockOff).toHaveBeenNthCalledWith(3, 'session_request', onSessionRequest);
			});

			it('should remove a listener for the session events', async () => {
				const onSessionProposal = vi.fn();
				const onSessionDelete = vi.fn();
				const onSessionRequest = vi.fn();

				const listener = await WalletConnectClient.init(mockParams);

				listener.attachHandlers({
					onSessionProposal,
					onSessionDelete,
					onSessionRequest
				});

				listener.detachHandlers();

				expect(mockRemoveListener).toHaveBeenCalledTimes(3);
				expect(mockRemoveListener).toHaveBeenNthCalledWith(
					1,
					'session_proposal',
					onSessionProposal
				);
				expect(mockRemoveListener).toHaveBeenNthCalledWith(2, 'session_delete', onSessionDelete);
				expect(mockRemoveListener).toHaveBeenNthCalledWith(3, 'session_request', onSessionRequest);
			});

			it('should be safe to call multiple times', async () => {
				const onSessionProposal = vi.fn();
				const onSessionDelete = vi.fn();
				const onSessionRequest = vi.fn();

				const listener = await WalletConnectClient.init(mockParams);

				listener.attachHandlers({
					onSessionProposal,
					onSessionDelete,
					onSessionRequest
				});

				listener.detachHandlers();
				listener.detachHandlers();
				listener.detachHandlers();

				expect(mockOff).toHaveBeenCalledTimes(3);
				expect(mockRemoveListener).toHaveBeenCalledTimes(3);
			});
		});

		describe('getActiveSessions', () => {
			it('should return the active sessions from the WalletKit instance', async () => {
				mockGetActiveSessions.mockReturnValue({
					session1: { topic: 'topic1' },
					session2: { topic: 'topic2' }
				});

				const listener = await WalletConnectClient.init(mockParams);

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
