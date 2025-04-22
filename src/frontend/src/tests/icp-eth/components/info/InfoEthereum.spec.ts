import InfoEthereum from '$icp-eth/components/info/InfoEthereum.svelte';
import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

// We need to mock these nested dependencies too because otherwise there is an error raise in the importing of `WebSocket` from `ws` inside the `ethers/provider` package
vi.mock('ethers/providers', () => {
	const provider = vi.fn();
	return { EtherscanProvider: provider, InfuraProvider: provider, JsonRpcProvider: provider };
});

describe('InfoEthereum', () => {
	const props = {
		sourceToken: mockValidIcToken,
		destinationToken: mockValidIcCkToken
	};

	it('should render title correctly', () => {
		const { getByText } = render(InfoEthereum, {
			props
		});

		expect(
			getByText(
				replacePlaceholders(en.info.ethereum.title, {
					$ckToken: mockValidIcCkToken.symbol
				})
			)
		).toBeDefined();
	});

	it('should render description correctly', () => {
		const { getByText } = render(InfoEthereum, {
			props
		});

		expect(
			getByText(
				replacePlaceholders(replaceOisyPlaceholders(en.info.ethereum.description), {
					$token: mockValidIcToken.symbol,
					$ckToken: mockValidIcCkToken.symbol,
					$network: mockValidIcToken.network.name
				})
			)
		).toBeDefined();
	});

	it('should render note correctly', () => {
		const { getByText } = render(InfoEthereum, {
			props
		});

		expect(
			getByText(
				replacePlaceholders(replaceOisyPlaceholders(en.info.ethereum.note), {
					$token: mockValidIcToken.symbol,
					$ckToken: mockValidIcCkToken.symbol
				})
			)
		).toBeDefined();
	});

	it('should render how-to message correctly', () => {
		const { getByText } = render(InfoEthereum, {
			props
		});

		expect(
			getByText(
				replacePlaceholders(replaceOisyPlaceholders(en.info.ethereum.how_to), {
					$ckToken: mockValidIcCkToken.symbol
				})
			)
		).toBeDefined();
	});
});
