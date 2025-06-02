import * as env from '$env/dapp-descriptions.env';
import DappsExplorerSignedIn from '$lib/components/dapps/DappsExplorerSignedIn.svelte';
import { TRACK_COUNT_DAPP_OPEN_INFO_MODAL } from '$lib/constants/analytics.contants';
import * as analytics from '$lib/services/analytics.services';
import { mockDappsDescriptions } from '$tests/mocks/dapps.mock';
import { nonNullish } from '@dfinity/utils';
import { fireEvent, render, screen } from '@testing-library/svelte';

describe('DappsExplorerSignedIn', () => {
	it('calls trackEvent when a DappCard is clicked', async () => {
		vi.spyOn(env, 'dAppDescriptions', 'get').mockReturnValue(mockDappsDescriptions);

		const trackEventSpy = vi.spyOn(analytics, 'trackEvent');

		render(DappsExplorerSignedIn);

		const button = screen
			.getAllByRole('button')
			.find((btn) => btn.getAttribute('aria-label')?.toLowerCase().includes('kongswap'));

		expect(button).toBeTruthy();

		if (nonNullish(button)) {
			await fireEvent.click(button);

			expect(trackEventSpy).toHaveBeenCalledWith({
				name: TRACK_COUNT_DAPP_OPEN_INFO_MODAL,
				metadata: { dappId: 'kongswap' }
			});
		}
	});
});
