import { convertNumberToSatoshis, convertSatoshisToBtc } from '$btc/utils/btc-send.utils';

describe('convertNumberToSatoshis', () => {
	it('converts number to Satoshis correctly', () => {
		expect(convertNumberToSatoshis({ amount: 1 })).toEqual(100000000n);
		expect(convertNumberToSatoshis({ amount: 0.00005 })).toEqual(5000n);
		expect(convertNumberToSatoshis({ amount: 0.25 })).toEqual(25000000n);
		expect(convertNumberToSatoshis({ amount: 0 })).toEqual(0n);
		expect(convertNumberToSatoshis({ amount: 0.00004 })).toEqual(4000n);
		expect(convertNumberToSatoshis({ amount: 0.00000001 })).toEqual(1n);
		expect(convertNumberToSatoshis({ amount: 0.0000399999999999999 })).toEqual(4000n);
	});
});

describe('convertSatoshisToBtc', () => {
	it('converts Satoshis to BTC correctly', () => {
		expect(convertSatoshisToBtc(100000000n)).toEqual('1');
		expect(convertSatoshisToBtc(5000n)).toEqual('0.00005');
		expect(convertSatoshisToBtc(25000000n)).toEqual('0.25');
		expect(convertSatoshisToBtc(0n)).toEqual('0');
		expect(convertSatoshisToBtc(4000n)).toEqual('0.00004');
		expect(convertSatoshisToBtc(1n)).toEqual('0.00000001');
	});
});
