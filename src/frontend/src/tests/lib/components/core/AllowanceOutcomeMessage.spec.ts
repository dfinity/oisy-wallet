import AllowanceOutcomeMessage from '$lib/components/core/AllowanceOutcomeMessage.svelte';
import type { InsufficientAllowanceOutcome } from '$lib/utils/allowance.utils';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('AllowanceOutcomeMessage', () => {
	it.each<{ outcome: InsufficientAllowanceOutcome; message: string }>([
		{ outcome: 'renewed', message: en.core.info.oisy_allowance_renewed },
		{ outcome: 'refused', message: en.core.warning.oisy_allowance_used_up },
		{ outcome: 'exceeded', message: en.core.warning.oisy_allowance_exceeded }
	])('should name the outcome $outcome', ({ outcome, message }) => {
		const { getByText } = render(AllowanceOutcomeMessage, { props: { outcome } });

		expect(getByText(replaceOisyPlaceholders(message))).toBeInTheDocument();
	});
});
