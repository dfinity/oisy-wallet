import { ONRAMPER_API_KEY, ONRAMPER_BASE_URL } from '$env/rest/onramper.env';
import * as backendApi from '$lib/api/backend.api';
import { Currency } from '$lib/enums/currency';
import { buildOnramperLink, type BuildOnramperLinkParams } from '$lib/utils/onramper.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockAccountIdentifierText, mockIdentity } from '$tests/mocks/identity.mock';

describe('onramper.utils', () => {
	describe('buildOnramperLink', () => {
		const mockSignature = 'a'.repeat(64);

		// The backend is the single authority for the signed params: it derives the caller's own
		// wallet addresses from their principal and returns both the signature and the exact
		// canonical query fragment (`signed_query`) it HMAC'd. buildOnramperLink takes no wallet
		// arguments — it appends `signed_query` verbatim, so these specs assert that fragment flows
		// through unchanged and that the endpoint is called with the identity only.
		const mockSignOnramperWidgetUrl = (signedQuery: string) =>
			vi
				.spyOn(backendApi, 'signOnramperWidgetUrl')
				.mockResolvedValue({ signature: mockSignature, signed_query: signedQuery });

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('should build the correct URL with all parameters and the backend signed query', async () => {
			const signedQuery = `networkWallets=bitcoin:${mockBtcAddress},icp:${mockAccountIdentifierText}`;
			mockSignOnramperWidgetUrl(signedQuery);

			const params: BuildOnramperLinkParams = {
				identity: mockIdentity,
				mode: 'buy',
				defaultFiat: Currency.USD,
				defaultCrypto: 'icp',
				onlyCryptos: ['btc', 'eth', 'icp'],
				onlyCryptoNetworks: ['bitcoin', 'ethereum'],
				supportRecurringPayments: true,
				enableCountrySelector: false,
				themeName: 'dark'
			};

			const expectedUrl =
				`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
				`&mode=buy&defaultFiat=usd&defaultCrypto=icp` +
				`&onlyCryptos=btc,eth,icp&onlyCryptoNetworks=bitcoin,ethereum` +
				`&supportRecurringPayments=true&enableCountrySelector=false` +
				`&themeName=dark` +
				`&${signedQuery}` +
				`&signature=${mockSignature}`;

			const result = await buildOnramperLink(params);

			expect(result).toBe(expectedUrl);
			// The frontend supplies no wallet addresses: only the identity is passed.
			expect(backendApi.signOnramperWidgetUrl).toHaveBeenCalledWith({
				identity: mockIdentity
			});
		});

		it('should build the correct URL with only required parameters', async () => {
			const signedQuery = `networkWallets=bitcoin:${mockBtcAddress}`;
			mockSignOnramperWidgetUrl(signedQuery);

			const params: BuildOnramperLinkParams = {
				identity: mockIdentity,
				mode: 'buy',
				defaultFiat: Currency.EUR,
				onlyCryptos: ['btc'],
				onlyCryptoNetworks: ['bitcoin'],
				supportRecurringPayments: false,
				enableCountrySelector: true,
				themeName: 'dark'
			};

			const expectedUrl =
				`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
				`&mode=buy&defaultFiat=eur` +
				`&onlyCryptos=btc&onlyCryptoNetworks=bitcoin` +
				`&supportRecurringPayments=false&enableCountrySelector=true` +
				`&themeName=dark` +
				`&${signedQuery}` +
				`&signature=${mockSignature}`;

			const result = await buildOnramperLink(params);

			expect(result).toBe(expectedUrl);
		});

		it('should omit the signed query when the backend returns an empty one', async () => {
			mockSignOnramperWidgetUrl('');

			const params: BuildOnramperLinkParams = {
				identity: mockIdentity,
				mode: 'buy',
				defaultFiat: Currency.EUR,
				onlyCryptos: ['btc', 'eth'],
				onlyCryptoNetworks: ['bitcoin', 'ethereum'],
				supportRecurringPayments: false,
				enableCountrySelector: true,
				themeName: 'dark'
			};

			const expectedUrl =
				`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
				`&mode=buy&defaultFiat=eur` +
				`&onlyCryptos=btc,eth&onlyCryptoNetworks=bitcoin,ethereum` +
				`&supportRecurringPayments=false&enableCountrySelector=true` +
				`&themeName=dark` +
				`&signature=${mockSignature}`;

			const result = await buildOnramperLink(params);

			expect(result).toBe(expectedUrl);
		});

		it('should omit empty onlyCryptos and onlyCryptoNetworks arrays', async () => {
			const signedQuery = `networkWallets=bitcoin:${mockBtcAddress}`;
			mockSignOnramperWidgetUrl(signedQuery);

			const params: BuildOnramperLinkParams = {
				identity: mockIdentity,
				mode: 'buy',
				defaultFiat: Currency.USD,
				onlyCryptos: [],
				onlyCryptoNetworks: [],
				supportRecurringPayments: false,
				enableCountrySelector: true,
				themeName: 'dark'
			};

			const expectedUrl =
				`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
				`&mode=buy&defaultFiat=usd` +
				`&supportRecurringPayments=false&enableCountrySelector=true` +
				`&themeName=dark` +
				`&${signedQuery}` +
				`&signature=${mockSignature}`;

			const result = await buildOnramperLink(params);

			expect(result).toBe(expectedUrl);
		});

		it('propagates errors from the backend signing call', async () => {
			vi.spyOn(backendApi, 'signOnramperWidgetUrl').mockRejectedValue(
				new Error('OnRamper signing secret is not configured on the backend canister.')
			);

			const params: BuildOnramperLinkParams = {
				identity: mockIdentity,
				mode: 'buy',
				defaultFiat: Currency.USD,
				onlyCryptos: [],
				onlyCryptoNetworks: [],
				supportRecurringPayments: false,
				enableCountrySelector: true,
				themeName: 'dark'
			};

			await expect(buildOnramperLink(params)).rejects.toThrow(
				/OnRamper signing secret is not configured/
			);
		});
	});
});
