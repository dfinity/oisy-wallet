import CyclesSendOrTopUp from '$icp/components/cycles-top-up/CyclesSendOrTopUp.svelte';
import {
	CYCLES_SEND_OR_TOP_UP_SEND_BUTTON,
	CYCLES_SEND_OR_TOP_UP_TOP_UP_BUTTON
} from '$lib/constants/test-ids.constants';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockTcyclesToken } from '$tests/mocks/cycles-mint.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('CyclesSendOrTopUp', () => {
	const renderStep = (formCancelAction?: 'back' | 'close') => {
		const callbacks = {
			onSend: vi.fn(),
			onTopUp: vi.fn(),
			onBack: vi.fn(),
			onClose: vi.fn()
		};

		const result = render(CyclesSendOrTopUp, {
			props: { token: mockTcyclesToken, formCancelAction, ...callbacks }
		});

		return { ...result, ...callbacks };
	};

	it('offers to send the token or to top up a canister', () => {
		const { container } = renderStep();

		const placeholders = { $token: mockTcyclesToken.symbol };

		expect(container).toHaveTextContent(
			replacePlaceholders(en.cycles_top_up.text.choice_send, placeholders)
		);
		expect(container).toHaveTextContent(
			replacePlaceholders(en.cycles_top_up.text.choice_send_description, placeholders)
		);
		expect(container).toHaveTextContent(en.cycles_top_up.text.title);
		expect(container).toHaveTextContent(
			replacePlaceholders(en.cycles_top_up.text.choice_top_up_description, placeholders)
		);
	});

	it('goes on with the send', async () => {
		const { getByTestId, onSend, onTopUp } = renderStep();

		await fireEvent.click(getByTestId(CYCLES_SEND_OR_TOP_UP_SEND_BUTTON));

		expect(onSend).toHaveBeenCalledOnce();
		expect(onTopUp).not.toHaveBeenCalled();
	});

	it('goes on with the top-up', async () => {
		const { getByTestId, onSend, onTopUp } = renderStep();

		await fireEvent.click(getByTestId(CYCLES_SEND_OR_TOP_UP_TOP_UP_BUTTON));

		expect(onTopUp).toHaveBeenCalledOnce();
		expect(onSend).not.toHaveBeenCalled();
	});

	it('goes back by default', async () => {
		const { getByText, queryByText, onBack, onClose } = renderStep();

		expect(queryByText(en.core.text.cancel)).not.toBeInTheDocument();

		await fireEvent.click(getByText(en.core.text.back));

		expect(onBack).toHaveBeenCalledOnce();
		expect(onClose).not.toHaveBeenCalled();
	});

	it('closes when nothing came before it', async () => {
		const { getByText, queryByText, onBack, onClose } = renderStep('close');

		expect(queryByText(en.core.text.back)).not.toBeInTheDocument();

		await fireEvent.click(getByText(en.core.text.cancel));

		expect(onClose).toHaveBeenCalledOnce();
		expect(onBack).not.toHaveBeenCalled();
	});
});
