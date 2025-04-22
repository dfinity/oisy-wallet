import { ICP_NETWORK_SYMBOL } from '$env/networks/networks.icp.env';
import {
	CKERC20_LEDGER_CANISTER_IDS,
	IC_CKBTC_LEDGER_CANISTER_ID,
	IC_CKETH_LEDGER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import Info from '$icp/components/info/Info.svelte';
import { enabledIcrcTokens } from '$icp/derived/icrc.derived';
import type { IcCkToken } from '$icp/types/ic-token';
import { token } from '$lib/stores/token.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render, waitFor } from '@testing-library/svelte';

// We need to mock these nested dependencies too because otherwise there is an error raise in the importing of `WebSocket` from `ws` inside the `ethers/provider` package
vi.mock('ethers/providers', () => {
	const provider = vi.fn();
	return { EtherscanProvider: provider, InfuraProvider: provider, JsonRpcProvider: provider };
});

describe('Info', () => {
	const mockCkBtcToken = {
		...mockValidIcCkToken,
		name: 'ckBTC',
		symbol: BTC_MAINNET_TOKEN.twinTokenSymbol,
		ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
		twinToken: BTC_MAINNET_TOKEN
	} as IcCkToken;
	const mockCkEthToken = {
		...mockValidIcCkToken,
		name: 'ckETH',
		symbol: ETHEREUM_TOKEN.twinTokenSymbol,
		ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
		twinToken: ETHEREUM_TOKEN
	} as IcCkToken;
	const mockCkUsdcToken = {
		...mockValidIcCkToken,
		name: 'ckUSDC',
		symbol: 'ckUSDC',
		ledgerCanisterId: CKERC20_LEDGER_CANISTER_IDS[0],
		twinToken: USDC_TOKEN
	} as IcCkToken;

	const mockEnabledToken = (token?: IcCkToken) =>
		vi.spyOn(enabledIcrcTokens, 'subscribe').mockImplementation((fn) => {
			fn(token ? [token] : []);
			return () => {};
		});

	beforeEach(() => {
		mockPage.reset();
	});

	it('should not render any info components if sourceToken is not a mainnet token', async () => {
		mockEnabledToken(mockValidIcCkToken);
		const { getByText } = render(Info);

		mockPage.mock({
			token: mockValidIcCkToken.name,
			network: ICP_NETWORK_SYMBOL
		});
		token.set(mockValidIcCkToken);

		await waitFor(() => {
			expect(() => getByText(en.info.ethereum.title)).toThrow();
			expect(() => getByText(en.info.bitcoin.title)).toThrow();
		});
	});

	describe('ckBTC', () => {
		it('should render bitcoin info if all conditions are met', async () => {
			mockEnabledToken(mockCkBtcToken);
			const { getByText } = render(Info);

			mockPage.mock({
				token: mockCkBtcToken.name,
				network: ICP_NETWORK_SYMBOL
			});
			token.set(mockCkBtcToken);

			await waitFor(() => {
				expect(getByText(en.info.bitcoin.title)).toBeInTheDocument();
			});
		});

		it('should not render bitcoin info if network is not enabled', async () => {
			mockEnabledToken();
			const { getByText } = render(Info);

			mockPage.mock({
				token: mockCkBtcToken.name,
				network: ICP_NETWORK_SYMBOL
			});
			token.set(mockCkBtcToken);

			await waitFor(() => {
				expect(() => getByText(en.info.bitcoin.title)).toThrow();
			});
		});

		it('should not render bitcoin info if page token is not set', async () => {
			mockEnabledToken(mockCkBtcToken);
			const { getByText } = render(Info);

			await waitFor(() => {
				expect(() => getByText(en.info.bitcoin.title)).toThrow();
			});
		});
	});

	describe('ckETH', () => {
		it('should render ethereum info if all conditions are met', async () => {
			mockEnabledToken(mockCkEthToken);
			const { getByText } = render(Info);

			mockPage.mock({
				token: mockCkEthToken.name,
				network: ICP_NETWORK_SYMBOL
			});
			token.set(mockCkEthToken);

			await waitFor(() => {
				expect(
					getByText(
						replacePlaceholders(en.info.ethereum.title, { $ckToken: mockCkEthToken.symbol })
					)
				).toBeInTheDocument();
			});
		});

		it('should not render ethereum info if network is not enabled', async () => {
			mockEnabledToken();
			const { getByText } = render(Info);

			mockPage.mock({
				token: mockCkEthToken.name,
				network: ICP_NETWORK_SYMBOL
			});
			token.set(mockCkEthToken);

			await waitFor(() => {
				expect(() => getByText(en.info.ethereum.title)).toThrow();
			});
		});

		it('should not render ethereum info if page token is not set', async () => {
			mockEnabledToken(mockCkBtcToken);
			const { getByText } = render(Info);

			await waitFor(() => {
				expect(() => getByText(en.info.ethereum.title)).toThrow();
			});
		});
	});

	describe('ckERC20', () => {
		it('should render ethereum info if all conditions are met', async () => {
			mockEnabledToken(mockCkUsdcToken);
			const { getByText } = render(Info);

			mockPage.mock({
				token: mockCkUsdcToken.name,
				network: ICP_NETWORK_SYMBOL
			});
			token.set(mockCkUsdcToken);

			await waitFor(() => {
				expect(
					getByText(
						replacePlaceholders(en.info.ethereum.title, { $ckToken: mockCkUsdcToken.symbol })
					)
				).toBeInTheDocument();
			});
		});

		it('should not render ethereum info if network is not enabled', async () => {
			mockEnabledToken();
			const { getByText } = render(Info);

			mockPage.mock({
				token: mockCkUsdcToken.name,
				network: ICP_NETWORK_SYMBOL
			});
			token.set(mockCkUsdcToken);

			await waitFor(() => {
				expect(() => getByText(en.info.ethereum.title)).toThrow();
			});
		});

		it('should not render ethereum info if page token is not set', async () => {
			mockEnabledToken(mockCkUsdcToken);
			const { getByText } = render(Info);

			await waitFor(() => {
				expect(() => getByText(en.info.ethereum.title)).toThrow();
			});
		});
	});
});
