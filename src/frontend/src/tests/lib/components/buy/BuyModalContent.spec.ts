import { ICP_NETWORK_ID, ICP_PSEUDO_TESTNET_NETWORK_ID } from '$env/networks/networks.icp.env';
import * as onramperEnv from '$env/rest/onramper.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import type { Erc20Token } from '$eth/types/erc20';
import * as backendApi from '$lib/api/backend.api';
import { OnramperSecretNotConfiguredError } from '$lib/canisters/errors';
import BuyModalContent from '$lib/components/buy/BuyModalContent.svelte';
import { BUY_MODAL_ONRAMPER_IFRAME } from '$lib/constants/test-ids.constants';
import {
	PLAUSIBLE_EVENT_ONRAMPER_ERROR_TYPES,
	PLAUSIBLE_EVENT_RESULT_STATUSES
} from '$lib/enums/plausible';
import * as onramperRest from '$lib/rest/onramper.rest';
import * as analyticsServices from '$lib/services/analytics.services';
import { resetOnramperIds } from '$lib/services/onramper.services';
import { token } from '$lib/stores/token.store';
import type { OnramperSupportedCrypto, OnramperTransactionType } from '$lib/types/onramper';
import { parseTokenId } from '$lib/validation/token.validation';
import type { SplToken } from '$sol/types/spl';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';

