import type { _SERVICE as PlugHelperService } from '$declarations/plug_helper/plug_helper.did';
import { PlugHelperCanister } from '$lib/canisters/plug-helper.canister';
import { PLUG_HELPER_CANISTER_ID } from '$lib/constants/plug.constants';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('plug-helper.canister', () => {
	const service = mock<ActorSubclass<PlugHelperService>>();

	const createCanister = ({
		serviceOverride
	}: Pick<CreateCanisterOptions<PlugHelperService>, 'serviceOverride'>) =>
		PlugHelperCanister.create({
			canisterId: Principal.fromText(PLUG_HELPER_CANISTER_ID),
			identity: mockIdentity,
			serviceOverride,
			certifiedServiceOverride: serviceOverride
		});

	const SIGNED_TX = '0x02f8710182...';

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('signEthTransaction', () => {
		const params = {
			to: '0xab9aEB30eAE740497aADb1Ae0F347db548457ac4',
			amount: 1_000n,
			gasLimit: 21_000n,
			maxFeePerGas: 30_000_000_000n,
			maxPriorityFeePerGas: 1_000_000_000n,
			nonce: 7n,
			chainId: 8453n
		};

		it('returns the signed transaction', async () => {
			service.send_eth.mockResolvedValue({ Ok: SIGNED_TX });

			const { signEthTransaction } = await createCanister({ serviceOverride: service });

			await expect(signEthTransaction(params)).resolves.toBe(SIGNED_TX);
		});

		it('asks for a signature only, never for the canister to broadcast', async () => {
			service.send_eth.mockResolvedValue({ Ok: SIGNED_TX });

			const { signEthTransaction } = await createCanister({ serviceOverride: service });
			await signEthTransaction(params);

			expect(service.send_eth).toHaveBeenCalledExactlyOnceWith(
				{ Sign: null },
				params.to,
				params.amount,
				params.gasLimit,
				params.maxFeePerGas,
				params.maxPriorityFeePerGas,
				params.nonce,
				params.chainId
			);
		});

		it('throws the canister error text', async () => {
			service.send_eth.mockResolvedValue({ Err: 'nonce too low' });

			const { signEthTransaction } = await createCanister({ serviceOverride: service });

			await expect(signEthTransaction(params)).rejects.toThrow('nonce too low');
		});
	});

	describe('signErc20Transaction', () => {
		const params = {
			amount: 5_000_000n,
			gasLimit: 60_000n,
			maxFeePerGas: 30_000_000_000n,
			maxPriorityFeePerGas: 1_000_000_000n,
			nonce: 7n,
			chainId: 8453n,
			contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
			to: '0xab9aEB30eAE740497aADb1Ae0F347db548457ac4'
		};

		it('passes the contract and recipient in the canister order', async () => {
			service.send_erc20.mockResolvedValue({ Ok: SIGNED_TX });

			const { signErc20Transaction } = await createCanister({ serviceOverride: service });
			await signErc20Transaction(params);

			expect(service.send_erc20).toHaveBeenCalledExactlyOnceWith(
				{ Sign: null },
				params.amount,
				params.gasLimit,
				params.maxFeePerGas,
				params.maxPriorityFeePerGas,
				params.nonce,
				params.chainId,
				params.contractAddress,
				params.to
			);
		});

		it('throws the canister error text', async () => {
			service.send_erc20.mockResolvedValue({ Err: 'insufficient allowance' });

			const { signErc20Transaction } = await createCanister({ serviceOverride: service });

			await expect(signErc20Transaction(params)).rejects.toThrow('insufficient allowance');
		});
	});

	describe('signBtcTransaction', () => {
		const params = {
			to: 'bc1pwn0fe4xjvuvf6dx3saep25azwv74jyzksf5ggys28al4t8mg5j5qtdmdej',
			amount: 10_000n,
			fee: 500n,
			network: { Mainnet: null },
			utxos: []
		};

		it('returns the signed transaction', async () => {
			service.send_btc.mockResolvedValue({ Ok: SIGNED_TX });

			const { signBtcTransaction } = await createCanister({ serviceOverride: service });

			await expect(signBtcTransaction(params)).resolves.toBe(SIGNED_TX);
		});

		it('throws the canister error text', async () => {
			service.send_btc.mockResolvedValue({ Err: 'no utxos' });

			const { signBtcTransaction } = await createCanister({ serviceOverride: service });

			await expect(signBtcTransaction(params)).rejects.toThrow('no utxos');
		});
	});

	describe('signSolMessage', () => {
		it('returns the signature as bytes', async () => {
			service.sign_sol.mockResolvedValue({ Ok: Uint8Array.from([1, 2, 3]) });

			const { signSolMessage } = await createCanister({ serviceOverride: service });

			await expect(signSolMessage(Uint8Array.from([9]))).resolves.toEqual(
				Uint8Array.from([1, 2, 3])
			);
		});

		it('throws the canister error text', async () => {
			service.sign_sol.mockResolvedValue({ Err: 'bad message' });

			const { signSolMessage } = await createCanister({ serviceOverride: service });

			await expect(signSolMessage(Uint8Array.from([9]))).rejects.toThrow('bad message');
		});
	});
});
