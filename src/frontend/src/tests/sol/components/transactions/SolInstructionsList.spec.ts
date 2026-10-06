import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import SolInstructionsList from '$sol/components/transactions/SolInstructionsList.svelte';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
import en from '$tests/mocks/i18n.mock';
import {
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