describe('BuyModalContent', () => {
	const mockSignature = 'a'.repeat(64);

	beforeEach(() => {
		mockAuthStore();
		vi.spyOn(backendApi, 'signOnramperWidgetUrl').mockResolvedValue({
			signature: mockSignature,
			signed_query: ''
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders the Onramper iframe when ONRAMPER_ENABLED is true', async () => {
		vi.spyOn(onramperEnv, 'ONRAMPER_ENABLED', 'get').mockImplementation(() => true);

		const { findByTestId } = render(BuyModalContent);

		// The iframe is rendered only after the async signing call resolves.
		await expect(findByTestId(BUY_MODAL_ONRAMPER_IFRAME)).resolves.toBeInTheDocument();
	});

	it('uses the centered overlay loader while the Onramper URL is pending', () => {
		vi.spyOn(onramperEnv, 'ONRAMPER_ENABLED', 'get').mockImplementation(() => true);
		vi.spyOn(backendApi, 'signOnramperWidgetUrl').mockReturnValue(new Promise(() => {}));

		const { getByTestId, queryByTestId } = render(BuyModalContent);

		expect(getByTestId('spinner').closest('.overlay')).toBeInTheDocument();
		expect(queryByTestId(BUY_MODAL_ONRAMPER_IFRAME)).not.toBeInTheDocument();
	});

	it('renders the disabled unavailable notice when ONRAMPER_ENABLED is false', () => {
		vi.spyOn(onramperEnv, 'ONRAMPER_ENABLED', 'get').mockImplementation(() => false);

		const { getByText, queryByText, queryByTestId } = render(BuyModalContent);

		expect(getByText(en.buy.text.unavailable_title)).toBeInTheDocument();
		expect(getByText(en.buy.text.unavailable_description_disabled)).toBeInTheDocument();
		expect(queryByText(en.buy.text.unavailable_description_signing_failed)).not.toBeInTheDocument();
		expect(queryByTestId(BUY_MODAL_ONRAMPER_IFRAME)).not.toBeInTheDocument();
	});

	it('renders the signing-failed unavailable notice when signing fails', async () => {
		vi.spyOn(onramperEnv, 'ONRAMPER_ENABLED', 'get').mockImplementation(() => true);
		vi.spyOn(backendApi, 'signOnramperWidgetUrl').mockRejectedValue(
			new OnramperSecretNotConfiguredError(
				'OnRamper signing secret is not configured on the backend canister.'
			)
		);

		const { findByText, queryByText, queryByTestId } = render(BuyModalContent);

		await expect(findByText(en.buy.text.unavailable_title)).resolves.toBeInTheDocument();
		await expect(
			findByText(en.buy.text.unavailable_description_signing_failed)
		).resolves.toBeInTheDocument();

		expect(queryByText(en.buy.text.unavailable_description_disabled)).not.toBeInTheDocument();

		await waitFor(() => expect(queryByTestId(BUY_MODAL_ONRAMPER_IFRAME)).not.toBeInTheDocument());
	});

	it('tracks onramper_open success once the signed URL resolves', async () => {
		vi.spyOn(onramperEnv, 'ONRAMPER_ENABLED', 'get').mockImplementation(() => true);
		const trackSpy = vi.spyOn(analyticsServices, 'trackOnramperOpen');

		const { findByTestId } = render(BuyModalContent);

		await expect(findByTestId(BUY_MODAL_ONRAMPER_IFRAME)).resolves.toBeInTheDocument();

		expect(trackSpy).toHaveBeenCalledWith(
			expect.objectContaining({ status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS })
		);
	});

	it('tracks onramper_open error with type and severity when signing fails', async () => {
		vi.spyOn(onramperEnv, 'ONRAMPER_ENABLED', 'get').mockImplementation(() => true);
		const trackSpy = vi.spyOn(analyticsServices, 'trackOnramperOpen');
		vi.spyOn(backendApi, 'signOnramperWidgetUrl').mockRejectedValue(
			new OnramperSecretNotConfiguredError('boom')
		);

		const { findByText } = render(BuyModalContent);

		await expect(findByText(en.buy.text.unavailable_title)).resolves.toBeInTheDocument();

		await waitFor(() =>
			expect(trackSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
					errorType: PLAUSIBLE_EVENT_ONRAMPER_ERROR_TYPES.SECRET_NOT_CONFIGURED,
					errorMessage: 'boom'
				})
			)
		);
	});

	describe('widget URL', () => {
		beforeEach(() => {
			vi.spyOn(onramperEnv, 'ONRAMPER_ENABLED', 'get').mockImplementation(() => true);
		});

		afterEach(() => {
			token.reset();
			mockPage.reset();
		});

		const widgetParams = async (findByTestId: (id: string) => Promise<HTMLElement>) => {
			const iframe = await findByTestId(BUY_MODAL_ONRAMPER_IFRAME);

			return new URL(iframe.getAttribute('src') ?? '').searchParams;
		};

		it('offers the tokens of every network when no network is selected', async () => {
			const { findByTestId } = render(BuyModalContent);
			const params = await widgetParams(findByTestId);

			const onlyCryptos = params.get('onlyCryptos')?.split(',');

			expect(onlyCryptos).toContain(ETHEREUM_TOKEN.buy?.onramperId);
			expect(onlyCryptos).toContain(ICP_TOKEN.buy?.onramperId);
		});

		it('offers only the tokens of the selected network on both tabs', async () => {
			mockPage.mockNetwork(ICP_NETWORK_ID.description);

			const { findByTestId } = render(BuyModalContent);
			const params = await widgetParams(findByTestId);

			expect(params.get('onlyCryptos')).toBe(ICP_TOKEN.buy?.onramperId);
			expect(params.get('sell_onlyCryptos')).toBe(ICP_TOKEN.buy?.onramperId);
		});

		it('offers the tokens of every network when the selected one has none that OnRamper sells', async () => {
			mockPage.mockNetwork(ICP_PSEUDO_TESTNET_NETWORK_ID.description);

			const { findByTestId } = render(BuyModalContent);
			const params = await widgetParams(findByTestId);

			const onlyCryptos = params.get('onlyCryptos')?.split(',');

			expect(onlyCryptos).toContain(ETHEREUM_TOKEN.buy?.onramperId);
			expect(onlyCryptos).toContain(ICP_TOKEN.buy?.onramperId);
		});

		it('sends no default token when none is open', async () => {
			token.reset();

			const { findByTestId } = render(BuyModalContent);
			const params = await widgetParams(findByTestId);

			expect(params.has('defaultCrypto')).toBeFalsy();
			expect(params.has('sell_defaultCrypto')).toBeFalsy();
		});

		it('sends the open token as the default of both tabs', async () => {
			token.set(ICP_TOKEN);

			const { findByTestId } = render(BuyModalContent);
			const params = await widgetParams(findByTestId);

			expect(params.get('defaultCrypto')).toBe(ICP_TOKEN.buy?.onramperId);
			expect(params.get('sell_defaultCrypto')).toBe(ICP_TOKEN.buy?.onramperId);
		});

		it('sends no default fiat', async () => {
			const { findByTestId } = render(BuyModalContent);
			const params = await widgetParams(findByTestId);

			expect(params.has('defaultFiat')).toBeFalsy();
			expect(params.has('sell_defaultFiat')).toBeFalsy();
		});

		it('turns OnRamper country selector off', async () => {
			const { findByTestId } = render(BuyModalContent);
			const params = await widgetParams(findByTestId);

			expect(params.get('enableCountrySelector')).toBe('false');
		});

		it('preselects credit card as the payment method', async () => {
			const { findByTestId } = render(BuyModalContent);
			const params = await widgetParams(findByTestId);

			expect(params.get('defaultPaymentMethod')).toBe('creditcard');
		});

		describe('tokens without a built-in OnRamper id', () => {
			const aaveAddress = '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9';
			const pyusdMint = '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo';

			// Imported: no built-in OnRamper id.
			const aaveToken: Erc20Token = {
				...mockValidErc20Token,
				id: parseTokenId('AaveTokenId'),
				symbol: 'AAVE',
				address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'
			};
			const pyusdToken: SplToken = { ...mockValidSplToken, address: pyusdMint };

			const lists: Record<OnramperTransactionType, OnramperSupportedCrypto[]> = {
				buy: [
					{ id: 'aave_ethereum', network: 'ethereum', address: aaveAddress },
					{ id: 'pyusd_solana', network: 'solana', address: pyusdMint }
				],
				sell: [{ id: 'aave_ethereum', network: 'ethereum', address: aaveAddress }]
			};

			const mockLists = () =>
				vi
					.spyOn(onramperRest, 'fetchOnramperSupportedCryptos')
					.mockImplementation(({ type }) => Promise.resolve(lists[type]));

			beforeEach(() => {
				vi.spyOn(console, 'warn').mockImplementation(() => {});
			});

			afterEach(() => {
				resetOnramperIds();
				erc20CustomTokensStore.resetAll();
			});

			it('offers an enabled imported token that OnRamper lists in Buy and in Sell', async () => {
				mockLists();

				erc20CustomTokensStore.setAll([
					{ data: { ...aaveToken, enabled: true }, certified: false }
				]);

				const { findByTestId } = render(BuyModalContent);
				const params = await widgetParams(findByTestId);

				expect(params.get('onlyCryptos')?.split(',')).toContain('aave_ethereum');
				expect(params.get('sell_onlyCryptos')?.split(',')).toContain('aave_ethereum');
				expect(params.get('onlyCryptos')?.split(',')).toContain(ETHEREUM_TOKEN.buy?.onramperId);
			});

			it('opens on the open imported token in both tabs', async () => {
				mockLists();

				token.set(aaveToken);

				const { findByTestId } = render(BuyModalContent);
				const params = await widgetParams(findByTestId);

				expect(params.get('defaultCrypto')).toBe('aave_ethereum');
				expect(params.get('sell_defaultCrypto')).toBe('aave_ethereum');

				// The ids arrive in the same run: no second signing call.
				expect(backendApi.signOnramperWidgetUrl).toHaveBeenCalledOnce();
			});

			it('does not sign the URL again when the token store re-emits the same token', async () => {
				mockLists();

				token.set(aaveToken);

				const { findByTestId } = render(BuyModalContent);
				await widgetParams(findByTestId);

				token.set(aaveToken);
				token.set({ ...aaveToken });

				await tick();

				expect(backendApi.signOnramperWidgetUrl).toHaveBeenCalledOnce();
			});

			it('keeps a token that OnRamper only buys out of Sell', async () => {
				mockLists();

				token.set(pyusdToken);

				const { findByTestId } = render(BuyModalContent);
				const params = await widgetParams(findByTestId);

				expect(params.get('defaultCrypto')).toBe('pyusd_solana');
				expect(params.has('sell_defaultCrypto')).toBeFalsy();
				expect(params.get('sell_onlyCryptos')?.split(',')).not.toContain('pyusd_solana');
			});

			it('opens with the built-in ids only when the lists fail', async () => {
				vi.spyOn(onramperRest, 'fetchOnramperSupportedCryptos').mockRejectedValue(
					new Error('Forbidden')
				);

				token.set(aaveToken);

				const { findByTestId } = render(BuyModalContent);
				const params = await widgetParams(findByTestId);

				expect(params.has('defaultCrypto')).toBeFalsy();
				expect(params.get('onlyCryptos')?.split(',')).toContain(ETHEREUM_TOKEN.buy?.onramperId);
			});

			it("prefers OnRamper's id over a built-in one", async () => {
				mockLists();

				token.set({ ...aaveToken, buy: { onramperId: 'stale_id' } });

				const { findByTestId } = render(BuyModalContent);
				const params = await widgetParams(findByTestId);

				expect(params.get('defaultCrypto')).toBe('aave_ethereum');
				expect(params.get('sell_defaultCrypto')).toBe('aave_ethereum');
			});

			it('falls back to the built-in id when the lists fail', async () => {
				vi.spyOn(onramperRest, 'fetchOnramperSupportedCryptos').mockRejectedValue(
					new Error('Forbidden')
				);

				token.set({ ...aaveToken, buy: { onramperId: 'built_in_id' } });

				const { findByTestId } = render(BuyModalContent);
				const params = await widgetParams(findByTestId);

				expect(params.get('defaultCrypto')).toBe('built_in_id');
				expect(params.get('sell_defaultCrypto')).toBe('built_in_id');
			});

			it('makes no request to OnRamper without an ERC-20 or SPL token', async () => {
				const spy = mockLists();

				token.set(ICP_TOKEN);

				const { findByTestId } = render(BuyModalContent);
				await widgetParams(findByTestId);

				expect(spy).not.toHaveBeenCalled();
			});
		});
	});
});
