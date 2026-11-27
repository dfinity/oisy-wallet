import { SignerCanisterPaymentError } from '$lib/canisters/signer.errors';
import { toastsError, toastsErrorNoTrace, toastsStore } from '$lib/stores/toasts.store';
import { LiquidiumSolTransferRefusedError } from '$lib/types/errors';
import en from '$tests/mocks/i18n.mock';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';

const insufficientAllowanceError = (): SignerCanisterPaymentError =>
	new SignerCanisterPaymentError({
		LedgerWithdrawFromError: {
			ledger: mockPrincipal,
			error: { InsufficientAllowance: { allowance: 7_800_000_000n } }
		}
	});

describe('toasts.store', () => {
	beforeEach(() => {
		toastsStore.reset();
	});

	it('shows a toast and returns its id', () => {
		const id = toastsStore.show({ level: 'success', text: 'hi' });

		const msgs = get(toastsStore);

		expect(msgs).toHaveLength(1);
		expect(msgs[0].id).toBe(id);
		expect(msgs[0].text).toBe('hi');
	});

	it('reuses a provided id', () => {
		const id = Symbol('custom');

		const returned = toastsStore.show({ id, level: 'info', text: 'hi' });

		expect(returned).toBe(id);
		expect(get(toastsStore)[0].id).toBe(id);
	});

	it('hides a toast by id', () => {
		const id = toastsStore.show({ level: 'success', text: 'a' });
		toastsStore.show({ level: 'success', text: 'b' });

		toastsStore.hide(id);

		const msgs = get(toastsStore);

		expect(msgs).toHaveLength(1);
		expect(msgs[0].text).toBe('b');
	});

	it('updates a toast content while preserving order', () => {
		const id = toastsStore.show({ level: 'info', text: 'first' });
		toastsStore.show({ level: 'info', text: 'second' });

		toastsStore.update({ id, content: { text: 'updated' } });

		const msgs = get(toastsStore);

		expect(msgs[0].text).toBe('updated');
		expect(msgs[1].text).toBe('second');
	});

	it('leaves other toasts unchanged when updating a missing id', () => {
		toastsStore.show({ level: 'info', text: 'keep' });

		toastsStore.update({ id: Symbol('missing'), content: { text: 'x' } });

		expect(get(toastsStore)[0].text).toBe('keep');
	});

	it('resets only the given levels', () => {
		toastsStore.show({ level: 'success', text: 't' });
		toastsStore.show({ level: 'warn', text: 't' });
		toastsStore.show({ level: 'error', text: 't' });
		toastsStore.show({ level: 'info', text: 't' });

		toastsStore.reset(['error', 'warn']);

		expect(get(toastsStore)).toHaveLength(2);
	});

	it('resets all toasts when no levels are given', () => {
		toastsStore.show({ level: 'success', text: 't' });
		toastsStore.show({ level: 'error', text: 't' });

		toastsStore.reset();

		expect(get(toastsStore)).toHaveLength(0);
	});

	it('resets all toasts when an empty level list is given', () => {
		toastsStore.show({ level: 'success', text: 't' });

		toastsStore.reset([]);

		expect(get(toastsStore)).toHaveLength(0);
	});
});

describe('toastsError', () => {
	beforeEach(() => {
		toastsStore.reset();

		vi.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	it('should add the error detail to the message', () => {
		toastsError({ msg: { text: 'Send failed.' }, err: new Error('detail') });

		expect(get(toastsStore)[0].text).toBe('Send failed. / detail');
	});

	// The allowance toast next to it says why; the flow's generic text and the raw ledger text would
	// only add noise.
	it('should show one clear text for an insufficient allowance', () => {
		toastsError({ msg: { text: 'Send failed.' }, err: insufficientAllowanceError() });

		expect(get(toastsStore)[0].text).toBe(en.core.error.usage_credits_insufficient);
	});

	it('should show one clear text for an insufficient allowance kept as the cause of another error', () => {
		toastsError({
			msg: { text: 'Send failed.' },
			err: new Error('not sent', { cause: insufficientAllowanceError() })
		});

		expect(get(toastsStore)[0].text).toBe(en.core.error.usage_credits_insufficient);
	});
});

describe('toastsErrorNoTrace', () => {
	beforeEach(() => {
		toastsStore.reset();

		vi.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	it('should show the message without the error detail', () => {
		toastsErrorNoTrace({ msg: { text: 'Supply failed.' }, err: new Error('detail') });

		expect(get(toastsStore)[0].text).toBe('Supply failed.');
	});

	it('should show one clear text for an insufficient allowance kept as the cause of another error', () => {
		toastsErrorNoTrace({
			msg: { text: 'Supply failed.' },
			err: new LiquidiumSolTransferRefusedError({ cause: insufficientAllowanceError() })
		});

		expect(get(toastsStore)[0]).toEqual(
			expect.objectContaining({ text: en.core.error.usage_credits_insufficient, level: 'error' })
		);
	});
});
