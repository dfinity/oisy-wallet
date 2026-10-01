import en from '$tests/mocks/i18n.mock';
import XrpAddTokenForm from '$xrp/components/tokens/XrpAddTokenForm.svelte';
import { fireEvent, render } from '@testing-library/svelte';

describe('XrpAddTokenForm', () => {
	it('asks for the issuer and the currency code', () => {
		const { getByPlaceholderText, getByText } = render(XrpAddTokenForm);

		expect(getByText(`${en.tokens.import.text.xrp_issuer}:`)).toBeInTheDocument();
		expect(getByText(`${en.tokens.import.text.xrp_currency_code}:`)).toBeInTheDocument();
		expect(getByPlaceholderText(en.tokens.placeholder.enter_xrp_issuer)).toBeInTheDocument();
		expect(getByPlaceholderText(en.tokens.placeholder.enter_xrp_currency_code)).toBeInTheDocument();
	});

	it('shows the values it is given', () => {
		const { getByPlaceholderText } = render(XrpAddTokenForm, {
			props: { issuer: 'rIssuer', currency: 'USD' }
		});

		expect(getByPlaceholderText(en.tokens.placeholder.enter_xrp_issuer)).toHaveValue('rIssuer');
		expect(getByPlaceholderText(en.tokens.placeholder.enter_xrp_currency_code)).toHaveValue('USD');
	});

	it('accepts what is typed', async () => {
		const { getByPlaceholderText } = render(XrpAddTokenForm);

		const currency = getByPlaceholderText(en.tokens.placeholder.enter_xrp_currency_code);
		await fireEvent.input(currency, { target: { value: 'RLUSD' } });

		expect(currency).toHaveValue('RLUSD');
	});
});
