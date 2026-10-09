import WalletConnectScamWarning from '$lib/components/wallet-connect/WalletConnectScamWarning.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('WalletConnectScamWarning', () => {
	it('names the security risk and says the site is flagged as unsafe', () => {
		const { getByTestId } = render(WalletConnectScamWarning);

		const warning = getByTestId('wallet-connect-scam-warning');

		expect(warning).toHaveTextContent(en.wallet_connect.domain.security_risk);
		expect(warning).toHaveTextContent(en.wallet_connect.domain.security_risk_description);
	});
});
