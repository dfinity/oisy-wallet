import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { send } from '$eth/services/send.services';
import { MobileEthSendPendingError, MobileEthSendSessionExpiredError } from '$eth/types/send';
import { ZERO } from '$lib/constants/app.constants';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { keccak256 } from 'ethers/crypto';

const mocks = vi.hoisted(() => ({
	loadIdentity: vi.fn(),
	getEthAddress: vi.fn(),
	signTransaction: vi.fn(),
	getNonce: vi.fn(),
	approve: vi.fn(),
	sendTransaction: vi.fn(),
	processTransactionSent: vi.fn(),
	populateTransaction: vi.fn()
}));
vi.mock('$lib/constants/mobile.constants', () => ({ MOBILE_SHELL: true }));
vi.mock('$lib/providers/auth-client.providers', () => ({
	AuthClientProvider: {
		getInstance: () => ({ loadIdentity: mocks.loadIdentity })
	}
}));
vi.mock('$lib/api/signer.api', () => ({
	getEthAddress: mocks.getEthAddress,
	signTransaction: mocks.signTransaction
}));
vi.mock('$eth/services/nonce.services', () => ({ getNonce: mocks.getNonce }));
vi.mock('$eth/services/approve.services', () => ({ approve: mocks.approve }));
vi.mock('$eth/services/eth-transaction.services', () => ({
	processTransactionSent: mocks.processTransactionSent
}));
vi.mock('$eth/providers/infura.providers', () => ({
	infuraProviders: () => ({ sendTransaction: mocks.sendTransaction })
}));
vi.mock('$eth/providers/infura-erc20.providers', () => ({
	InfuraErc20Provider: vi.fn(class {}),
	infuraErc20Providers: () => ({ populateTransaction: mocks.populateTransaction })
}));

const from = '0x1111111111111111111111111111111111111111';
const to = '0x2222222222222222222222222222222222222222';
const erc20Token = {
	...mockValidErc20Token,
	address: '0x3333333333333333333333333333333333333333'
};
const rawTransaction = '0x1234';
const hash = keccak256(rawTransaction);
const makeParams = () => ({
	from,
	to,
	token: ETHEREUM_TOKEN,
	sourceNetwork: ETHEREUM_NETWORK,
	identity: mockIdentity,
	amount: 100n,
	gas: 21000n,
	maxFeePerGas: 20n,
	maxPriorityFeePerGas: 2n,
	beforeBroadcast: vi.fn().mockResolvedValue(undefined)
});

