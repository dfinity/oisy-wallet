import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import SolInstructionsList from '$sol/components/transactions/SolInstructionsList.svelte';
import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
import en from '$tests/mocks/i18n.mock';
import { mockSolAddress2 } from '$tests/mocks/sol.mock';
import { render } from '@testing-library/svelte';

describe('SolInstructionsList', () => {
	const send = (tokenAddress: string): SolInstructionSummary => ({
		kind: 'send',
		amount: 1_000_000n,
		decimals: 6,
		tokenAddress,
		counterparty: mockSolAddress2
	});

	// Two lines both reading "Unknown token" say less than the addresses would, since nothing
	// tells them apart. The row and the modal already count them off; this list did not.
	it('should number the mints it cannot name', () => {
		const { getByTestId } = render(SolInstructionsList, {
			props: {
				instructions: [send('first-unnamed'), send('second-unnamed')],
				token: SOLANA_TOKEN
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
			props: { instructions: [send('only-unnamed')], token: SOLANA_TOKEN }
		});

		expect(getByTestId('sol-instructions-list')).toHaveTextContent(
			en.transaction.text.unknown_token
		);
		expect(getByTestId('sol-instructions-list')).not.toHaveTextContent(
			`${en.transaction.text.unknown_token} 1`
		);
	});
});
