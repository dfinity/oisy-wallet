import PlugImportForm from '$lib/components/plug-import/PlugImportForm.svelte';
import {
	PLUG_IMPORT_ACCOUNTS_INPUT,
	PLUG_IMPORT_PHRASE_INPUT,
	PLUG_IMPORT_RESET_BUTTON,
	PLUG_IMPORT_SUBMIT_BUTTON
} from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { fireEvent } from '@testing-library/dom';
import { render } from '@testing-library/svelte';

const VALID_PHRASE = 'two dismiss express kingdom ceiling tape media maid unveil horn tell basket';

describe('PlugImportForm', () => {
	const props = () => ({
		phrase: '',
		depth: 1,
		onsubmit: vi.fn(),
		onreset: vi.fn()
	});

	it('renders the phrase and account inputs', () => {
		const { getByTestId, getByText } = render(PlugImportForm, props());

		expect(getByText(en.plug_import.text.phrase_label)).toBeInTheDocument();
		expect(getByText(en.plug_import.text.accounts_label)).toBeInTheDocument();
		expect(getByTestId(PLUG_IMPORT_PHRASE_INPUT)).toBeInTheDocument();
		expect(getByTestId(PLUG_IMPORT_ACCOUNTS_INPUT)).toBeInTheDocument();
	});

	it('keeps the phrase input out of reach of autofill', () => {
		const { getByTestId } = render(PlugImportForm, props());

		const input = getByTestId(PLUG_IMPORT_PHRASE_INPUT);

		expect(input).toHaveAttribute('autocomplete', 'off');
		expect(input).toHaveAttribute('autocapitalize', 'off');
		expect(input).toHaveAttribute('spellcheck', 'false');
	});

	it('disables submit while the phrase is empty', () => {
		const { getByTestId } = render(PlugImportForm, props());

		expect(getByTestId(PLUG_IMPORT_SUBMIT_BUTTON)).toBeDisabled();
	});

	it('disables submit for a phrase that fails the checksum', () => {
		const [, ...rest] = VALID_PHRASE.split(' ');

		const { getByTestId } = render(PlugImportForm, {
			...props(),
			phrase: ['abandon', ...rest].join(' ')
		});

		expect(getByTestId(PLUG_IMPORT_SUBMIT_BUTTON)).toBeDisabled();
	});

	it('enables submit for a valid phrase', () => {
		const { getByTestId } = render(PlugImportForm, { ...props(), phrase: VALID_PHRASE });

		expect(getByTestId(PLUG_IMPORT_SUBMIT_BUTTON)).not.toBeDisabled();
	});

	it('disables submit while loading even with a valid phrase', () => {
		const { getByTestId } = render(PlugImportForm, {
			...props(),
			phrase: VALID_PHRASE,
			loading: true
		});

		expect(getByTestId(PLUG_IMPORT_SUBMIT_BUTTON)).toBeDisabled();
	});

	it('calls onsubmit when the form is submitted with a valid phrase', async () => {
		const onsubmit = vi.fn();

		const { getByTestId } = render(PlugImportForm, {
			...props(),
			phrase: VALID_PHRASE,
			onsubmit
		});

		await fireEvent.click(getByTestId(PLUG_IMPORT_SUBMIT_BUTTON));

		expect(onsubmit).toHaveBeenCalledOnce();
	});

	it('calls onreset when reset is clicked', async () => {
		const onreset = vi.fn();

		const { getByTestId } = render(PlugImportForm, { ...props(), onreset });

		await fireEvent.click(getByTestId(PLUG_IMPORT_RESET_BUTTON));

		expect(onreset).toHaveBeenCalledOnce();
	});
});
