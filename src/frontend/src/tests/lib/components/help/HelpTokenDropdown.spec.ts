import HelpTokenDropdown from '$lib/components/help/HelpTokenDropdown.svelte';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

const icp = {
	...mockValidIcrcToken,
	symbol: 'ICP',
	ledgerCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai'
};

const usdc = {
	...mockValidIcrcToken,
	symbol: 'ckUSDC',
	ledgerCanisterId: 'qaa6y-5yaaa-aaaaa-aaafa-cai'
};

const testId = 'token-dropdown';

const props = {
	tokens: [icp, usdc],
	ariaLabel: 'Pick a token',
	testId,
	onSelect: () => undefined
};

describe('HelpTokenDropdown', () => {
	it('prompts for a selection while nothing is selected', () => {
		const { getByText } = render(HelpTokenDropdown, { props });

		expect(getByText(en.help.text.select_token)).toBeInTheDocument();
	});

	it('shows the selected symbol on the button', () => {
		const { getByTestId } = render(HelpTokenDropdown, {
			props: { ...props, selected: usdc }
		});

		expect(getByTestId(testId)).toHaveTextContent('ckUSDC');
	});

	it('renders a token that is both a default and an enabled custom token only once', async () => {
		// enabledIcrcTokens concatenates enabled defaults with enabled customs without dropping a
		// custom that duplicates a default, so the same ledger canister id can arrive twice. A keyed
		// each throws each_key_duplicate on that and renders nothing at all.
		const duplicate = { ...icp, name: 'ICP (custom entry)' };

		const { getByTestId } = render(HelpTokenDropdown, {
			props: { ...props, tokens: [icp, usdc, duplicate] }
		});

		await fireEvent.click(getByTestId(testId));

		const list = getByTestId(`${testId}-list`);
		const options = list.querySelectorAll(`[data-tid^="${testId}-option-"]`);

		expect(options).toHaveLength(2);
		expect(
			list.querySelectorAll(`[data-tid="${testId}-option-${icp.ledgerCanisterId}"]`)
		).toHaveLength(1);
	});

	it('is disabled when no token is available', async () => {
		const { getByTestId } = render(HelpTokenDropdown, { props: { ...props, tokens: [] } });

		expect(getByTestId(testId)).toBeDisabled();

		// The panel cannot open, which is why the explanation lives in the card rather than here.
		// Forcing it open yields no options to choose.
		await fireEvent.click(getByTestId(testId));

		expect(document.querySelectorAll(`[data-tid^="${testId}-option-"]`)).toHaveLength(0);
	});

	it('lists the tokens sorted case-insensitively by symbol and reports the pick', async () => {
		const onSelect = vi.fn();

		const { getByTestId } = render(HelpTokenDropdown, { props: { ...props, onSelect } });

		await fireEvent.click(getByTestId(testId));

		const list = getByTestId(`${testId}-list`);
		const labels = Array.from(list.querySelectorAll('[data-tid^="token-dropdown-option-"]')).map(
			(option) => option.textContent?.replace(/\s+/g, ' ').trim()
		);

		// localeCompare collates case-insensitively, so ckUSDC sorts before ICP.
		expect(labels).toStrictEqual([`ckUSDC ${usdc.name}`, `ICP ${icp.name}`]);

		await fireEvent.click(getByTestId(`${testId}-option-${usdc.ledgerCanisterId}`));

		expect(onSelect).toHaveBeenCalledExactlyOnceWith(usdc);
	});

	it('names the token under its symbol, so the symbol is not the whole label', async () => {
		const { getByTestId } = render(HelpTokenDropdown, { props });

		await fireEvent.click(getByTestId(testId));

		expect(getByTestId(`${testId}-option-${usdc.ledgerCanisterId}`)).toHaveTextContent(usdc.name);
	});

	it('falls back to the ledger id when a token impersonates another on symbol and name', async () => {
		// A custom ledger can claim any symbol and any name. The ledger id is the one field it
		// cannot copy, so it is what keeps the two options apart.
		const impostor = { ...usdc, ledgerCanisterId: 'mxzaz-hqaaa-aaaar-qaada-cai' };

		const { getByTestId } = render(HelpTokenDropdown, {
			props: { ...props, tokens: [icp, usdc, impostor] }
		});

		await fireEvent.click(getByTestId(testId));

		expect(getByTestId(`${testId}-option-${usdc.ledgerCanisterId}`)).toHaveTextContent(
			'qaa6y-5...afa-cai'
		);
		expect(getByTestId(`${testId}-option-${impostor.ledgerCanisterId}`)).toHaveTextContent(
			'mxzaz-h...ada-cai'
		);

		// A token with no twin keeps the plain name.
		expect(getByTestId(`${testId}-option-${icp.ledgerCanisterId}`)).not.toHaveTextContent('...');
	});
});
