import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';

describe('convertNumberToSatoshis', () => {
	it('converts number to Satoshis correctly', () => {
		expect(convertNumberToSatoshis({ amount: 1 })).toEqual(100000000n);
		expect(convertNumberToSatoshis({ amount: 0.00005 })).toEqual(5000n);
		expect(convertNumberToSatoshis({ amount: 0.25 })).toEqual(25000000n);
		expect(convertNumberToSatoshis({ amount: 0 })).toEqual(0n);
	});
});
