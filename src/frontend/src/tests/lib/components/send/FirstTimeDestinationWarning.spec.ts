import FirstTimeDestinationWarning from '$lib/components/send/FirstTimeDestinationWarning.svelte';
import {
	SEND_FIRST_TIME_DESTINATION_CONFIRM,
	SEND_FIRST_TIME_DESTINATION_WARNING
} from '$lib/constants/test-ids.constants';
import en from '$lib/i18n/en.json';
import { fireEvent, render } from '@testing-library/svelte';

describe('FirstTimeDestinationWarning', () => {
	it('warns that the address was never sent to', () => {
		const { getByTestId } = render(FirstTimeDestinationWarning);

		expect(getByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).toHaveTextContent(
			en.send.info.first_time_destination
		);
	});

	it('does not ask for a confirmation without a confirmation callback', () => {
		const { getByTestId, queryByTestId } = render(FirstTimeDestinationWarning);

		expect(queryByTestId(SEND_FIRST_TIME_DESTINATION_CONFIRM)).not.toBeInTheDocument();
		expect(getByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).not.toHaveTextContent(
			en.send.info.first_time_destination_confirm
		);
	});

	it('asks for a confirmation, unticked, when a confirmation callback is provided', () => {
		const { getByTestId } = render(FirstTimeDestinationWarning, {
			props: { onConfirm: vi.fn() }
		});

		expect(getByTestId(SEND_FIRST_TIME_DESTINATION_CONFIRM)).toBeInTheDocument();
		expect(getByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).toHaveTextContent(
			en.send.info.first_time_destination_confirm
		);
		expect(getByTestId('checkbox')).not.toBeChecked();
	});

	it('renders the confirmation as ticked when confirmed', () => {
		const { getByTestId } = render(FirstTimeDestinationWarning, {
			props: { confirmed: true, onConfirm: vi.fn() }
		});

		expect(getByTestId('checkbox')).toBeChecked();
	});

	it('calls the confirmation callback when the checkbox is clicked', async () => {
		const onConfirm = vi.fn();

		const { getByTestId } = render(FirstTimeDestinationWarning, { props: { onConfirm } });

		await fireEvent.click(getByTestId('checkbox'));

		expect(onConfirm).toHaveBeenCalledOnce();
	});
});
