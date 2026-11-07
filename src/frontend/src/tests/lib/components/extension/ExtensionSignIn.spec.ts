import ExtensionSignIn from '$lib/components/extension/ExtensionSignIn.svelte';
import SignerSignIn from '$lib/components/signer/SignerSignIn.svelte';
import { LOGIN_BUTTON } from '$lib/constants/test-ids.constants';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('ExtensionSignIn', () => {
	// The pulsing ring is what makes `SignerAnimatedAstronaut` a second blue logo.
	const astronautSelector = '.animate-ping';

	it('should render the heading and the sentence under it', () => {
		const { getByRole, getByText } = render(ExtensionSignIn);

		expect(
			getByRole('heading', {
				name: replaceOisyPlaceholders(en.signer.sign_in.text.connect_your_wallet)
			})
		).toBeInTheDocument();
		expect(getByText(en.signer.sign_in.text.open_or_create)).toBeInTheDocument();
	});

	it('should render the Internet Identity button', () => {
		const { container } = render(ExtensionSignIn);

		const button = container.querySelector<HTMLButtonElement>(`button[data-tid="${LOGIN_BUTTON}"]`);

		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent(en.auth.text.internet_identity);
	});

	it('should not render the "OISY protects you" note', () => {
		const { container, queryByText } = render(ExtensionSignIn);

		expect(container).not.toHaveTextContent(
			replaceOisyPlaceholders(en.core.text.oisy_protects_you)
		);
		expect(container).not.toHaveTextContent(en.signer.sign_in.text.oisy_protects_you_description);
		expect(queryByText(en.core.text.learn_more)).not.toBeInTheDocument();
	});

	it('should not render the animated astronaut', () => {
		// The ICRC signer's sign-in still shows it, which proves the selector finds it.
		const { container: signerContainer } = render(SignerSignIn);

		expect(signerContainer.querySelector(astronautSelector)).toBeInTheDocument();

		const { container } = render(ExtensionSignIn);

		expect(container.querySelector(astronautSelector)).not.toBeInTheDocument();
	});
});
