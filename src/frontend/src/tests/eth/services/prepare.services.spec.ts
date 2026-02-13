import { prepare } from '$eth/services/prepare.services';
import { bn1Bi } from '$tests/mocks/balances.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { toNullable } from '@dfinity/utils';

describe('prepare.services', () => {
	describe('prepare', () => {
		const mockParams = {
			maxPriorityFeePerGas: 123n,
			maxFeePerGas: 456n,
			nonce: 100,
			gas: 789n,
			chainId: 1_234n,
			data: 'any-data',
			to: mockEthAddress,
			amount: bn1Bi
		};

		const expected = {
			to: mockEthAddress,
			chain_id: 1_234n,
			nonce: 100n,
			gas: 789n,
			max_fee_per_gas: 456n,
			max_priority_fee_per_gas: 123n,
			value: bn1Bi,
			data: toNullable('any-data')
		};

		it('should prepare the params for a transaction', () => {
			expect(prepare(mockParams)).toStrictEqual(expected);
		});

		it('should raise an error if the data are nullish', () => {
			expect(() => prepare({ ...mockParams, data: undefined })).toThrowError(
				en.send.error.erc20_data_undefined
			);
		});
	});
});
