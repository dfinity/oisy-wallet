import PayDialog from '$lib/components/pay/PayDialog.svelte';
import {
	PAY_DIALOG,
	PAY_DIALOG_BANNER,
	PAY_DIALOG_PAY_BUTTON
} from '$lib/constants/test-ids.constants';
import { modalStore } from '$lib/stores/modal.store';
import { screensStore } from '$lib/stores/screens.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { notEmptyString } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

describe('PayDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		screensStore.set('md');

		vi.spyOn(modalStore, 'openUniversalScanner').mockImplementation(vi.fn());
	});

	it('should render the dialog', async () => {
		const { getByTestId } = render(PayDialog);

		expect(getByTestId(PAY_DIALOG)).toBeInTheDocument();

		screensStore.set('xl');

		await tick();

		expect(getByTestId(PAY_DIALOG)).toBeInTheDocument();

		screensStore.set('xs');

		await tick();

		expect(getByTestId(PAY_DIALOG)).toBeInTheDocument();
	});

	it('should render the title', () => {
		const { getByText } = render(PayDialog);

		expect(getByText(replaceOisyPlaceholders(en.pay.text.dialog_title))).toBeInTheDocument();
	});

	it('should render the banner', () => {
		const { getByTestId } = render(PayDialog);

		expect(getByTestId(PAY_DIALOG_BANNER)).toBeInTheDocument();
	});

	it('should render the description', () => {
		const { getByText } = render(PayDialog);

		const [text] = replaceOisyPlaceholders(en.pay.text.dialog_description).split('<span');

		expect(notEmptyString(text)).toBeTruthy();

		expect(getByText(text.trim(), { exact: false })).toBeInTheDocument();
	});

	it('should render the button', () => {
		const { getByTestId } = render(PayDialog);

		expect(getByTestId(PAY_DIALOG_PAY_BUTTON)).toBeInTheDocument();
	});

	it('should open the scanner modal when the button is clicked', () => {
		const { getByTestId } = render(PayDialog);

		const button = getByTestId(PAY_DIALOG_PAY_BUTTON) as HTMLButtonElement;

		expect(button).toBeInTheDocument();

		button.click();

		expect(modalStore.openUniversalScanner).toHaveBeenCalledExactlyOnceWith(expect.any(Symbol));
	});
});
