import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { solAddressMainnetStore } from '$lib/stores/address.store';
import { i18n } from '$lib/stores/i18n.store';
import SolWalletConnectSignModal from '$sol/components/wallet-connect/SolWalletConnectSignModal.svelte';
import { SESSION_REQUEST_SOL_SIGN_TRANSACTION } from '$sol/constants/wallet-connect.constants';
import { decode, sign } from '$sol/services/wallet-connect.services';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import type { MappedSolTransaction } from '$sol/types/sol-transaction';
import { mockSolAddress, mockSolAddress2, mockSolAddress3 } from '$tests/mocks/sol.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { render, screen, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$lib/services/wallet-connect.services', () => ({
	reject: vi.fn()
}));

vi.mock('$sol/services/wallet-connect.services', () => ({
	decode: vi.fn(),
	sign: vi.fn()
}));

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason?: unknown) => void;
}

const createDeferred = <T>(): Deferred<T> => {
	let resolve: Deferred<T>['resolve'] = () => {
		throw new Error('Deferred promise resolved before initialization.');
	};
	let reject: Deferred<T>['reject'] = () => {
		throw new Error('Deferred promise rejected before initialization.');
	};

	const promise = new Promise<T>((promiseResolve, promiseReject) => {
		resolve = promiseResolve;
		reject = promiseReject;
	});

	return { promise, resolve, reject };
};

const mockRequest = ({
	transaction = 'mock-base64-transaction'
}: {
	transaction?: string;
} = {}): WalletKitTypes.SessionRequest =>
	({
		id: 123,
		topic: 'mock-topic',
		params: {
			request: {
				method: SESSION_REQUEST_SOL_SIGN_TRANSACTION,
				params: { transaction }
			}
		},
		verifyContext: {
			verified: {
				origin: 'https://mock-dapp.com'
			}
		}
	}) as WalletKitTypes.SessionRequest;

const renderModal = () =>
	render(SolWalletConnectSignModal, {
		props: {
			listener: null,
			network: SOLANA_MAINNET_NETWORK,
			request: mockRequest()
		}
	});

describe('SolWalletConnectSignModal', () => {
	const approveButton = () => screen.queryByRole('button', { name: get(i18n).core.text.approve });

	beforeEach(() => {
		vi.clearAllMocks();

		solAddressMainnetStore.set({ data: mockSolAddress, certified: false });
		splDefaultTokensStore.reset();
		splCustomTokensStore.resetAll();

		vi.mocked(sign).mockResolvedValue({ success: true });
	});

	it('should hide approval until decode resolves for native SOL', async () => {
		const deferred = createDeferred<MappedSolTransaction>();
		vi.mocked(decode).mockReturnValue(deferred.promise);

		renderModal();

		await waitFor(() => expect(decode).toHaveBeenCalledOnce());

		expect(approveButton()).not.toBeInTheDocument();

		deferred.resolve({
			amount: 1n,
			destination: mockSolAddress2,
			isApproval: false
		});

		await waitFor(() => expect(screen.getByText(mockSolAddress2)).toBeInTheDocument());

		expect(approveButton()).toBeInTheDocument();
	});

	it('should keep approval hidden when decoded SPL token is not enabled', async () => {
		const deferred = createDeferred<MappedSolTransaction>();
		vi.mocked(decode).mockReturnValue(deferred.promise);

		renderModal();

		await waitFor(() => expect(decode).toHaveBeenCalledOnce());

		expect(approveButton()).not.toBeInTheDocument();

		deferred.resolve({
			amount: 1n,
			destination: mockSolAddress2,
			isApproval: false,
			tokenAddress: mockSolAddress3
		});

		await waitFor(() => expect(screen.getByText(mockSolAddress2)).toBeInTheDocument());

		expect(approveButton()).not.toBeInTheDocument();
	});
});
