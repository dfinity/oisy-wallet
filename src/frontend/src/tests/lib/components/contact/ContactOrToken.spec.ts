import { SOLANA_PROGRAMS } from '$env/programs/programs.sol.env';
import ContactOrToken from '$lib/components/contact/ContactOrToken.svelte';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { render } from '@testing-library/svelte';

describe('ContactOrToken', () => {
	const [program] = SOLANA_PROGRAMS;

	// A Solana program holds only executable code on chain, so the curated list is the one place
	// its name lives. Without it a swap says which pool it ran through in base58.
	it('should name a program from the curated list', () => {
		const { getByText, queryByText } = render(ContactOrToken, {
			props: { identifier: program.address, showFallback: true }
		});

		expect(getByText(program.name)).toBeInTheDocument();
		expect(
			queryByText(shortenWithMiddleEllipsis({ text: program.address }))
		).not.toBeInTheDocument();
	});

	it('should fall back to the address for a program it cannot name', () => {
		const unknown = 'HFqU5x6ZWQXvHqPvzWPXFRuVXsyfMPYbhVdiJPB2bU7gRe';

		const { getByText } = render(ContactOrToken, {
			props: { identifier: unknown, showFallback: true }
		});

		expect(getByText(shortenWithMiddleEllipsis({ text: unknown }))).toBeInTheDocument();
	});
});
