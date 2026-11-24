import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import ConvertReview from '$lib/components/convert/ConvertReview.svelte';
import { CONVERT_CONTEXT_KEY, initConvertContext } from '$lib/stores/convert.store';
import type { InsufficientAllowanceOutcome } from '$lib/utils/allowance.utils';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('ConvertReview', () => {
	const props = {
		sendAmount: 1,
		receiveAmount: 1,
		onConvert: vi.fn(),
		fee: createMockSnippet('fee'),
		cancel: createMockSnippet('cancel')
	};

	const contextWithOutcome = (outcome?: InsufficientAllowanceOutcome) => {
		const convertContext = initConvertContext({
			sourceToken: BTC_MAINNET_TOKEN,
			destinationToken: mockValidIcCkToken
		});
		convertContext.convertAllowanceOutcome.set(outcome);

		return new Map<symbol, unknown>([[CONVERT_CONTEXT_KEY, convertContext]]);
	};

	const convertButton = (getByTestId: (id: string) => HTMLElement) =>
		getByTestId('convert-review-button-next');

	it('shows no allowance message and keeps Convert enabled without an outcome', () => {
		const { getByTestId, queryByText } = render(ConvertReview, {
			props,
			context: contextWithOutcome()
		});

		expect(
			queryByText(replaceOisyPlaceholders(en.core.warning.oisy_allowance_used_up))
		).not.toBeInTheDocument();
		expect(convertButton(getByTestId)).toBeEnabled();
	});

	it('says to try again, and keeps Convert enabled, when the allowance was renewed', () => {
		const { getByTestId, getByText } = render(ConvertReview, {
			props,
			context: contextWithOutcome('renewed')
		});

		expect(
			getByText(replaceOisyPlaceholders(en.core.info.oisy_allowance_renewed))
		).toBeInTheDocument();
		expect(convertButton(getByTestId)).toBeEnabled();
	});

	it.each<{ outcome: InsufficientAllowanceOutcome; message: string }>([
		{ outcome: 'refused', message: en.core.warning.oisy_allowance_used_up },
		{ outcome: 'exceeded', message: en.core.warning.oisy_allowance_exceeded }
	])('says why, and disables Convert, when the outcome is $outcome', ({ outcome, message }) => {
		const { getByTestId, getByText } = render(ConvertReview, {
			props,
			context: contextWithOutcome(outcome)
		});

		expect(getByText(replaceOisyPlaceholders(message))).toBeInTheDocument();
		expect(convertButton(getByTestId)).toBeDisabled();
	});
});
