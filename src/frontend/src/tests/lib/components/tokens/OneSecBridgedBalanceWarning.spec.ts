import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import OneSecBridgedBalanceWarning from '$lib/components/tokens/OneSecBridgedBalanceWarning.svelte';
import { ONESEC_BRIDGED_BALANCE_WARNING } from '$lib/constants/test-ids.constants';
import * as bridgedBalancesDerived from '$lib/derived/onesec-bridged-balances.derived';
import { Languages } from '$lib/enums/languages';
import type { Token } from '$lib/types/token';
import { formatList, replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('OneSecBridgedBalanceWarning', () => {
	const wrappedIcpOnBase = {
		...mockValidToken,
		symbol: 'ICP',
		network: BASE_NETWORK
	} as unknown as Token;

	const wrappedBobOnEthereum = {
		...mockValidToken,
		symbol: 'BOB',
		network: ETHEREUM_NETWORK
	} as unknown as Token;

	const mockHeld = (tokens: Token[]) =>
		vi
			.spyOn(bridgedBalancesDerived, 'oneSecBridgedTokensWithBalance', 'get')
			.mockImplementation(() => readable(tokens));

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('does not render when the user holds no bridged token', () => {
		mockHeld([]);

		const { queryByTestId } = render(OneSecBridgedBalanceWarning);

		expect(queryByTestId(ONESEC_BRIDGED_BALANCE_WARNING)).not.toBeInTheDocument();
	});

	it('renders when the user holds a bridged token', () => {
		mockHeld([wrappedIcpOnBase]);

		const { getByTestId } = render(OneSecBridgedBalanceWarning);

		expect(getByTestId(ONESEC_BRIDGED_BALANCE_WARNING)).toBeInTheDocument();
	});

	it('names the held token qualified by its network, so it is not read as the native one', () => {
		mockHeld([wrappedIcpOnBase]);

		const { getByTestId } = render(OneSecBridgedBalanceWarning);

		expect(getByTestId(ONESEC_BRIDGED_BALANCE_WARNING)).toHaveTextContent(
			replacePlaceholders(en.tokens.warning.onesec_bridged_balance, {
				$token_list: `ICP (${BASE_NETWORK.name})`
			})
		);
	});

	it('joins several held tokens into one localized list', () => {
		mockHeld([wrappedIcpOnBase, wrappedBobOnEthereum]);

		const { getByTestId } = render(OneSecBridgedBalanceWarning);

		expect(getByTestId(ONESEC_BRIDGED_BALANCE_WARNING)).toHaveTextContent(
			replacePlaceholders(en.tokens.warning.onesec_bridged_balance, {
				$token_list: formatList({
					items: [`ICP (${BASE_NETWORK.name})`, `BOB (${ETHEREUM_NETWORK.name})`],
					language: Languages.ENGLISH
				})
			})
		);
	});

	it('stays dismissed for the session once closed', async () => {
		mockHeld([wrappedIcpOnBase]);

		const { getByTestId, queryByTestId, getByRole } = render(OneSecBridgedBalanceWarning);

		expect(getByTestId(ONESEC_BRIDGED_BALANCE_WARNING)).toBeInTheDocument();

		await fireEvent.click(getByRole('button'));

		expect(queryByTestId(ONESEC_BRIDGED_BALANCE_WARNING)).not.toBeInTheDocument();
	});
});
