import {
	LOCAL_CKBTC_LEDGER_CANISTER_ID,
	LOCAL_CKETH_LEDGER_CANISTER_ID,
	LOCAL_CKUSDC_LEDGER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import type { IcCkToken } from '$icp/types/ic-token';
import * as exchanges from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { initConvertContext } from '$lib/stores/convert.store';
import { parseTokenId } from '$lib/validation/token.validation';
import { bn1Bi, bn2Bi } from '$tests/mocks/balances.mock';
import { mockCkBtcMinterInfo as mockCkBtcMinterInfoData } from '$tests/mocks/ckbtc.mock';
import { createMockErc20Tokens } from '$tests/mocks/erc20-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import { testDerivedUpdates } from '$tests/utils/derived.test-utils';
import type { MinterInfo as CkEthMinterInfo } from '@dfinity/cketh';
import { get, readable } from 'svelte/store';

const ethExchangeValue = 1;
const icpExchangeValue = 2;

describe('convertStore', () => {
	beforeEach(() => {
		mockPage.reset();

		vi.spyOn(exchanges, 'exchanges', 'get').mockImplementation(() =>
			readable({
				[ETHEREUM_TOKEN.id]: { usd: ethExchangeValue },
				[ICP_TOKEN.id]: { usd: icpExchangeValue }
			})
		);
	});

	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() =>
			initConvertContext({
				destinationToken: ETHEREUM_TOKEN,
				sourceToken: ICP_TOKEN
			})
		);
	});

	it('should have all expected values', () => {
		const {
			sourceToken,
			sourceTokenBalance,
			sourceTokenExchangeRate,
			destinationTokenExchangeRate,
			destinationTokenBalance,
			destinationToken,
			balanceForFee,
			minterInfo
		} = initConvertContext({
			destinationToken: ETHEREUM_TOKEN,
			sourceToken: ICP_TOKEN
		});
		const ethBalance = bn1Bi;
		const icpBalance = bn2Bi;

		balancesStore.set({
			id: ETHEREUM_TOKEN.id,
			data: { data: ethBalance, certified: true }
		});
		balancesStore.set({
			id: ICP_TOKEN.id,
			data: { data: icpBalance, certified: true }
		});

		expect(get(sourceToken)).toBe(ICP_TOKEN);
		expect(get(destinationToken)).toBe(ETHEREUM_TOKEN);

		expect(get(sourceTokenBalance)).toStrictEqual(icpBalance);
		expect(get(destinationTokenBalance)).toStrictEqual(ethBalance);

		expect(get(sourceTokenExchangeRate)).toStrictEqual(icpExchangeValue);
		expect(get(destinationTokenExchangeRate)).toStrictEqual(ethExchangeValue);

		expect(get(balanceForFee)).toStrictEqual(undefined);
		expect(get(minterInfo)).toStrictEqual(undefined);
	});

	it('should have balance for fee set if sourceToken is ERC20', () => {
		const ethBalance = bn1Bi;
		balancesStore.set({
			id: SEPOLIA_TOKEN_ID,
			data: { data: ethBalance, certified: true }
		});

		const { balanceForFee } = initConvertContext({
			destinationToken: ETHEREUM_TOKEN,
			sourceToken: createMockErc20Tokens({ n: 1, networkEnv: 'testnet' })[0]
		});

		expect(get(balanceForFee)).toStrictEqual(ethBalance);
	});

	it('should have balance for fee set if sourceToken is ckERC20', () => {
		const ckEthBalance = bn1Bi;
		balancesStore.set({
			id: parseTokenId('ckETH'),
			data: { data: ckEthBalance, certified: true }
		});

		const { balanceForFee } = initConvertContext({
			destinationToken: ETHEREUM_TOKEN,
			sourceToken: {
				...mockValidToken,
				ledgerCanisterId: LOCAL_CKUSDC_LEDGER_CANISTER_ID
			} as IcCkToken
		});

		expect(get(balanceForFee)).toStrictEqual(ckEthBalance);
	});

	it('should have minter info fee set if sourceToken is ckETH', () => {
		const mockCkEthMinterInfo = {
			data: { minimum_withdrawal_amount: [500n] } as CkEthMinterInfo,
			certified: true
		};
		ckEthMinterInfoStore.set({
			id: ETHEREUM_TOKEN_ID,
			data: mockCkEthMinterInfo
		});

		const { minterInfo } = initConvertContext({
			destinationToken: ETHEREUM_TOKEN,
			sourceToken: {
				...mockValidToken,
				ledgerCanisterId: LOCAL_CKETH_LEDGER_CANISTER_ID
			} as IcCkToken
		});

		expect(get(minterInfo)).toStrictEqual(mockCkEthMinterInfo);
	});

	it('should have minter info fee set if sourceToken is ckBTC', () => {
		const mockCkBtcMinterInfo = { data: mockCkBtcMinterInfoData, certified: true };
		ckBtcMinterInfoStore.set({
			id: mockValidToken.id,
			data: mockCkBtcMinterInfo
		});

		const { minterInfo } = initConvertContext({
			destinationToken: ETHEREUM_TOKEN,
			sourceToken: {
				...mockValidToken,
				ledgerCanisterId: LOCAL_CKBTC_LEDGER_CANISTER_ID
			} as IcCkToken
		});

		expect(get(minterInfo)).toStrictEqual(mockCkBtcMinterInfo);
	});
});
