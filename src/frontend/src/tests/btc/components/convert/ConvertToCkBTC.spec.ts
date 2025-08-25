import ConvertToCkBTC from '$btc/components/convert/ConvertToCkBTC.svelte';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import * as ckMinterInfoWorkerServices from '$icp/services/worker.ck-minter-info.services';
import type { IcCkToken } from '$icp/types/ic-token';
import * as isBusyStore from '$lib/derived/busy.derived';
import * as tokensStore from '$lib/derived/tokens.derived';
import { HERO_CONTEXT_KEY } from '$lib/stores/hero.store';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('ConvertToCkBTC', () => {
	const buttonId = 'convert-to-ckbtc-button';
	const mockCkBtcToken = {
		...mockValidIcCkToken,
		symbol: BTC_MAINNET_TOKEN.twinTokenSymbol
	} as IcCkToken;
	const serviceCallParams = {
		token: mockCkBtcToken,
		minterCanisterId: mockCkBtcToken.minterCanisterId,
		twinToken: undefined
	};
	const mockContext = (outflowActionsDisabled = false) =>
		new Map([
			[
				HERO_CONTEXT_KEY,
				{
					outflowActionsDisabled: readable(outflowActionsDisabled)
				}
			]
		]);
	const mockTokensStore = () =>
		vi
			.spyOn(tokensStore, 'tokens', 'get')
			.mockImplementation(() => readable([BTC_MAINNET_TOKEN, mockCkBtcToken]));
	const mockCkMinterInfoWorkerServices = () =>
		vi.spyOn(ckMinterInfoWorkerServices, 'initCkBTCMinterInfoWorker').mockResolvedValue({
			start: () => {},
			stop: () => {},
			trigger: () => {},
			destroy: () => {}
		});
	const mockIsBusyStore = (isBusy = false) =>
		vi.spyOn(isBusyStore, 'isBusy', 'get').mockImplementation(() => readable(isBusy));

	it('should keep the button disabled and not call the service if ckBtcToken is not available', () => {
		const spy = mockCkMinterInfoWorkerServices();
		mockIsBusyStore();

		const { getByTestId } = render(ConvertToCkBTC, {
			context: mockContext()
		});

		expect(getByTestId(buttonId)).toHaveAttribute('disabled');
		expect(spy).not.toHaveBeenCalled();
	});

	it('should keep the button disabled but call the service if outflowActionsDisabled is true', () => {
		const spy = mockCkMinterInfoWorkerServices();
		mockTokensStore();
		mockIsBusyStore();

		const { getByTestId } = render(ConvertToCkBTC, {
			context: mockContext(true)
		});

		expect(getByTestId(buttonId)).toHaveAttribute('disabled');
		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(serviceCallParams);
	});

	it('should keep the button disabled but call the service if isBusy is true', () => {
		const spy = mockCkMinterInfoWorkerServices();
		mockTokensStore();
		mockIsBusyStore(true);

		const { getByTestId } = render(ConvertToCkBTC, {
			context: mockContext()
		});

		expect(getByTestId(buttonId)).toHaveAttribute('disabled');
		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(serviceCallParams);
	});

	it('should keep the button enabled and call the service if ckBtcToken is available', () => {
		const spy = mockCkMinterInfoWorkerServices();
		mockTokensStore();
		mockIsBusyStore();

		const { getByTestId } = render(ConvertToCkBTC, {
			context: mockContext()
		});

		expect(getByTestId(buttonId)).not.toHaveAttribute('disabled');
		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(serviceCallParams);
	});
});
