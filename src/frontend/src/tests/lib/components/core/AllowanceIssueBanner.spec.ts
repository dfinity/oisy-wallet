import AllowanceIssueBanner from '$lib/components/core/AllowanceIssueBanner.svelte';
import { ALLOWANCE_REQUEST_COOLDOWN_MILLIS } from '$lib/constants/app.constants';
import {
	ALLOWANCE_ISSUE_BANNER,
	ALLOWANCE_ISSUE_BANNER_RETRY_BUTTON
} from '$lib/constants/test-ids.constants';
import { requestAllowance } from '$lib/services/allowance-request.services';
import { allowanceIssueStore } from '$lib/stores/allowance-issue.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';

vi.mock('$lib/services/allowance-request.services', () => ({
	requestAllowance: vi.fn()
}));

describe('AllowanceIssueBanner', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		mockAuthStore(mockIdentity);

		allowanceIssueStore.clear();

		vi.mocked(requestAllowance).mockResolvedValue({ answer: 'refused' });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should not render while no allowance issue is set', () => {
		const { queryByTestId } = render(AllowanceIssueBanner);

		expect(queryByTestId(ALLOWANCE_ISSUE_BANNER)).not.toBeInTheDocument();
	});

	it('should render the message while an allowance issue is set', () => {
		allowanceIssueStore.setRefused();

		const { getByTestId, getByText } = render(AllowanceIssueBanner);

		expect(getByTestId(ALLOWANCE_ISSUE_BANNER)).toBeInTheDocument();
		expect(
			getByText(replaceOisyPlaceholders(en.core.info.oisy_allowance_limited))
		).toBeInTheDocument();
	});

	it('should offer no close button', () => {
		allowanceIssueStore.setRefused();

		const { getAllByRole } = render(AllowanceIssueBanner);

		expect(getAllByRole('button')).toHaveLength(1);
	});

	it('should disable Retry during the cooldown and enable it afterwards', async () => {
		allowanceIssueStore.setRefused();

		const { getByTestId } = render(AllowanceIssueBanner);

		expect(getByTestId(ALLOWANCE_ISSUE_BANNER_RETRY_BUTTON)).toBeDisabled();

		vi.advanceTimersByTime(ALLOWANCE_REQUEST_COOLDOWN_MILLIS);
		await tick();

		expect(getByTestId(ALLOWANCE_ISSUE_BANNER_RETRY_BUTTON)).toBeEnabled();
	});

	it('should send an allowance request on Retry', async () => {
		allowanceIssueStore.setRefused();

		const { getByTestId } = render(AllowanceIssueBanner);

		vi.advanceTimersByTime(ALLOWANCE_REQUEST_COOLDOWN_MILLIS);
		await tick();

		await fireEvent.click(getByTestId(ALLOWANCE_ISSUE_BANNER_RETRY_BUTTON));

		expect(requestAllowance).toHaveBeenCalledExactlyOnceWith(mockIdentity);
	});

	it('should disappear once the allowance issue is cleared', async () => {
		allowanceIssueStore.setRefused();

		const { queryByTestId } = render(AllowanceIssueBanner);

		allowanceIssueStore.clear();
		await tick();

		expect(queryByTestId(ALLOWANCE_ISSUE_BANNER)).not.toBeInTheDocument();
	});
});
