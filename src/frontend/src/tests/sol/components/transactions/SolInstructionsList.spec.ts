import { WSOL_TOKEN } from '$env/tokens/tokens-spl/tokens.wsol.env';
import { SOLANA_DEVNET_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import SolInstructionsList from '$sol/components/transactions/SolInstructionsList.svelte';
import { SYSTEM_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { splTokenMetadataStore } from '$sol/stores/spl-token-metadata.store';
import { SolanaNetworks } from '$sol/types/network';
import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
import { mapSolInstructionSummaries } from '$sol/utils/sol-instruction-summary.utils';
import en from '$tests/mocks/i18n.mock';
import {
	mockAtaAddress3,
	mockSolAddress,
	mockSolAddress2,
	mockSolAddress3,
	mockSplAddress
} from '$tests/mocks/sol.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { render } from '@testing-library/svelte';

describe('SolInstructionsList', () => {
	const send = (tokenAddress: string): SolInstructionSummary => ({
		kind: 'send',
		amount: 1_000_000n,
		decimals: 6,
		tokenAddress,
		counterparty: mockSolAddress2
	});

	beforeEach(() => {
		splCustomTokensStore.resetAll();
		splTokenMetadataStore.reset();
	});

	// Any mint can carry the symbol of a token the wallet lists. Kept inside the placeholder, the
	// line moving it cannot read as one that moves the listed token.
	it('should keep a listed symbol carried by an unlisted mint inside the placeholder', () => {
		splCustomTokensStore.setAll([
			{ data: { ...mockValidSplToken, version: undefined, enabled: true }, certified: false }
		]);
		splTokenMetadataStore.set({
			network: SolanaNetworks.mainnet,
			metadata: {
				'other-mint': { name: mockValidSplToken.name, symbol: mockValidSplToken.symbol }
			}
		});

		const { getAllByTestId } = render(SolInstructionsList, {
			props: {
				instructions: [send(mockSplAddress), send('other-mint')],
				token: SOLANA_TOKEN,
				userAddress: mockSolAddress
			}
		});

		const [listed, unlisted] = getAllByTestId('sol-instruction');

		expect(listed).toHaveTextContent(mockValidSplToken.symbol);
		expect(listed).not.toHaveTextContent(en.transaction.text.unknown_token);
		expect(unlisted).toHaveTextContent(
			replacePlaceholders(en.transaction.text.unknown_token_named, {
				$symbol: mockValidSplToken.symbol
			})
		);
	});

	// Two lines both reading "Unknown token" say less than the addresses would, since nothing
	// tells them apart. The row and the modal already count them off; this list did not.
	it('should number the mints it cannot name', () => {
		const { getByTestId } = render(SolInstructionsList, {
			props: {
				instructions: [send('first-unnamed'), send('second-unnamed')],
				token: SOLANA_TOKEN,
				userAddress: mockSolAddress
			}
		});

		expect(getByTestId('sol-instructions-list')).toHaveTextContent(
			`${en.transaction.text.unknown_token} 1`
		);
		expect(getByTestId('sol-instructions-list')).toHaveTextContent(
			`${en.transaction.text.unknown_token} 2`
		);
	});

	// One of a kind needs no number: there is nothing to tell it apart from.
	it('should leave a lone unnamed mint unnumbered', () => {
		const { getByTestId } = render(SolInstructionsList, {
			props: {
				instructions: [send('only-unnamed')],
				token: SOLANA_TOKEN,
				userAddress: mockSolAddress
			}
		});

		expect(getByTestId('sol-instructions-list')).toHaveTextContent(
			en.transaction.text.unknown_token
		);
		expect(getByTestId('sol-instructions-list')).not.toHaveTextContent(
			`${en.transaction.text.unknown_token} 1`
		);
	});

	// A token the user hid from the asset list is still one the wallet lists and can therefore
	// read. The list resolved enabled tokens only, so disabling a mint turned every line that
	// moved it into an unnamed one.
	it('should name a disabled token', () => {
		splCustomTokensStore.setAll([
			{ data: { ...mockValidSplToken, version: undefined, enabled: false }, certified: false }
		]);

		const { getByTestId } = render(SolInstructionsList, {
			props: {
				instructions: [send(mockSplAddress)],
				token: SOLANA_TOKEN,
				userAddress: mockSolAddress
			}
		});

		expect(getByTestId('sol-instructions-list')).toHaveTextContent(mockValidSplToken.symbol);
		expect(getByTestId('sol-instructions-list')).not.toHaveTextContent(
			en.transaction.text.unknown_token
		);
	});

	// An unchecked transfer states no decimals of its own, so the token's are the only ones the
	// line has. Without them the amount reads in base units, which is a wrong figure rather than
	// a missing one.
	it('should scale an amount with the decimals of a disabled token', () => {
		splCustomTokensStore.setAll([
			{ data: { ...mockValidSplToken, version: undefined, enabled: false }, certified: false }
		]);

		const { getByTestId } = render(SolInstructionsList, {
			props: {
				instructions: [{ ...send(mockSplAddress), decimals: undefined }],
				token: SOLANA_TOKEN,
				userAddress: mockSolAddress
			}
		});

		expect(getByTestId('sol-instructions-list')).toHaveTextContent(
			`0.01 ${mockValidSplToken.symbol}`
		);
	});

	// An unwrap names lamports, and wrapped SOL is a listed token on mainnet only: elsewhere only the
	// line itself can say what precision its amount has.
	it('should state an unwrap in the precision of SOL where wrapped SOL is not listed', () => {
		const [unwrap] = mapSolInstructionSummaries({
			instructions: [
				{
					program: 'spl-token',
					programId: TOKEN_PROGRAM_ADDRESS,
					parsed: {
						type: 'unwrapLamports',
						info: {
							source: mockAtaAddress3,
							destination: mockSolAddress,
							authority: mockSolAddress2,
							amount: '5000000'
						}
					}
				}
			],
			ownedAddresses: [mockSolAddress],
			userAddress: mockSolAddress,
			addressToToken: { [mockAtaAddress3]: WSOL_TOKEN.address }
		});

		const { getByTestId } = render(SolInstructionsList, {
			props: { instructions: [unwrap], token: SOLANA_DEVNET_TOKEN, userAddress: mockSolAddress }
		});

		expect(getByTestId('sol-instructions-list')).toHaveTextContent('0.005');
	});

	// SOL somebody else pays into a wrapped SOL account of the user's is lamports as well, so it reads
	// in the same precision wherever wrapped SOL is not listed.
	it('should state SOL paid into a wrapped SOL account in the precision of SOL where wrapped SOL is not listed', () => {
		const [receive] = mapSolInstructionSummaries({
			instructions: [
				{
					program: 'system',
					programId: SYSTEM_PROGRAM_ADDRESS,
					parsed: {
						type: 'transfer',
						info: { source: mockSolAddress2, destination: mockAtaAddress3, lamports: 5_000_000 }
					}
				}
			],
			ownedAddresses: [mockSolAddress, mockAtaAddress3],
			userAddress: mockSolAddress,
			addressToToken: { [mockAtaAddress3]: WSOL_TOKEN.address }
		});

		expect(receive).toHaveProperty('tokenAddress', WSOL_TOKEN.address);

		const { getByTestId } = render(SolInstructionsList, {
			props: { instructions: [receive], token: SOLANA_DEVNET_TOKEN, userAddress: mockSolAddress }
		});

		expect(getByTestId('sol-instructions-list')).toHaveTextContent('0.005');
	});

	// Read from the message alone, nothing says how much an unwrap of everything moves, but the line
	// still says what leaves the account and for whom, rather than that a program was called.
	it('should state an unwrap of everything nobody read the amount of as one', () => {
		const instructions = mapSolInstructionSummaries({
			instructions: [
				{
					program: 'spl-token',
					programId: TOKEN_PROGRAM_ADDRESS,
					parsed: {
						type: 'unwrapLamports',
						info: {
							source: mockAtaAddress3,
							destination: mockSolAddress,
							authority: mockSolAddress
						}
					}
				}
			],
			ownedAddresses: [mockSolAddress, mockAtaAddress3],
			userAddress: mockSolAddress,
			includeUnrecognised: true
		});

		const { getByTestId } = render(SolInstructionsList, {
			props: { instructions, token: SOLANA_TOKEN, userAddress: mockSolAddress }
		});

		// No wrapped SOL token is listed here, so its symbol is the placeholder.
		expect(getByTestId('sol-instructions-list')).toHaveTextContent(
			replacePlaceholders(en.transaction.text.instruction_unwrap_all_to, {
				$symbol: en.transaction.text.unknown_token
			})
		);
		expect(getByTestId('sol-instructions-list')).not.toHaveTextContent(
			en.transaction.text.summary_other
		);
	});

	// The program names the account, so it follows the line the way the program of a route does.
	it('should name the program an account is opened for', () => {
		const { getByTestId } = render(SolInstructionsList, {
			props: {
				instructions: [
					{
						kind: 'createAccount',
						account: mockSolAddress2,
						program: mockSolAddress3,
						programName: 'lb_clmm',
						rent: 41_899_840n
					}
				],
				token: SOLANA_TOKEN,
				userAddress: mockSolAddress
			}
		});

		expect(getByTestId('sol-instructions-list')).toHaveTextContent(
			/^Create app account for lb_clmm .+ · rent 0\.04189984 SOL$/
		);
	});

	describe('an account opened under the heading of an instruction', () => {
		const opening: SolInstructionSummary = {
			kind: 'createAccount',
			account: mockSolAddress2,
			program: mockSolAddress3,
			programName: 'lb_clmm',
			rent: 41_899_840n
		};

		const render$ = (heading: SolInstructionSummary) =>
			render(SolInstructionsList, {
				props: {
					instructions: [heading],
					token: SOLANA_TOKEN,
					userAddress: mockSolAddress
				}
			});

		// The heading right above shows the address with its controls, so the line keeps the
		// name alone and reads like the opening of a token account.
		it('should name the program without repeating its address', () => {
			const { getAllByTestId, getAllByText } = render$({
				kind: 'route',
				program: mockSolAddress3,
				programName: 'lb_clmm',
				children: [opening]
			});

			const [, line] = getAllByTestId('sol-instruction');

			expect(line).toHaveTextContent(/^Create app account for lb_clmm · rent 0\.04189984 SOL$/);
			expect(getAllByText(shortenWithMiddleEllipsis({ text: mockSolAddress3 }))).toHaveLength(1);
		});

		// The close reads like the opening, and says the rent came home.
		it('should say a closed account handed its rent back to the wallet', () => {
			const { getAllByTestId } = render$({
				kind: 'route',
				program: mockSolAddress3,
				programName: 'lb_clmm',
				children: [
					{
						kind: 'closeAccount',
						account: mockSolAddress2,
						program: mockSolAddress3,
						programName: 'lb_clmm',
						returned: 41_899_840n
					}
				]
			});

			const [, line] = getAllByTestId('sol-instruction');

			expect(line).toHaveTextContent(
				/^Close app account for lb_clmm · 0\.04189984 SOL sent to your wallet$/
			);
		});

		it('should name it by its address when it publishes no name', () => {
			const { getAllByTestId } = render$({
				kind: 'route',
				program: mockSolAddress3,
				children: [{ ...opening, programName: undefined }]
			});

			const [, line] = getAllByTestId('sol-instruction');

			expect(line).toHaveTextContent(
				`Create app account for ${shortenWithMiddleEllipsis({ text: mockSolAddress3 })} · rent 0.04189984 SOL`
			);
		});

		it('should keep the address of a program other than the heading’s', () => {
			const { getAllByText } = render$({
				kind: 'route',
				program: mockSolAddress,
				children: [opening]
			});

			expect(getAllByText(shortenWithMiddleEllipsis({ text: mockSolAddress3 }))).toHaveLength(1);
			expect(getAllByText(shortenWithMiddleEllipsis({ text: mockSolAddress }))).toHaveLength(1);
		});
	});

	it('should list the lines of a token batch under one naming it and its program', () => {
		const { getAllByTestId, getAllByText } = render(SolInstructionsList, {
			props: {
				instructions: [
					{
						kind: 'batch',
						program: mockSolAddress3,
						children: [send(mockSplAddress), send(mockSplAddress)]
					}
				],
				token: SOLANA_TOKEN,
				userAddress: mockSolAddress
			}
		});

		const [heading, ...lines] = getAllByTestId('sol-instruction');

		expect(heading).toHaveTextContent(en.transaction.text.instruction_batch_via);
		expect(lines).toHaveLength(2);
		expect(getAllByText(shortenWithMiddleEllipsis({ text: mockSolAddress3 }))).toHaveLength(1);
	});

	// The notice about programs OISY cannot read names a pool by itself; the leg the pool made has to
	// say so too, or the name matches nothing on the screen.
	it('should name the pool a leg of a route goes through', () => {
		const { getAllByTestId } = render(SolInstructionsList, {
			props: {
				instructions: [
					{
						kind: 'route',
						program: mockSolAddress3,
						programName: 'jupiter',
						children: [
							{
								...send(mockSplAddress),
								via: 'fUSioN9YKKSa3CUC2YUc4tPkHJ5Y6XW1yz8y6F7qWz9',
								viaName: 'fusionamm'
							}
						]
					}
				],
				token: SOLANA_TOKEN,
				userAddress: mockSolAddress
			}
		});

		const [, leg] = getAllByTestId('sol-instruction');

		expect(leg).toHaveTextContent(/· via fusionamm$/);
	});

	it('should not call sends that all leave a swap', () => {
		const { getByTestId } = render(SolInstructionsList, {
			props: {
				instructions: [
					{
						kind: 'route',
						program: mockSolAddress3,
						children: [send(mockSplAddress), send(mockSplAddress)]
					}
				],
				token: SOLANA_TOKEN,
				userAddress: mockSolAddress
			}
		});

		expect(getByTestId('sol-instructions-list')).toHaveTextContent(
			en.transaction.text.instruction_unknown_via
		);
		expect(getByTestId('sol-instructions-list')).not.toHaveTextContent(
			en.transaction.text.instruction_route
		);
	});
});
