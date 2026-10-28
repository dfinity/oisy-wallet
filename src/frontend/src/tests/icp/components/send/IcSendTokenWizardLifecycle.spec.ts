import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import * as icSendServices from '$icp/services/ic-send.services';
import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
import { MobileSendSessionExpiredError } from '$icp/types/ic-send';
import * as mobile from '$lib/constants/mobile.constants';
import {
	IN_PROGRESS_MODAL,
	REVIEW_FORM_SEND_BUTTON,
	SEND_FIRST_TIME_DESTINATION_CONFIRM
} from '$lib/constants/test-ids.constants';
import * as authDerived from '$lib/derived/auth.derived';
import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
import * as analytics from '$lib/services/analytics.services';
import { idleSignOut } from '$lib/services/auth.services';
import { balancesStore } from '$lib/stores/balances.store';
import { modalStore } from '$lib/stores/modal.store';
import * as toasts from '$lib/stores/toasts.store';
import IcSendModalTestHost from '$tests/icp/components/send/IcSendModalTestHost.svelte';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { runResolvedPromises } from '$tests/utils/timers.test-utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { readable } from 'svelte/store';

vi.mock('$lib/services/auth.services', () => ({ idleSignOut: vi.fn() }));

describe('ICP Send in the real modal and transition hierarchy', () => {
	const close = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(mobile, 'MOBILE_SHELL', 'get').mockReturnValue(true);
		vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(readable(mockIdentity));
		vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
		vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));
		isIcMintingAccount.set(false);
		balancesStore.set({
			id: ICP_TOKEN.id,
			data: { data: 100_000_000n, certified: true }
		});
		modalStore.openSend({ id: Symbol('send-lifecycle') });
	});

	afterEach(() => {
		modalStore.close();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	const startSend = async () => {
		const view = render(IcSendModalTestHost, { onClose: close });
		await waitFor(() => expect(view.getByTestId(REVIEW_FORM_SEND_BUTTON)).toBeDisabled());
		await fireEvent.click(view.getByTestId(SEND_FIRST_TIME_DESTINATION_CONFIRM));
		await fireEvent.click(view.getByTestId(REVIEW_FORM_SEND_BUTTON));
		await waitFor(() => expect(view.getByTestId(IN_PROGRESS_MODAL)).toBeInTheDocument());

		expect(view.queryByTestId(REVIEW_FORM_SEND_BUTTON)).not.toBeInTheDocument();
		expect(icSendServices.sendIc).toHaveBeenCalledOnce();

		return view;
	};

	it.each([false, true])(
		'completes and closes after the real step transition and token refresh (mobile: %s)',
		async (isMobile) => {
			vi.spyOn(mobile, 'MOBILE_SHELL', 'get').mockReturnValue(isMobile);
			const pending = Promise.withResolvers<undefined>();
			vi.spyOn(icSendServices, 'sendIc').mockReturnValue(pending.promise);
			const view = await startSend();

			balancesStore.set({
				id: ICP_TOKEN.id,
				data: { data: 99_740_000n, certified: true }
			});
			await view.rerender({ token: { ...ICP_TOKEN }, onClose: close });

			expect(view.getByTestId(IN_PROGRESS_MODAL)).toBeInTheDocument();
			expect(icSendServices.sendIc).toHaveBeenCalledOnce();

			vi.useFakeTimers();
			pending.resolve(undefined);
			await runResolvedPromises();
			await tick();

			expect(view.getByTestId('send-lifecycle-progress')).toHaveTextContent(
				ProgressStepsSendIc.DONE
			);
			expect(close).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(750);

			expect(close).toHaveBeenCalledOnce();
		}
	);

	it('handles a mobile session rejection after the real review component has disappeared', async () => {
		const pending = Promise.withResolvers<undefined>();
		vi.spyOn(icSendServices, 'sendIc').mockReturnValue(pending.promise);
		await startSend();
		pending.reject(new MobileSendSessionExpiredError());
		await runResolvedPromises();

		expect(idleSignOut).toHaveBeenCalledOnce();
		expect(close).not.toHaveBeenCalled();
		expect(toasts.toastsError).not.toHaveBeenCalled();
	});

	it('closes an uncertain mobile result after the real transition without reopening review', async () => {
		const pending = Promise.withResolvers<undefined>();
		vi.spyOn(icSendServices, 'sendIc').mockReturnValue(pending.promise);
		const view = await startSend();
		pending.reject(new Error('Transport lost'));
		await runResolvedPromises();
		await tick();

		expect(close).toHaveBeenCalledOnce();
		expect(toasts.toastsError).toHaveBeenCalledWith({
			msg: { text: en.send.error.mobile_unconfirmed }
		});
		expect(view.queryByTestId(REVIEW_FORM_SEND_BUTTON)).not.toBeInTheDocument();
		expect(icSendServices.sendIc).toHaveBeenCalledOnce();
	});
});
