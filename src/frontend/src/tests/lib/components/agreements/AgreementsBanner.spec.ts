import AgreementsBanner from '$lib/components/agreements/AgreementsBanner.svelte';
import {
	AGREEMENTS_WARNING_BANNER,
	AGREEMENTS_WARNING_BANNER_CLOSE_BUTTON
} from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import type { formatUpdatedAgreementsHtml } from '$lib/utils/agreements-formatter.utils';
import * as agreementsFormatterUtils from '$lib/utils/agreements-formatter.utils';
import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('AgreementsBanner', () => {
	let formatterSpy: MockInstance<typeof formatUpdatedAgreementsHtml>;

	const props = {
		agreementsToAccept: {}
	};

	beforeEach(() => {
		vi.clearAllMocks();

		formatterSpy = vi.spyOn(agreementsFormatterUtils, 'formatUpdatedAgreementsHtml');
	});

	it('should not render a warning banner if there are no agreements to accept', () => {
		const { queryByTestId } = render(AgreementsBanner, { props });

		expect(queryByTestId(AGREEMENTS_WARNING_BANNER)).not.toBeInTheDocument();
	});

	it('should render a warning banner if there are agreements to accept', () => {
		const { getByTestId } = render(AgreementsBanner, {
			props: { ...props, agreementsToAccept: { licenseAgreement: true } }
		});

		expect(getByTestId(AGREEMENTS_WARNING_BANNER)).toBeInTheDocument();
	});

	it('should render the formatted agreements', () => {
		const agreementsToAccept = { licenseAgreement: true, privacyPolicy: true };

		render(AgreementsBanner, {
			props: { ...props, agreementsToAccept }
		});

		expect(formatterSpy).toHaveBeenCalledExactlyOnceWith({
			agreements: agreementsToAccept,
			i18n: get(i18n)
		});
	});

	it('should display the agreements warning', () => {
		formatterSpy.mockReturnValueOnce('formattedAgreements');

		const expected = replacePlaceholders(
			replaceOisyPlaceholders(en.agreements.text.updated_agreements_warning),
			{
				$agreements: 'formattedAgreements'
			}
		);

		const agreementsToAccept = { licenseAgreement: true, privacyPolicy: true };

		const { getByText } = render(AgreementsBanner, {
			props: { ...props, agreementsToAccept }
		});

		expect(getByText(expected)).toBeInTheDocument();
	});

	it('should not display the agreements warning if the formatter return an empty string', () => {
		formatterSpy.mockReturnValueOnce('');

		const expected = replacePlaceholders(
			replaceOisyPlaceholders(en.agreements.text.updated_agreements_warning),
			{
				$agreements: ''
			}
		);

		const agreementsToAccept = { licenseAgreement: true, privacyPolicy: true };

		const { queryByText } = render(AgreementsBanner, {
			props: { ...props, agreementsToAccept }
		});

		expect(queryByText(expected)).not.toBeInTheDocument();
	});

	it("should close the banner when the 'X' button is clicked", async () => {
		formatterSpy.mockReturnValueOnce('formattedAgreements');

		const expected = replacePlaceholders(
			replaceOisyPlaceholders(en.agreements.text.updated_agreements_warning),
			{
				$agreements: 'formattedAgreements'
			}
		);

		const agreementsToAccept = { licenseAgreement: true, privacyPolicy: true, termsOfUse: true };

		const { getByText, queryByText, getByTestId } = render(AgreementsBanner, {
			props: { ...props, agreementsToAccept }
		});

		expect(getByText(expected)).toBeInTheDocument();

		const closeButton = getByTestId(AGREEMENTS_WARNING_BANNER_CLOSE_BUTTON);

		expect(closeButton).toBeInTheDocument();

		await fireEvent.click(closeButton);

		expect(queryByText(expected)).not.toBeInTheDocument();
	});
});