describe('mobile direct EVM send', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mocks.loadIdentity.mockResolvedValue(mockIdentity);
		mocks.getEthAddress.mockResolvedValue(from);
		mocks.getNonce.mockResolvedValue(3);
		mocks.signTransaction.mockResolvedValue(rawTransaction);
		mocks.sendTransaction.mockResolvedValue({ hash });
		mocks.processTransactionSent.mockResolvedValue(undefined);
		mocks.populateTransaction.mockResolvedValue({ data: '0x1234' });
	});

	it('persists the signed hash and nonce before direct ETH broadcast without an approval', async () => {
		const params = makeParams();
		params.beforeBroadcast.mockImplementation(() => {
			expect(mocks.signTransaction).toHaveBeenCalledOnce();
			expect(mocks.sendTransaction).not.toHaveBeenCalled();

			return Promise.resolve();
		});

		await expect(send(params)).resolves.toEqual({ hash, nonce: 3 });
		expect(params.beforeBroadcast).toHaveBeenCalledWith({ hash, nonce: 3 });
		expect(mocks.sendTransaction).toHaveBeenCalledExactlyOnceWith(rawTransaction);
		expect(mocks.approve).not.toHaveBeenCalled();
	});

	it('signs Base native ETH with its canonical chain id', async () => {
		await send({ ...makeParams(), token: BASE_ETH_TOKEN, sourceNetwork: BASE_NETWORK });

		expect(mocks.signTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				transaction: expect.objectContaining({ chain_id: BASE_NETWORK.chainId })
			})
		);
	});

	it('uses the existing ERC20 transfer population and signs its contract call', async () => {
		await send({ ...makeParams(), token: erc20Token });

		expect(mocks.populateTransaction).toHaveBeenCalledWith({
			contract: erc20Token,
			to,
			amount: 100n
		});
		expect(mocks.signTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				transaction: expect.objectContaining({
					to: erc20Token.address,
					value: ZERO,
					data: ['0x1234']
				})
			})
		);
		expect(mocks.approve).not.toHaveBeenCalled();
	});

	it.each([
		{ sourceNetwork: BASE_NETWORK },
		{ token: { ...ETHEREUM_TOKEN, network: BASE_NETWORK }, sourceNetwork: BASE_NETWORK },
		{ sourceNetwork: { ...ETHEREUM_NETWORK, chainId: 8453n } },
		{ targetNetwork: ICP_NETWORK },
		{ token: { ...ETHEREUM_TOKEN, standard: { code: 'erc4626' as const } } },
		{ amount: ZERO },
		{ data: '0x1234' },
		{ customNonce: 4 },
		{ beforeBroadcast: undefined }
	])('rejects unsupported direct-transfer inputs before signing: %o', async (overrides) => {
		await expect(send({ ...makeParams(), ...overrides })).rejects.toThrow();
		expect(mocks.signTransaction).not.toHaveBeenCalled();
		expect(mocks.sendTransaction).not.toHaveBeenCalled();
		expect(mocks.approve).not.toHaveBeenCalled();
	});

	it('rejects a sender address that does not belong to the active signer', async () => {
		mocks.getEthAddress.mockResolvedValue(to);

		await expect(send(makeParams())).rejects.toThrow();
		expect(mocks.signTransaction).not.toHaveBeenCalled();
	});

	it('rejects an expired session before signing', async () => {
		mocks.loadIdentity.mockResolvedValue(undefined);

		await expect(send(makeParams())).rejects.toBeInstanceOf(MobileEthSendSessionExpiredError);
		expect(mocks.signTransaction).not.toHaveBeenCalled();
	});

	it('rechecks the session after signing and does not persist or broadcast an expired intent', async () => {
		mocks.signTransaction.mockImplementation(() => {
			mocks.loadIdentity.mockResolvedValue(undefined);
			return Promise.resolve(rawTransaction);
		});
		const params = makeParams();

		await expect(send(params)).rejects.toBeInstanceOf(MobileEthSendSessionExpiredError);
		expect(params.beforeBroadcast).not.toHaveBeenCalled();
		expect(mocks.sendTransaction).not.toHaveBeenCalled();
	});

	it('rechecks the session after saving recovery and immediately before broadcast', async () => {
		const params = makeParams();
		params.beforeBroadcast.mockImplementation(() => {
			mocks.loadIdentity.mockResolvedValue(undefined);
			return Promise.resolve();
		});

		await expect(send(params)).rejects.toBeInstanceOf(MobileEthSendSessionExpiredError);
		expect(mocks.sendTransaction).not.toHaveBeenCalled();
	});

	it('does not broadcast when the durable record cannot be saved', async () => {
		const params = makeParams();
		params.beforeBroadcast.mockRejectedValue(new Error('storage unavailable'));

		await expect(send(params)).rejects.toThrow('storage unavailable');
		expect(mocks.sendTransaction).not.toHaveBeenCalled();
	});

	it('retains hash and nonce on uncertain broadcast without signing a second transaction', async () => {
		mocks.sendTransaction.mockRejectedValue(new Error('network response lost'));

		await expect(send(makeParams())).rejects.toMatchObject(
			new MobileEthSendPendingError({ hash, nonce: 3 })
		);
		expect(mocks.signTransaction).toHaveBeenCalledOnce();
		expect(mocks.sendTransaction).toHaveBeenCalledOnce();
	});

	it('latches duplicate submissions before any awaited work', async () => {
		let finish: ((value: { hash: string }) => void) | undefined;
		mocks.sendTransaction.mockImplementation(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				})
		);
		const first = send(makeParams());

		await expect(send(makeParams())).rejects.toThrow();

		await vi.waitFor(() => expect(finish).toBeDefined());
		finish?.({ hash });
		await first;

		expect(mocks.signTransaction).toHaveBeenCalledOnce();
	});

	it('does not sign after the requesting view has been dismissed', async () => {
		await expect(send({ ...makeParams(), canProceed: () => false })).rejects.toThrow();
		expect(mocks.signTransaction).not.toHaveBeenCalled();
	});
});
