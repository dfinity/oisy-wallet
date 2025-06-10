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
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import type { IcCkToken } from '$icp/types/ic-token';
import { token } from '$lib/stores/token.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { render } from '@testing-library/svelte';

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

	const mockEnabledToken = (token: IcCkToken) => {
		icrcDefaultTokensStore.set({ data: token, certified: false });
		icrcCustomTokensStore.set({ data: { ...token, enabled: true }, certified: false });
	};

	beforeEach(() => {
		vi.clearAllMocks();

		setupUserNetworksStore('allEnabled');
		setupTestnetsStore('enabled');

		mockPage.reset();
		token.reset();

		icrcDefaultTokensStore.resetAll();
		icrcCustomTokensStore.resetAll();
	});

	it('should not render any info components if sourceToken is not a mainnet token', () => {
		mockEnabledToken(mockValidIcCkToken);

		mockPage.mock({
			token: mockValidIcCkToken.name,
			network: ICP_NETWORK_SYMBOL
		});
		token.set(mockValidIcCkToken);

		const { getByText } = render(Info);

		expect(() => getByText(en.info.ethereum.title)).toThrow();
		expect(() => getByText(en.info.bitcoin.title)).toThrow();
	});

	describe('ckBTC', () => {
		it('should render bitcoin info if all conditions are met', () => {
			mockEnabledToken(mockCkBtcToken);

			mockPage.mock({
				token: mockCkBtcToken.name,
				network: ICP_NETWORK_SYMBOL
			});
			token.set(mockCkBtcToken);

			const { getByText } = render(Info);

			expect(getByText(en.info.bitcoin.title)).toBeInTheDocument();
		});

		it('should not render bitcoin info if network is not enabled', () => {
			mockEnabledToken(mockCkBtcToken);
			setupUserNetworksStore('allDisabled');

			mockPage.mock({
				token: mockCkBtcToken.name,
				network: ICP_NETWORK_SYMBOL
			});
			token.set(mockCkBtcToken);

			const { getByText } = render(Info);

			expect(() => getByText(en.info.bitcoin.title)).toThrow();
		});

		it('should not render bitcoin info if page token is not set', () => {
			mockEnabledToken(mockCkBtcToken);

			const { getByText } = render(Info);

			expect(() => getByText(en.info.bitcoin.title)).toThrow();
		});
	});

	describe('ckETH', () => {
		it('should render ethereum info if all conditions are met', () => {
			mockEnabledToken(mockCkEthToken);

			mockPage.mock({
				token: mockCkEthToken.name,
				network: ICP_NETWORK_SYMBOL
			});
			token.set(mockCkEthToken);

			const { getByText } = render(Info);

			expect(
				getByText(replacePlaceholders(en.info.ethereum.title, { $ckToken: mockCkEthToken.symbol }))
			).toBeInTheDocument();
		});

		it('should not render ethereum info if network is not enabled', () => {
			mockEnabledToken(mockCkEthToken);
			setupUserNetworksStore('allDisabled');

			mockPage.mock({
				token: mockCkEthToken.name,
				network: ICP_NETWORK_SYMBOL
			});
			token.set(mockCkEthToken);

			const { getByText } = render(Info);

			expect(() => getByText(en.info.ethereum.title)).toThrow();
		});

		it('should not render ethereum info if page token is not set', () => {
			mockEnabledToken(mockCkEthToken);

			const { getByText } = render(Info);

			expect(() => getByText(en.info.ethereum.title)).toThrow();
		});
	});

	describe('ckERC20', () => {
		it('should render ethereum info if all conditions are met', () => {
			mockEnabledToken(mockCkUsdcToken);

			mockPage.mock({
				token: mockCkUsdcToken.name,
				network: ICP_NETWORK_SYMBOL
			});
			token.set(mockCkUsdcToken);

			const { getByText } = render(Info);

			expect(
				getByText(replacePlaceholders(en.info.ethereum.title, { $ckToken: mockCkUsdcToken.symbol }))
			).toBeInTheDocument();
		});

		it('should not render ethereum info if network is not enabled', () => {
			mockEnabledToken(mockCkUsdcToken);
			setupUserNetworksStore('allDisabled');

			mockPage.mock({
				token: mockCkUsdcToken.name,
				network: ICP_NETWORK_SYMBOL
			});
			token.set(mockCkUsdcToken);

			const { getByText } = render(Info);

			expect(() => getByText(en.info.ethereum.title)).toThrow();
		});

		it('should not render ethereum info if page token is not set', () => {
			mockEnabledToken(mockCkUsdcToken);

			const { getByText } = render(Info);

			expect(() => getByText(en.info.ethereum.title)).toThrow();
		});
	});
});
