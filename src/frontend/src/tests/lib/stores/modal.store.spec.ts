import { modalStore } from '$lib/stores/modal.store';
import type { WalletKitTypes } from '@reown/walletkit';
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
		const id = Symbol('modalId');
		const data = { value: 12345 } as unknown as WalletKitTypes.SessionRequest;
		modalStore.openWalletConnectSign({ id, data });

		expect(get(modalStore)).toEqual({ type: 'wallet-connect-sign', id, data });
	});

	it('should open convert-ckbtc-btc modal without modalId', () => {
		const id = Symbol('modalId');
		modalStore.openConvertCkBTCToBTC(id);

		expect(get(modalStore)).toEqual({ id, type: 'convert-ckbtc-btc' });
	});

	it('should close the modal and reset the store', () => {
		const id = Symbol('modalId');
		modalStore.openEthToken({ id, data: undefined });
		modalStore.close();

		expect(get(modalStore)).toBeNull();
	});
});
