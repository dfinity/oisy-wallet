import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { CONVERT_AMOUNT_EXCHANGE_VALUE } from '$lib/constants/test-ids.constants';
import { exchangeStore } from '$lib/stores/exchange.store';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import SolWalletConnectSimulationPreview from '$sol/components/wallet-connect/SolWalletConnectSimulationPreview.svelte';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { splTokenMetadataStore } from '$sol/stores/spl-token-metadata.store';
import { SolanaNetworks } from '$sol/types/network';
import type { SolSimulationPreview } from '$sol/types/sol-simulation';
import en from '$tests/mocks/i18n.mock';
import { mockAtaAddress, mockSolAddress2, mockSplAddress } from '$tests/mocks/sol.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { render, within } from '@testing-library/svelte';

describe('SolWalletConnectSimulationPreview', () => {
	const props = (preview: SolSimulationPreview) => ({
		preview,
		feeToken: SOLANA_TOKEN
	});

	const solUsdPrice = 200;

	const enableSplToken = () => {
		splCustomTokensStore.setAll([
			{ data: { ...mockValidSplToken, version: undefined, enabled: true }, certified: false }
		]);
	};

	beforeEach(() => {
		exchangeStore.reset();
		splCustomTokensStore.resetAll();
		splTokenMetadataStore.reset();
	});

	it('should render an outgoing SOL delta as a negative amount', () => {
		const { getByTestId } = render(
			SolWalletConnectSimulationPreview,
			props({ solDelta: -10_000_000n, tokenDeltas: [], controlChanges: [] })
		);

		expect(getByTestId('simulated-sol-delta')).toHaveTextContent('-0.01 SOL');
	});

	it('should render an incoming token delta as a positive amount', () => {
		const { getByTestId } = render(
			SolWalletConnectSimulationPreview,
			props({
				tokenDeltas: [
					{ account: mockAtaAddress, tokenAddress: mockSplAddress, decimals: 6, delta: 2_500_000n }
				],
				controlChanges: []
			})
		);

		expect(getByTestId('simulated-token-delta')).toHaveTextContent('+2.5');
	});

	it('should price the SOL delta with the native token rate', () => {
		exchangeStore.set([{ solana: { usd: solUsdPrice } }]);

		const { getByTestId } = render(
			SolWalletConnectSimulationPreview,
			props({ solDelta: -10_000_000n, tokenDeltas: [], controlChanges: [] })
		);

		expect(getByTestId('simulated-sol-delta')).toHaveTextContent('-0.01 SOL');
		expect(getByTestId('simulated-sol-delta')).toHaveTextContent('~$2.00');
	});

	it('should price a known token delta with its own rate', () => {
		enableSplToken();
		exchangeStore.set([
			{ solana: { usd: solUsdPrice }, [mockValidSplToken.address.toLowerCase()]: { usd: 4 } }
		]);

		const { getByTestId } = render(
			SolWalletConnectSimulationPreview,
			props({
				tokenDeltas: [
					{ account: mockAtaAddress, tokenAddress: mockSplAddress, decimals: 6, delta: 2_500_000n }
				],
				controlChanges: []
			})
		);

		expect(getByTestId('simulated-token-delta')).toHaveTextContent(
			`+2.5 ${mockValidSplToken.symbol}`
		);
		expect(getByTestId('simulated-token-delta')).toHaveTextContent('~$10.00');
	});

	it('should show a value below the display floor as a threshold', () => {
		exchangeStore.set([{ solana: { usd: solUsdPrice } }]);

		const { getByTestId } = render(
			SolWalletConnectSimulationPreview,
			props({ solDelta: -1_000n, tokenDeltas: [], controlChanges: [] })
		);

		expect(getByTestId('simulated-sol-delta')).toHaveTextContent('< $0.01');
	});

	// Pricing an unknown mint would mean borrowing a rate that describes a different token.
	it('should render a delta of an unknown mint as an amount with no fiat value', () => {
		exchangeStore.set([{ solana: { usd: solUsdPrice } }]);

		const { getByTestId, queryByTestId } = render(
			SolWalletConnectSimulationPreview,
			props({
				tokenDeltas: [
					{ account: mockAtaAddress, tokenAddress: mockSplAddress, decimals: 6, delta: 2_500_000n }
				],
				controlChanges: []
			})
		);

		expect(getByTestId('simulated-token-delta')).toHaveTextContent('+2.5');
		expect(queryByTestId(CONVERT_AMOUNT_EXCHANGE_VALUE)).not.toBeInTheDocument();
	});

	describe('naming a mint OISY does not know', () => {
		// Deliberately synthetic. A real mint address would resolve the moment the default SPL
		// tokens are seeded into the store, and this case would quietly stop exercising the
		// unlisted path it exists to cover.
		const otherMint = 'notAKnownMint11111111111111111111111111111';

		const delta = (tokenAddress: string) => ({
			account: mockAtaAddress,
			tokenAddress,
			decimals: 6,
			delta: 2_500_000n
		});

		it('should name a lone unlisted mint without numbering it', () => {
			const { getByTestId } = render(
				SolWalletConnectSimulationPreview,
				props({ tokenDeltas: [delta(mockSplAddress)], controlChanges: [] })
			);

			expect(getByTestId('simulated-token-delta')).toHaveTextContent(
				en.transaction.text.unknown_token
			);
		});

		// Two anonymous rows reading identically is worse than an address: the user cannot tell
		// which leg is which.
		it('should number unlisted mints when more than one appears', () => {
			const { getAllByTestId } = render(
				SolWalletConnectSimulationPreview,
				props({ tokenDeltas: [delta(mockSplAddress), delta(otherMint)], controlChanges: [] })
			);

			const [first, second] = getAllByTestId('simulated-token-delta');

			expect(first).toHaveTextContent(`${en.transaction.text.unknown_token} 1`);
			expect(second).toHaveTextContent(`${en.transaction.text.unknown_token} 2`);
		});

		// The placeholder says the wallet does not list the token, and a symbol of its own is its
		// creator's choice. The address is what the user can look the token up by.
		it('should show the address of an unlisted mint with controls to copy it and open its page', () => {
			const { getByTestId } = render(
				SolWalletConnectSimulationPreview,
				props({ tokenDeltas: [delta(mockSplAddress)], controlChanges: [] })
			);

			const address = getByTestId('simulated-token-address');

			expect(address).toHaveTextContent(shortenWithMiddleEllipsis({ text: mockSplAddress }));
			expect(
				within(address).getByRole('button', { name: `${en.core.text.copy}: ${mockSplAddress}` })
			).toBeInTheDocument();
			expect(
				within(address).getByRole('link', {
					name: en.tokens.alt.open_token_address_block_explorer
				})
			).toHaveAttribute('href', `https://solscan.io/token/${mockSplAddress}/`);
		});

		it('should show no address for a token the wallet lists', () => {
			enableSplToken();

			const { queryByTestId } = render(
				SolWalletConnectSimulationPreview,
				props({ tokenDeltas: [delta(mockValidSplToken.address)], controlChanges: [] })
			);

			expect(queryByTestId('simulated-token-address')).not.toBeInTheDocument();
		});

		// Any mint can carry the symbol of a token the wallet lists. The two rows have to differ,
		// or the change reads as one of the token the user knows.
		it('should keep a listed symbol carried by an unlisted mint inside the placeholder', () => {
			enableSplToken();
			splTokenMetadataStore.set({
				network: SolanaNetworks.mainnet,
				metadata: {
					[otherMint]: { name: mockValidSplToken.name, symbol: mockValidSplToken.symbol }
				}
			});

			const { getAllByTestId } = render(
				SolWalletConnectSimulationPreview,
				props({
					tokenDeltas: [delta(mockValidSplToken.address), delta(otherMint)],
					controlChanges: []
				})
			);

			const [listed, unlisted] = getAllByTestId('simulated-token-delta');

			expect(listed).toHaveTextContent(`+2.5 ${mockValidSplToken.symbol}`);
			expect(listed).not.toHaveTextContent(en.transaction.text.unknown_token);
			expect(unlisted).toHaveTextContent(
				`+2.5 ${replacePlaceholders(en.transaction.text.unknown_token_named, {
					$symbol: mockValidSplToken.symbol
				})}`
			);
			expect(within(unlisted).getByTestId('simulated-token-address')).toHaveTextContent(
				shortenWithMiddleEllipsis({ text: otherMint })
			);
		});

		it('should still prefer the ticker of a mint it knows', () => {
			enableSplToken();

			const { getByTestId } = render(
				SolWalletConnectSimulationPreview,
				props({ tokenDeltas: [delta(mockValidSplToken.address)], controlChanges: [] })
			);

			expect(getByTestId('simulated-token-delta')).toHaveTextContent(mockValidSplToken.symbol);
		});

		// Hiding a token from the asset list says which assets the user wants to hold, not which
		// ones the wallet can read. The review resolved enabled tokens only, so disabling one
		// turned every change that moved it anonymous.
		it('should name a mint the user disabled', () => {
			splCustomTokensStore.setAll([
				{ data: { ...mockValidSplToken, version: undefined, enabled: false }, certified: false }
			]);

			const { getByTestId } = render(
				SolWalletConnectSimulationPreview,
				props({ tokenDeltas: [delta(mockValidSplToken.address)], controlChanges: [] })
			);

			expect(getByTestId('simulated-token-delta')).toHaveTextContent(mockValidSplToken.symbol);
		});
	});

	// An authority change moves nothing, so it has to be named in its own right or it is invisible.
	it('should render a control change even with no amounts at all', () => {
		const { getByTestId } = render(
			SolWalletConnectSimulationPreview,
			props({
				tokenDeltas: [],
				controlChanges: [{ account: mockAtaAddress, field: 'owner', to: mockSolAddress2 }]
			})
		);

		expect(getByTestId('simulated-control-change')).toHaveTextContent(mockSolAddress2);
	});
});
