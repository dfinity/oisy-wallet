import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import {
	IC_CKBTC_LEDGER_CANISTER_ID,
	IC_CKBTC_MINTER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import {
	IC_CKETH_LEDGER_CANISTER_ID,
	IC_CKETH_MINTER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.ck.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import CkMinterInfoLoader from '$icp/components/loaders/CkMinterInfoLoader.svelte';
import {
	initCkBTCMinterInfoWorker,
	initCkETHMinterInfoWorker
} from '$icp/services/worker.ck-minter-info.services';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import type { IcCkToken } from '$icp/types/ic-token';
import * as tokensStore from '$lib/derived/tokens.derived';
import { mockCkBtcMinterInfo } from '$tests/mocks/ckbtc.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

vi.mock('$icp/services/worker.ck-minter-info.services', () => ({
	initCkBTCMinterInfoWorker: vi.fn(),
	initCkETHMinterInfoWorker: vi.fn()
}));

describe('CkMinterInfoLoader', () => {
	const mockWorkerResult = {
		start: vi.fn(),
		stop: vi.fn(),
		trigger: vi.fn(),
		destroy: vi.fn()
	};

	const mockCkBtcToken: IcCkToken = {
		...mockValidIcCkToken,
		id: BTC_MAINNET_TOKEN.id,
		symbol: 'ckBTC',
		name: 'ckBTC',
		network: ICP_NETWORK,
		ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
		minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID,
		twinToken: BTC_MAINNET_TOKEN
	};

	const mockCkEthToken: IcCkToken = {
		...mockValidIcCkToken,
		id: ETHEREUM_TOKEN.id,
		symbol: 'ckETH',
		name: 'ckETH',
		network: ICP_NETWORK,
		ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
		minterCanisterId: IC_CKETH_MINTER_CANISTER_ID,
		twinToken: ETHEREUM_TOKEN
	};

	const mockEnabledIcTokens = (tokens: IcCkToken[]) =>
		vi.spyOn(tokensStore, 'enabledIcTokens', 'get').mockImplementation(() => readable(tokens));

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(initCkBTCMinterInfoWorker).mockResolvedValue(mockWorkerResult);
		vi.mocked(initCkETHMinterInfoWorker).mockResolvedValue(mockWorkerResult);

		ckBtcMinterInfoStore.reinitialize();
	});

	it('should not call any worker when no CK tokens are available', async () => {
		mockEnabledIcTokens([]);

		render(CkMinterInfoLoader);

		await waitFor(() => {
			expect(initCkBTCMinterInfoWorker).not.toHaveBeenCalled();
			expect(initCkETHMinterInfoWorker).not.toHaveBeenCalled();
		});
	});

	it('should call initCkBTCMinterInfoWorker when ckBTC token is found', async () => {
		mockEnabledIcTokens([mockCkBtcToken]);

		render(CkMinterInfoLoader);

		await waitFor(() => {
			expect(initCkBTCMinterInfoWorker).toHaveBeenCalledExactlyOnceWith({
				token: mockCkBtcToken,
				twinToken: BTC_MAINNET_TOKEN,
				minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID
			});
		});
	});

	it('should not call initCkBTCMinterInfoWorker when minter info is already certified', async () => {
		ckBtcMinterInfoStore.set({
			id: mockCkBtcToken.id,
			data: { data: mockCkBtcMinterInfo, certified: true }
		});

		mockEnabledIcTokens([mockCkBtcToken]);

		render(CkMinterInfoLoader);

		await waitFor(() => {
			expect(initCkBTCMinterInfoWorker).not.toHaveBeenCalled();
		});
	});

	it('should call initCkBTCMinterInfoWorker when minter info is not yet certified', async () => {
		ckBtcMinterInfoStore.set({
			id: mockCkBtcToken.id,
			data: { data: mockCkBtcMinterInfo, certified: false }
		});

		mockEnabledIcTokens([mockCkBtcToken]);

		render(CkMinterInfoLoader);

		await waitFor(() => {
			expect(initCkBTCMinterInfoWorker).toHaveBeenCalledOnce();
		});
	});

	it('should call initCkETHMinterInfoWorker when ckETH token is found', async () => {
		mockEnabledIcTokens([mockCkEthToken]);

		render(CkMinterInfoLoader);

		await waitFor(() => {
			expect(initCkETHMinterInfoWorker).toHaveBeenCalledExactlyOnceWith({
				token: ETHEREUM_TOKEN,
				minterCanisterId: IC_CKETH_MINTER_CANISTER_ID
			});
		});
	});

	it('should call both workers when both ckBTC and ckETH tokens are available', async () => {
		mockEnabledIcTokens([mockCkBtcToken, mockCkEthToken]);

		render(CkMinterInfoLoader);

		await waitFor(() => {
			expect(initCkBTCMinterInfoWorker).toHaveBeenCalledOnce();
			expect(initCkETHMinterInfoWorker).toHaveBeenCalledOnce();
		});
	});

	it('should not call initCkETHMinterInfoWorker when no ckETH token is available', async () => {
		mockEnabledIcTokens([mockCkBtcToken]);

		render(CkMinterInfoLoader);

		await waitFor(() => {
			expect(initCkBTCMinterInfoWorker).toHaveBeenCalledOnce();
			expect(initCkETHMinterInfoWorker).not.toHaveBeenCalled();
		});
	});
});
