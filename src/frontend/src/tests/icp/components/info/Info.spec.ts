import {
	CKERC20_LEDGER_CANISTER_IDS,
	IC_CKETH_LEDGER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icp/tokens.icp.ck.btc.env';
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
		icrcCustomTokensStore.setAll([{ data: { ...token, enabled: true }, certified: false }]);
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

		mockPage.mockToken(mockValidIcCkToken);
		token.set(mockValidIcCkToken);

		const { getByText } = render(Info);

		expect(() => getByText(en.info.ethereum.title)).toThrowError();
		expect(() => getByText(en.info.bitcoin.title)).toThrowError();
	});

	describe('ckBTC', () => {
		it('should render bitcoin info if all conditions are met', () => {
			mockEnabledToken(mockCkBtcToken);

			mockPage.mockToken(mockCkBtcToken);
			token.set(mockCkBtcToken);

			const { getByText } = render(Info);

			expect(getByText(en.info.bitcoin.title)).toBeInTheDocument();
		});

		it('should not render bitcoin info if network is not enabled', () => {
			mockEnabledToken(mockCkBtcToken);
			setupUserNetworksStore('allDisabled');

			mockPage.mockToken(mockCkBtcToken);
			token.set(mockCkBtcToken);

			const { getByText } = render(Info);

			expect(() => getByText(en.info.bitcoin.title)).toThrowError();
		});

		it('should not render bitcoin info if page token is not set', () => {
			mockEnabledToken(mockCkBtcToken);

			const { getByText } = render(Info);

			expect(() => getByText(en.info.bitcoin.title)).toThrowError();
		});
	});

	describe('ckETH', () => {
		it('should render ethereum info if all conditions are met', () => {
			mockEnabledToken(mockCkEthToken);

			mockPage.mockToken(mockCkEthToken);
			token.set(mockCkEthToken);

			const { getByText } = render(Info);

			expect(
				getByText(replacePlaceholders(en.info.ethereum.title, { $ckToken: mockCkEthToken.symbol }))
			).toBeInTheDocument();
		});

		it('should not render ethereum info if network is not enabled', () => {
			mockEnabledToken(mockCkEthToken);
			setupUserNetworksStore('allDisabled');

			mockPage.mockToken(mockCkEthToken);
			token.set(mockCkEthToken);

			const { getByText } = render(Info);

			expect(() => getByText(en.info.ethereum.title)).toThrowError();
		});

		it('should not render ethereum info if page token is not set', () => {
			mockEnabledToken(mockCkEthToken);

			const { getByText } = render(Info);

			expect(() => getByText(en.info.ethereum.title)).toThrowError();
		});
	});

	describe('ckERC20', () => {
		it('should render ethereum info if all conditions are met', () => {
			mockEnabledToken(mockCkUsdcToken);

			mockPage.mockToken(mockCkUsdcToken);
			token.set(mockCkUsdcToken);

			const { getByText } = render(Info);

			expect(
				getByText(replacePlaceholders(en.info.ethereum.title, { $ckToken: mockCkUsdcToken.symbol }))
			).toBeInTheDocument();
		});

		it('should not render ethereum info if network is not enabled', () => {
			mockEnabledToken(mockCkUsdcToken);
			setupUserNetworksStore('allDisabled');

			mockPage.mockToken(mockCkUsdcToken);
			token.set(mockCkUsdcToken);

			const { getByText } = render(Info);

			expect(() => getByText(en.info.ethereum.title)).toThrowError();
		});

		it('should not render ethereum info if page token is not set', () => {
			mockEnabledToken(mockCkUsdcToken);

			const { getByText } = render(Info);

			expect(() => getByText(en.info.ethereum.title)).toThrowError();
		});
	});
});
