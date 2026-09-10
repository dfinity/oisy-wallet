import SupportTokenDropdown from '$lib/components/support/SupportTokenDropdown.svelte';
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

describe('SupportTokenDropdown', () => {
	it('prompts for a selection while nothing is selected', () => {
		const { getByText } = render(SupportTokenDropdown, { props });

		expect(getByText(en.support.text.select_token)).toBeInTheDocument();
	});

	it('shows the selected symbol on the button', () => {
		const { getByTestId } = render(SupportTokenDropdown, {
			props: { ...props, selected: usdc }
		});

		expect(getByTestId(testId)).toHaveTextContent('ckUSDC');
	});

	it('renders a token that is both a default and an enabled custom token only once', async () => {
		// enabledIcrcTokens concatenates enabled defaults with enabled customs without dropping a
		// custom that duplicates a default, so the same ledger canister id can arrive twice. A keyed
		// each throws each_key_duplicate on that and renders nothing at all.
		const duplicate = { ...icp, name: 'ICP (custom entry)' };

		const { getByTestId } = render(SupportTokenDropdown, {
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

	it('is disabled and says so when no token is available', async () => {
		const { getByTestId } = render(SupportTokenDropdown, { props: { ...props, tokens: [] } });

		expect(getByTestId(testId)).toBeDisabled();

		// Force the panel open to prove it explains itself rather than showing a blank list.
		await fireEvent.click(getByTestId(testId));

		expect(document.querySelector(`[data-tid="${testId}-list"]`)).toBeNull();
	});

	it('lists the tokens sorted case-insensitively by symbol and reports the pick', async () => {
		const onSelect = vi.fn();

		const { getByTestId } = render(SupportTokenDropdown, { props: { ...props, onSelect } });

		await fireEvent.click(getByTestId(testId));

		const list = getByTestId(`${testId}-list`);
		const symbols = Array.from(list.querySelectorAll('[data-tid^="token-dropdown-option-"]')).map(
			(option) => option.textContent?.trim()
		);

		// localeCompare collates case-insensitively, so ckUSDC sorts before ICP.
		expect(symbols).toStrictEqual(['ckUSDC', 'ICP']);

		await fireEvent.click(getByTestId(`${testId}-option-${usdc.ledgerCanisterId}`));

		expect(onSelect).toHaveBeenCalledExactlyOnceWith(usdc);
	});
});
