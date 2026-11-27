import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { modalStore } from '$lib/stores/modal.store';
import type { UniversalScannerData } from '$lib/types/scanner';
import type { WalletKitTypes } from '@reown/walletkit';
import { get } from 'svelte/store';

describe('modal.store', () => {
	it('should initialise with undefined', () => {
		expect(get(modalStore)).toBeUndefined();
	});

	it('should open receive modal with modalId', () => {
		const id = Symbol('modalId');
		modalStore.openReceive(id);

		expect(get(modalStore)).toEqual({ type: 'receive', id });
	});

	it('should open how-to-convert modal with its tokens', () => {
		const id = Symbol('modalId');
		const data = { sourceToken: ETHEREUM_TOKEN, destinationToken: ICP_TOKEN };
		modalStore.openHowToConvertToTwinTokenEth({ id, data });

		expect(get(modalStore)).toEqual({ type: 'how-to-convert-to-twin-token-eth', id, data });
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

	it('should open the cycles-mint modal', () => {
		const id = Symbol('modalId');
		modalStore.openCyclesMint(id);

		expect(get(modalStore)).toEqual({ id, type: 'cycles-mint' });
	});

	it('should open the canister-top-up modal', () => {
		const id = Symbol('modalId');
		modalStore.openCanisterTopUp(id);

		expect(get(modalStore)).toEqual({ id, type: 'canister-top-up' });
	});

	it('should open harvest-stake modal with modalId', () => {
		const id = Symbol('modalId');
		modalStore.openHarvestStake(id);

		expect(get(modalStore)).toEqual({ type: 'harvest-stake', id });
	});

	it('should open harvest-unstake modal with modalId', () => {
		const id = Symbol('modalId');
		modalStore.openHarvestUnstake(id);

		expect(get(modalStore)).toEqual({ type: 'harvest-unstake', id });
	});

	it('should open universal-scanner modal without data', () => {
		const id = Symbol('modalId');
		modalStore.openUniversalScanner({ id });

		expect(get(modalStore)).toEqual({ type: 'universal-scanner', id });
	});

	it('should open universal-scanner modal with data', () => {
		const id = Symbol('modalId');
		const data: UniversalScannerData = { walletConnectUri: 'wc:abc123@2' };
		modalStore.openUniversalScanner({ id, data });

		expect(get(modalStore)).toEqual({ type: 'universal-scanner', id, data });
	});

	it('should close the modal and reset the store', () => {
		const id = Symbol('modalId');
		modalStore.openEthToken({ id, data: undefined });
		modalStore.close();

		expect(get(modalStore)).toBeNull();
	});
});
