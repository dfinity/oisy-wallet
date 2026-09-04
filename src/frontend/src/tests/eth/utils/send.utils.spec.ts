import { maxGasFee } from '$eth/utils/fee.utils';
import { capSendAmountToFee } from '$eth/utils/send.utils';
import { ZERO } from '$lib/constants/app.constants';

describe('capSendAmountToFee', () => {
	const gas = 21_000n;
	const balance = 2_453_569_936_352_484n;

	// The sample "Max" was priced against.
	const quoted = { maxFeePerGas: 22_200_000n, maxPriorityFeePerGas: 2_200_000n, gas };
	const maxAmount = balance - (maxGasFee(quoted) ?? ZERO);

	it('leaves the amount alone when the fee has not moved', () => {
		expect(capSendAmountToFee({ amount: maxAmount, balance, feeData: quoted })).toBe(maxAmount);
	});

	// The defect: a fee that rose between the amount step and signing leaves the frozen amount
	// unable to cover `gas * maxFeePerGas`, and the chain drops the transaction silently.
	it('caps the amount when the fee has risen', () => {
		const risen = { ...quoted, maxFeePerGas: 22_213_310n };

		const capped = capSendAmountToFee({ amount: maxAmount, balance, feeData: risen });

		expect(capped).toBeLessThan(maxAmount);
		expect(capped + (maxGasFee(risen) ?? ZERO)).toBeLessThanOrEqual(balance);
	});

	it('never raises the amount when the fee has fallen, so the send stays what was reviewed', () => {
		const fallen = { ...quoted, maxFeePerGas: 11_000_000n };

		expect(capSendAmountToFee({ amount: maxAmount, balance, feeData: fallen })).toBe(maxAmount);
	});

	// The cap is only as complete as the snapshot it is handed. On an OP-stack chain the ceiling
	// includes the L1 data fee, so a caller that rebuilds the fee object from parts and omits it
	// would cap against a ceiling lower than the chain's and reopen the shortfall.
	it('counts the OP-stack L1 data fee in the ceiling it caps against', () => {
		const l1Fee = 1_583_231_633n;
		const withL1 = { ...quoted, l1Fee };

		const capped = capSendAmountToFee({ amount: maxAmount, balance, feeData: withL1 });

		expect(capped).toBe(maxAmount - l1Fee);
		expect(capped + (maxGasFee(withL1) ?? ZERO)).toBeLessThanOrEqual(balance);
	});

	it('goes non-positive when the fee alone exceeds the balance, so the caller can refuse', () => {
		const unaffordable = { ...quoted, maxFeePerGas: balance };

		expect(
			capSendAmountToFee({ amount: maxAmount, balance, feeData: unaffordable })
		).toBeLessThanOrEqual(ZERO);
	});

	it.each([
		{ label: 'the balance is unknown', balance: undefined, feeData: quoted },
		{ label: 'the ceiling is unknown', balance, feeData: { ...quoted, maxFeePerGas: null } }
	])('leaves the amount alone when $label', ({ balance: bal, feeData }) => {
		expect(capSendAmountToFee({ amount: maxAmount, balance: bal, feeData })).toBe(maxAmount);
	});
});
