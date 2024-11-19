import { modalStore } from '$lib/stores/modal.store';
import { get } from 'svelte/store';

describe('modal.store', () => {
	it('should initialise with undefined', () => {
		expect(get(modalStore)).toBeUndefined();
	});

	it('should open eth-receive modal with modalId', () => {
		const id = Symbol('modalId');
		modalStore.openEthReceive(id);

		expect(get(modalStore)).toEqual({ type: 'eth-receive', id });
	});

	it('should open icp-receive modal with modalId', () => {
		const id = Symbol('modalId');
		modalStore.openIcpReceive(id);

		expect(get(modalStore)).toEqual({ type: 'icp-receive', id });
	});

	it('should open wallet-connect-sign modal with data', () => {
		const data = { value: 12345 };
		modalStore.openWalletConnectSign(data);

		expect(get(modalStore)).toEqual({ type: 'wallet-connect-sign', data });
	});

	it('should open convert-ckbtc-btc modal without modalId', () => {
		modalStore.openConvertCkBTCToBTC();

		expect(get(modalStore)).toEqual({ type: 'convert-ckbtc-btc' });
	});

	it('should close the modal and reset the store', () => {
		modalStore.openToken();
		modalStore.close();

		expect(get(modalStore)).toBeNull();
	});
});
