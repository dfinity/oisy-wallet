import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { minterInfo } from '$icp-eth/api/cketh-minter.api';
import { loadCkEthMinterInfo } from '$icp-eth/services/cketh.services';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { mockCkMinterInfo } from '$tests/mocks/ck-minter.mock';
import type { CkEthMinterDid } from '@icp-sdk/canisters/cketh';
import { get } from 'svelte/store';

vi.mock('$icp-eth/api/cketh-minter.api', () => ({
	minterInfo: vi.fn()
}));

describe('cketh.services', () => {
	describe('loadCkEthMinterInfo', () => {
		const params = {
			tokenId: ETHEREUM_TOKEN_ID,
			canisters: { minterCanisterId: 'sv3dd-oaaaa-aaaar-qacoa-cai' }
		};

		const requestedCertified = (): boolean[] =>
			vi.mocked(minterInfo).mock.calls.map(([{ certified }]) => certified === true);

		const minterInfoInStore = () => get(ckEthMinterInfoStore)?.[ETHEREUM_TOKEN_ID];

		const setUncertified = () =>
			ckEthMinterInfoStore.set({
				id: ETHEREUM_TOKEN_ID,
				data: { data: mockCkMinterInfo, certified: false }
			});

		beforeEach(() => {
			vi.clearAllMocks();

			ckEthMinterInfoStore.reinitialize();

			vi.mocked(minterInfo).mockResolvedValue(mockCkMinterInfo);
		});

		it('should load the uncertified and the certified answer when none is in yet', async () => {
			await loadCkEthMinterInfo(params);

			expect(requestedCertified().sort()).toEqual([false, true]);
			expect(minterInfoInStore()).toEqual({ data: mockCkMinterInfo, certified: true });
		});

		// The minter information worker only queries while the app starts up, and requests checked
		// against the minter's addresses are held until a certified answer is in.
		it('should load only the certified answer when an uncertified one is in', async () => {
			setUncertified();

			await loadCkEthMinterInfo(params);

			expect(requestedCertified()).toEqual([true]);
			expect(minterInfoInStore()).toEqual({ data: mockCkMinterInfo, certified: true });
		});

		it('should not load again once the certified answer is in', async () => {
			ckEthMinterInfoStore.set({
				id: ETHEREUM_TOKEN_ID,
				data: { data: mockCkMinterInfo, certified: true }
			});

			await loadCkEthMinterInfo(params);

			expect(minterInfo).not.toHaveBeenCalled();
		});

		it('should not load again after a load failed', async () => {
			ckEthMinterInfoStore.reset(ETHEREUM_TOKEN_ID);

			await loadCkEthMinterInfo(params);

			expect(minterInfo).not.toHaveBeenCalled();
		});

		it('should start one load when asked again while one is running', async () => {
			setUncertified();

			let answer: (value: CkEthMinterDid.MinterInfo) => void = () => undefined;

			vi.mocked(minterInfo).mockReturnValue(new Promise((resolve) => (answer = resolve)));

			const first = loadCkEthMinterInfo(params);
			const second = loadCkEthMinterInfo(params);

			answer(mockCkMinterInfo);

			await Promise.all([first, second]);

			expect(minterInfo).toHaveBeenCalledOnce();
			expect(minterInfoInStore()?.certified).toBeTruthy();

			// Once the load is done, a further request is answered from the store.
			await loadCkEthMinterInfo(params);

			expect(minterInfo).toHaveBeenCalledOnce();
		});

		it('should reset the minter information when the certified answer fails', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => undefined);

			setUncertified();

			vi.mocked(minterInfo).mockRejectedValue(new Error('The minter did not answer.'));

			await loadCkEthMinterInfo(params);

			expect(minterInfoInStore()).toBeNull();
		});
	});
});
