import AuthHelpOtherForm from '$lib/components/auth/AuthHelpOtherForm.svelte';
import {
	OISY_ACCESS_CONTROL_URL,
	OISY_DOCS_URL,
	OISY_FAQ_URL,
	OISY_INTERNET_IDENTITY_URL
} from '$lib/constants/oisy.constants';
import {
	HELP_AUTH_ASSET_CONTROL_LINK,
	HELP_AUTH_BACK_BUTTON,
	HELP_AUTH_DOCS_LINK,
	HELP_AUTH_DONE_BUTTON,
	HELP_AUTH_INTRODUCTION_LINK,
	HELP_AUTH_PRIVATE_KEY_LINK
} from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('AuthHelpOtherForm', () => {
	const introductionAnchorSelector = `a[data-tid="${HELP_AUTH_INTRODUCTION_LINK}"]`;
	const docsAnchorSelector = `a[data-tid="${HELP_AUTH_DOCS_LINK}"]`;
	const privateKeyAnchorSelector = `a[data-tid="${HELP_AUTH_PRIVATE_KEY_LINK}"]`;
	const assetControlAnchorSelector = `a[data-tid="${HELP_AUTH_ASSET_CONTROL_LINK}"]`;
	const backButtonSelector = `button[data-tid="${HELP_AUTH_BACK_BUTTON}"]`;
	const doneButtonSelector = `button[data-tid="${HELP_AUTH_DONE_BUTTON}"]`;

	it('should render auth help other form content', () => {
		const { container, getByText } = render(AuthHelpOtherForm, {
			props: {
				onBack: vi.fn(),
				onDone: vi.fn()
			}
		});

		expect(getByText(get(i18n).auth.help.text.other_title)).toBeInTheDocument();

		const introductionAnchor: HTMLAnchorElement | null = container.querySelector(
			introductionAnchorSelector
		);

		expect(introductionAnchor).toBeInTheDocument();
		expect(introductionAnchor?.href).toBe(`${OISY_DOCS_URL}/`);
		expect(
			getByText(replaceOisyPlaceholders(get(i18n).auth.help.text.other_introduction))
		).toBeInTheDocument();

		const docsAnchor: HTMLAnchorElement | null = container.querySelector(docsAnchorSelector);

		expect(docsAnchor).toBeInTheDocument();
		expect(docsAnchor?.href).toBe(OISY_INTERNET_IDENTITY_URL);
		expect(
			getByText(replaceOisyPlaceholders(get(i18n).auth.help.text.other_docs))
		).toBeInTheDocument();

		const privateKeyAnchor: HTMLAnchorElement | null =
			container.querySelector(privateKeyAnchorSelector);

		expect(privateKeyAnchor).toBeInTheDocument();
		expect(privateKeyAnchor?.href).toBe(OISY_FAQ_URL);
		expect(
			getByText(replaceOisyPlaceholders(get(i18n).auth.help.text.other_private_key))
		).toBeInTheDocument();

		const assetControlAnchor: HTMLAnchorElement | null = container.querySelector(
			assetControlAnchorSelector
		);

		expect(assetControlAnchor).toBeInTheDocument();
		expect(assetControlAnchor?.href).toBe(OISY_ACCESS_CONTROL_URL);
		expect(
			getByText(replaceOisyPlaceholders(get(i18n).auth.help.text.other_asset_control))
		).toBeInTheDocument();

		const backButton: HTMLButtonElement | null = container.querySelector(backButtonSelector);

		expect(backButton).toBeInTheDocument();

		const doneButton: HTMLButtonElement | null = container.querySelector(doneButtonSelector);

		expect(doneButton).toBeInTheDocument();
	});

	it('should call correct function on button click', async () => {
		const onBackMock = vi.fn();
		const onDoneMock = vi.fn();

		const { container } = render(AuthHelpOtherForm, {
			props: {
				onBack: onBackMock,
				onDone: onDoneMock
			}
		});

		expect(onBackMock).not.toHaveBeenCalled();
		expect(onDoneMock).not.toHaveBeenCalled();

		const backButton: HTMLButtonElement | null = container.querySelector(backButtonSelector);

		expect(backButton).toBeInTheDocument();

		await waitFor(() => {
			backButton?.click();

			expect(onBackMock).toHaveBeenCalledOnce();
		});

		const doneButton: HTMLButtonElement | null = container.querySelector(doneButtonSelector);

		expect(doneButton).toBeInTheDocument();

		await waitFor(() => {
			doneButton?.click();

			expect(onDoneMock).toHaveBeenCalledOnce();
		});
	});
});
