import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import KnownDestination from '$lib/components/send/KnownDestination.svelte';
import { MAX_DISPLAYED_KNOWN_DESTINATION_AMOUNTS } from '$lib/constants/app.constants';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { expect } from 'vitest';

describe('KnownDestination', () => {
	const props = {
		destination: mockBtcAddress,
		amounts: [
			{ value: 10000000n, token: BTC_MAINNET_TOKEN },
			{ value: 20000000n, token: BTC_MAINNET_TOKEN },
			{ value: 30000000n, token: BTC_MAINNET_TOKEN }
		]
	};

	it('renders all amounts if the array length is smaller than the max amount', () => {
		const { container } = render(KnownDestination, {
			props
		});

		props.amounts.forEach(({ value, token }) => {
			expect(container).toHaveTextContent(
				`${formatToken({
					value,
					unitName: BTC_MAINNET_TOKEN.decimals,
					displayDecimals: BTC_MAINNET_TOKEN.decimals
				})} ${token.symbol}`
			);
		});
	});

	it('renders all amounts and more label if the array length is greater than the max amount', () => {
		const newProps = {
			...props,
			amounts: [...props.amounts, ...props.amounts]
		};
		const { container } = render(KnownDestination, {
			props: newProps
		});

		props.amounts.forEach(({ value, token }) => {
			expect(container).toHaveTextContent(
				`${formatToken({
					value,
					unitName: BTC_MAINNET_TOKEN.decimals,
					displayDecimals: BTC_MAINNET_TOKEN.decimals
				})} ${token.symbol}`
			);
		});

		expect(container).toHaveTextContent(
			replacePlaceholders(en.core.text.more_items, {
				$items: `${newProps.amounts.length - MAX_DISPLAYED_KNOWN_DESTINATION_AMOUNTS}`
			})
		);
	});
});
