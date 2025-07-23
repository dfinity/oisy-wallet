import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import EthAddTokenReview from '$eth/components/tokens/EthAddTokenReview.svelte';
import * as infuraErc20SpyProviders from '$eth/providers/infura-erc20.providers';
import { InfuraErc20Provider } from '$eth/providers/infura-erc20.providers';
import * as infuraErc721SpyProviders from '$eth/providers/infura-erc721.providers';
import { InfuraErc721Provider } from '$eth/providers/infura-erc721.providers';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import * as toastsStore from '$lib/stores/toasts.store';
import { toastsError } from '$lib/stores/toasts.store';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';


describe('EthAddTokenReview', () => {
	const mockErc721CustomToken: Erc721CustomToken = {
		...mockValidErc721Token,
		id: parseTokenId('Erc721TokenId'),
		network: ETHEREUM_NETWORK,
		symbol: 'DQH',
		address: `${mockValidErc721Token.address}1`,
		version: undefined,
		enabled: true
	};

	const mockErc721Metadata = vi
		.fn()
		.mockResolvedValue({ name: 'Test Token', symbol: 'TTK', decimals: 0 });
	const mockErc20Metadata = vi
		.fn()
		.mockResolvedValue({ name: 'Test Token2', symbol: 'HSI', decimals: 8 });

	beforeEach(() => {
		vi.clearAllMocks();

		erc721CustomTokensStore.resetAll();

		vi.spyOn(toastsStore, 'toastsError');
	});

	it('should render an error if no contract address is defined', () => {
		render(EthAddTokenReview, {
			props: {
				contractAddress: undefined,
				network: ETHEREUM_NETWORK
			}
		});

		expect(toastsError).toHaveBeenCalledWith({
			msg: { text: en.tokens.import.error.missing_contract_address }
		});
	});

	it('should render an error if token is already defined', () => {
		erc721CustomTokensStore.setAll([{ data: mockErc721CustomToken, certified: false }]);

		render(EthAddTokenReview, {
			props: {
				contractAddress: mockErc721CustomToken.address,
				network: ETHEREUM_NETWORK
			}
		});

		expect(toastsError).toHaveBeenCalledWith({
			msg: { text: en.tokens.error.already_available }
		});
	});

	it('should load erc721 metadata for erc721 contract address', async () => {
		const mockErc20Provider = {
			isErc20: vi.fn().mockResolvedValue(false),
			metadata: mockErc20Metadata,
			provider: new InfuraErc20Provider(ETHEREUM_NETWORK.providers.infura),
			network: ETHEREUM_NETWORK
		} as unknown as InfuraErc20Provider;

		const mockErc721Provider = {
			metadata: mockErc721Metadata,
			provider: new InfuraErc721Provider(ETHEREUM_NETWORK.providers.infura),
			network: ETHEREUM_NETWORK
		} as unknown as InfuraErc721Provider;

		vi.spyOn(infuraErc20SpyProviders, 'infuraErc20Providers').mockReturnValue(mockErc20Provider);
		vi.spyOn(infuraErc721SpyProviders, 'infuraErc721Providers').mockReturnValue(mockErc721Provider);

		render(EthAddTokenReview, {
			props: {
				contractAddress: mockEthAddress,
				network: ETHEREUM_NETWORK
			}
		});

		await vi.waitFor(() => {
			expect(mockErc20Metadata).not.toHaveBeenCalled();
			expect(mockErc721Metadata).toHaveBeenCalledWith({ address: mockEthAddress });
		});
	});

	it('should load erc20 metadata for erc20 contract address', async () => {
		const mockErc20Provider = {
			isErc20: vi.fn().mockResolvedValue(true),
			metadata: mockErc20Metadata,
			provider: new InfuraErc20Provider(ETHEREUM_NETWORK.providers.infura),
			network: ETHEREUM_NETWORK
		} as unknown as InfuraErc20Provider;

		vi.spyOn(infuraErc20SpyProviders, 'infuraErc20Providers').mockReturnValue(mockErc20Provider);

		render(EthAddTokenReview, {
			props: {
				contractAddress: mockEthAddress,
				network: ETHEREUM_NETWORK
			}
		});

		await vi.waitFor(() => {
			expect(mockErc20Metadata).toHaveBeenCalledWith({ address: mockEthAddress });
			expect(mockErc721Metadata).not.toHaveBeenCalled();
		});
	});

	it('should render an error if metadata does not contain a symbol', async () => {
		const mockErc20Provider = {
			isErc20: vi.fn().mockResolvedValue(true),
			metadata: vi.fn().mockResolvedValue({ name: 'Test Token', decimals: 0 }),
			provider: new InfuraErc20Provider(ETHEREUM_NETWORK.providers.infura),
			network: ETHEREUM_NETWORK
		} as unknown as InfuraErc20Provider;

		vi.spyOn(infuraErc20SpyProviders, 'infuraErc20Providers').mockReturnValue(mockErc20Provider);

		render(EthAddTokenReview, {
			props: {
				contractAddress: mockEthAddress,
				network: ETHEREUM_NETWORK
			}
		});

		await vi.waitFor(() => {
			expect(toastsError).toHaveBeenCalledWith({
				msg: { text: en.tokens.error.incomplete_metadata }
			});
		});
	});

	it('should render an error if metadata does not contain a name', async () => {
		const mockErc20Provider = {
			isErc20: vi.fn().mockResolvedValue(true),
			metadata: vi.fn().mockResolvedValue({ symbol: 'HSI', decimals: 0 }),
			provider: new InfuraErc20Provider(ETHEREUM_NETWORK.providers.infura),
			network: ETHEREUM_NETWORK
		} as unknown as InfuraErc20Provider;

		vi.spyOn(infuraErc20SpyProviders, 'infuraErc20Providers').mockReturnValue(mockErc20Provider);

		render(EthAddTokenReview, {
			props: {
				contractAddress: mockEthAddress,
				network: ETHEREUM_NETWORK
			}
		});

		await vi.waitFor(() => {
			expect(toastsError).toHaveBeenCalledWith({
				msg: { text: en.tokens.error.incomplete_metadata }
			});
		});
	});

	it('should render an error if metadata are duplicated', async () => {
		erc721CustomTokensStore.setAll([{ data: mockErc721CustomToken, certified: false }]);

		const mockErc20Provider = {
			isErc20: vi.fn().mockResolvedValue(false),
			metadata: mockErc20Metadata,
			provider: new InfuraErc20Provider(ETHEREUM_NETWORK.providers.infura),
			network: ETHEREUM_NETWORK
		} as unknown as InfuraErc20Provider;

		const mockErc721Provider = {
			metadata: vi.fn().mockResolvedValue({
				name: mockErc721CustomToken.name,
				symbol: mockErc721CustomToken.symbol,
				decimals: 0
			}),
			provider: new InfuraErc721Provider(ETHEREUM_NETWORK.providers.infura),
			network: ETHEREUM_NETWORK
		} as unknown as InfuraErc721Provider;

		vi.spyOn(infuraErc20SpyProviders, 'infuraErc20Providers').mockReturnValue(mockErc20Provider);
		vi.spyOn(infuraErc721SpyProviders, 'infuraErc721Providers').mockReturnValue(mockErc721Provider);

		render(EthAddTokenReview, {
			props: {
				contractAddress: mockEthAddress,
				network: ETHEREUM_NETWORK
			}
		});

		await vi.waitFor(() => {
			expect(toastsError).toHaveBeenCalledWith({
				msg: { text: en.tokens.error.duplicate_metadata }
			});
		});
	});
});
