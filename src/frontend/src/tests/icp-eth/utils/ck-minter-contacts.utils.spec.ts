import { toCkMinterBuiltInContacts } from '$icp-eth/utils/ck-minter-contacts.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { ContactUi } from '$lib/types/contact';
import {
	mockCkEthereumMinterAddress,
	mockCkMinterInfo,
	mockErc20HelperContractAddress,
	mockEthHelperContractAddress
} from '$tests/mocks/ck-minter.mock';
import { toNullable } from '@dfinity/utils';

describe('ck-minter-contacts.utils', () => {
	const certifiedMinterInfo = { data: mockCkMinterInfo, certified: false };

	describe('toCkMinterBuiltInContacts', () => {
		const params = { minterInfo: certifiedMinterInfo };

		const expected: ContactUi[] = [
			{
				id: -100_000n,
				name: 'ckETH Minter Helper Contract',
				addresses: [{ address: mockEthHelperContractAddress, addressType: 'Eth' }],
				updateTimestampNs: ZERO
			},
			{
				id: -100_001n,
				name: 'ckERC20 Minter Helper Contract',
				addresses: [{ address: mockErc20HelperContractAddress, addressType: 'Eth' }],
				updateTimestampNs: ZERO
			},
			{
				id: -100_002n,
				name: 'CK Ethereum Minter',
				addresses: [{ address: mockCkEthereumMinterAddress, addressType: 'Eth' }],
				updateTimestampNs: ZERO
			}
		];

		it('should return empty array when minterInfo is nullish', () => {
			expect(toCkMinterBuiltInContacts({ minterInfo: undefined })).toEqual([]);

			expect(toCkMinterBuiltInContacts({ minterInfo: null })).toEqual([]);
		});

		it('should return the built-in CK minters contacts when all addresses are present', () => {
			const result = toCkMinterBuiltInContacts(params);

			expect(result).toStrictEqual(expected);
		});

		it('should skip contacts whose address function returns nullish', () => {
			const partialMinterInfo = {
				data: {
					...mockCkMinterInfo,
					eth_helper_contract_address: toNullable<string>(),
					erc20_helper_contract_address: toNullable<string>()
				},
				certified: false
			};

			const result = toCkMinterBuiltInContacts({ minterInfo: partialMinterInfo });

			expect(result).toStrictEqual([expected[2]]);
		});

		it('should return empty array when all addresses are nullish', () => {
			const emptyMinterInfo = {
				data: {
					...mockCkMinterInfo,
					eth_helper_contract_address: toNullable<string>(),
					erc20_helper_contract_address: toNullable<string>(),
					minter_address: toNullable<string>()
				},
				certified: false
			};

			const result = toCkMinterBuiltInContacts({ minterInfo: emptyMinterInfo });

			expect(result).toEqual([]);
		});

		it('should preserve correct index-based IDs even when some addresses are skipped', () => {
			const partialMinterInfo = {
				data: {
					...mockCkMinterInfo,
					eth_helper_contract_address: toNullable<string>()
				},
				certified: false
			};

			const result = toCkMinterBuiltInContacts({ minterInfo: partialMinterInfo });

			expect(result).toStrictEqual([expected[1], expected[2]]);
		});
	});
});
