import type { _SERVICE as SignerService, SignRequest } from '$declarations/signer/signer.did';
import { SignerCanister, type SignerCanisterOptions } from '$lib/canisters/signer.canister';
import { type ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { mock } from 'vitest-mock-extended';
import { mockIdentity } from '../../mocks/identity.mock';

vi.mock(import('$lib/constants/app.constants'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		LOCAL: false
	};
});

describe('signer.canister', () => {
	const createSignerCanister = async (
		services: Pick<SignerCanisterOptions<SignerService>, 'serviceOverride'>
	): Promise<SignerCanister> =>
		SignerCanister.create({
			canisterId: Principal.fromText('tdxud-2yaaa-aaaad-aadiq-cai'),
			identity: mockIdentity,
			...services
		});
	const service = mock<ActorSubclass<SignerService>>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns correct BTC balance', async () => {
		const response = 2n;
		const params = {
			network: { mainnet: null }
		};
		service.caller_btc_balance.mockResolvedValue(response);

		const { updateBtcBalance } = await createSignerCanister({
			serviceOverride: service
		});

		const res = await updateBtcBalance({ ...params, certified: false });

		expect(res).toEqual(response);
		expect(service.caller_btc_balance).toHaveBeenCalledWith(params.network);
	});

	it('returns correct BTC address', async () => {
		const response = 'test-bitcoin-address';
		const params = {
			network: { mainnet: null }
		};
		service.caller_btc_address.mockResolvedValue(response);

		const { getBtcAddress } = await createSignerCanister({
			serviceOverride: service
		});

		const res = await getBtcAddress({ ...params, certified: false });

		expect(res).toEqual(response);
		expect(service.caller_btc_address).toHaveBeenCalledWith(params.network);
	});

	it('returns correct ETH address', async () => {
		const response = 'test-eth-address';
		service.caller_eth_address.mockResolvedValue(response);

		const { getEthAddress } = await createSignerCanister({
			serviceOverride: service
		});

		const res = await getEthAddress({ certified: false });

		expect(res).toEqual(response);
	});

	it('signs transaction', async () => {
		const response = 'signed-transaction';
		const params = {
			transaction: {
				to: 'to',
				gas: 1n,
				value: 2n,
				max_priority_fee_per_gas: 1n,
				data: [],
				max_fee_per_gas: 5n,
				chain_id: 10n,
				nonce: 10n
			} as SignRequest
		};
		service.sign_transaction.mockResolvedValue(response);

		const { signTransaction } = await createSignerCanister({
			serviceOverride: service
		});

		const res = await signTransaction({ ...params, certified: false });

		expect(res).toEqual(response);
		expect(service.sign_transaction).toHaveBeenCalledWith(params.transaction);
	});

	it('calls personal sign', async () => {
		const response = 'personal-sign';
		const params = {
			message: 'message'
		};
		service.personal_sign.mockResolvedValue(response);

		const { personalSign } = await createSignerCanister({
			serviceOverride: service
		});

		const res = await personalSign({ ...params, certified: false });

		expect(res).toEqual(response);
		expect(service.personal_sign).toHaveBeenCalledWith(params.message);
	});

	it('signs prehash', async () => {
		const response = 'personal-sign';
		const params = {
			hash: 'hash'
		};
		service.sign_prehash.mockResolvedValue(response);

		const { signPrehash } = await createSignerCanister({
			serviceOverride: service
		});

		const res = await signPrehash({ ...params, certified: false });

		expect(res).toEqual(response);
		expect(service.sign_prehash).toHaveBeenCalledWith(params.hash);
	});
});
