import type { MinterInfo } from '$declarations/cksol_minter/cksol_minter.did';
import { getDepositAddress, minterInfo } from '$icp/api/cksol-minter.api';
import {
	loadCkSolConversionAddresses,
	loadCkSolDepositAddress,
	resetCkSolDepositAddresses
} from '$icp/services/cksol-deposit.services';
import { ckSolDepositAddressesStore, ckSolMinterAddressStore } from '$icp/stores/cksol.store';
import { mockIdentity, mockPrincipal2 } from '$tests/mocks/identity.mock';
import { mockSolAddress, mockSolAddress2, mockSolAddress3 } from '$tests/mocks/sol.mock';
import { AnonymousIdentity, type Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

vi.mock('$icp/api/cksol-minter.api', () => ({
	getDepositAddress: vi.fn(),
	minterInfo: vi.fn()
}));

describe('cksol-deposit.services', () => {
	const minterCanisterId = 'lh22c-kyaaa-aaaar-qb5nq-cai';

	const mockMinterInfo: MinterInfo = {
		deposit_sol_fee: 45_000_000_000n,
		balance: 995_500n,
		withdrawal_fee: 1_000_000n,
		minimum_deposit_amount: 20_000_000n,
		deposit_sol_required_cycles: 1_000_000_000_000n,
		nonce_accounts: [],
		minimum_withdrawal_amount: 2_000_000n,
		minter_address: [mockSolAddress3],
		automatic_deposit_fee: [],
		collected_automatic_deposit_fees: []
	};

	beforeEach(() => {
		vi.clearAllMocks();

		resetCkSolDepositAddresses();

		ckSolMinterAddressStore.set(undefined);
		ckSolDepositAddressesStore.set({});

		vi.mocked(getDepositAddress).mockResolvedValue(mockSolAddress);
		vi.mocked(minterInfo).mockResolvedValue(mockMinterInfo);
	});

	describe('loadCkSolConversionAddresses', () => {
		it('should keep the minter address and the deposit address of the principal', async () => {
			await loadCkSolConversionAddresses({ identity: mockIdentity, minterCanisterId });

			expect(get(ckSolMinterAddressStore)).toBe(mockSolAddress3);
			expect(get(ckSolDepositAddressesStore)).toStrictEqual({
				[mockIdentity.getPrincipal().toText()]: mockSolAddress
			});
		});

		it('should read the minter info anonymously and uncertified', async () => {
			await loadCkSolConversionAddresses({ identity: mockIdentity, minterCanisterId });

			expect(minterInfo).toHaveBeenCalledExactlyOnceWith({
				identity: expect.any(AnonymousIdentity),
				minterCanisterId,
				certified: false
			});
		});

		it('should share the deposit address the quotes already asked for', async () => {
			await loadCkSolDepositAddress({ identity: mockIdentity, minterCanisterId });
			await loadCkSolConversionAddresses({ identity: mockIdentity, minterCanisterId });

			expect(getDepositAddress).toHaveBeenCalledOnce();
		});

		it('should keep the deposit address of each principal apart', async () => {
			const otherIdentity = { getPrincipal: () => mockPrincipal2 } as unknown as Identity;

			vi.mocked(getDepositAddress).mockResolvedValueOnce(mockSolAddress);
			vi.mocked(getDepositAddress).mockResolvedValueOnce(mockSolAddress2);

			await loadCkSolConversionAddresses({ identity: mockIdentity, minterCanisterId });
			await loadCkSolConversionAddresses({ identity: otherIdentity, minterCanisterId });

			expect(get(ckSolDepositAddressesStore)).toStrictEqual({
				[mockIdentity.getPrincipal().toText()]: mockSolAddress,
				[mockPrincipal2.toText()]: mockSolAddress2
			});
		});

		it('should keep no minter address when the minter has none', async () => {
			vi.mocked(minterInfo).mockResolvedValue({ ...mockMinterInfo, minter_address: [] });

			await loadCkSolConversionAddresses({ identity: mockIdentity, minterCanisterId });

			expect(get(ckSolMinterAddressStore)).toBeUndefined();
		});

		it('should keep the deposit address when the minter info fails', async () => {
			const spyConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

			vi.mocked(minterInfo).mockRejectedValue(new Error('unreachable'));

			await expect(
				loadCkSolConversionAddresses({ identity: mockIdentity, minterCanisterId })
			).resolves.toBeUndefined();

			expect(get(ckSolMinterAddressStore)).toBeUndefined();
			expect(get(ckSolDepositAddressesStore)).toStrictEqual({
				[mockIdentity.getPrincipal().toText()]: mockSolAddress
			});
			expect(spyConsoleError).toHaveBeenCalledOnce();
		});

		it('should keep the minter address when the deposit address fails', async () => {
			const spyConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

			vi.mocked(getDepositAddress).mockRejectedValue(new Error('unreachable'));

			await expect(
				loadCkSolConversionAddresses({ identity: mockIdentity, minterCanisterId })
			).resolves.toBeUndefined();

			expect(get(ckSolMinterAddressStore)).toBe(mockSolAddress3);
			expect(get(ckSolDepositAddressesStore)).toStrictEqual({});
			expect(spyConsoleError).toHaveBeenCalledOnce();
		});
	});

	describe('loadCkSolDepositAddress', () => {
		it('should ask the minter for the deposit address of the identity', async () => {
			await expect(
				loadCkSolDepositAddress({ identity: mockIdentity, minterCanisterId })
			).resolves.toBe(mockSolAddress);
			expect(getDepositAddress).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				minterCanisterId
			});
		});

		it('should ask the minter only once per account', async () => {
			await loadCkSolDepositAddress({ identity: mockIdentity, minterCanisterId });
			await loadCkSolDepositAddress({ identity: mockIdentity, minterCanisterId });

			expect(getDepositAddress).toHaveBeenCalledOnce();
		});

		it('should ask the minter again for another identity', async () => {
			const otherIdentity = { getPrincipal: () => mockPrincipal2 } as unknown as Identity;

			vi.mocked(getDepositAddress).mockResolvedValueOnce(mockSolAddress);
			vi.mocked(getDepositAddress).mockResolvedValueOnce(mockSolAddress2);

			await expect(
				loadCkSolDepositAddress({ identity: mockIdentity, minterCanisterId })
			).resolves.toBe(mockSolAddress);
			await expect(
				loadCkSolDepositAddress({ identity: otherIdentity, minterCanisterId })
			).resolves.toBe(mockSolAddress2);
			expect(getDepositAddress).toHaveBeenCalledTimes(2);
		});

		it('should ask the minter again after a failed call', async () => {
			vi.mocked(getDepositAddress).mockRejectedValueOnce(new Error('unreachable'));

			await expect(
				loadCkSolDepositAddress({ identity: mockIdentity, minterCanisterId })
			).rejects.toThrow('unreachable');
			await expect(
				loadCkSolDepositAddress({ identity: mockIdentity, minterCanisterId })
			).resolves.toBe(mockSolAddress);
			expect(getDepositAddress).toHaveBeenCalledTimes(2);
		});
	});
});
