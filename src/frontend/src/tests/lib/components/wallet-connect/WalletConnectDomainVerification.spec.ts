import WalletConnectDomainVerification from '$lib/components/wallet-connect/WalletConnectDomainVerification.svelte';
import en from '$tests/mocks/i18n.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { render } from '@testing-library/svelte';
import type { Verify } from '@walletconnect/types';

describe('WalletConnectDomainVerification', () => {
	const proposal = (
		verified: Pick<Verify.Context['verified'], 'validation' | 'isScam'>
	): WalletKitTypes.SessionProposal =>
		({
			id: 1,
			params: {},
			verifyContext: {
				verified: {
					verifyUrl: 'https://verify.walletconnect.org',
					origin: 'https://dapp.example',
					...verified
				}
			}
		}) as WalletKitTypes.SessionProposal;

	const {
		valid,
		valid_description,
		invalid,
		invalid_description,
		security_risk,
		security_risk_description,
		unknown,
		unknown_description
	} = en.wallet_connect.domain;

	it.each([
		{ validation: 'VALID', isScam: false, label: valid, description: valid_description },
		{ validation: 'VALID', isScam: undefined, label: valid, description: valid_description },
		{ validation: 'INVALID', isScam: false, label: invalid, description: invalid_description },
		{ validation: 'UNKNOWN', isScam: false, label: unknown, description: unknown_description }
	] as const)(
		'shows $label when the domain validation is $validation and isScam is $isScam',
		({ validation, isScam, label, description }) => {
			const { getByText } = render(WalletConnectDomainVerification, {
				props: { proposal: proposal({ validation, isScam }) }
			});

			expect(getByText(`${en.wallet_connect.domain.title}: ${label}`)).toBeInTheDocument();
			expect(getByText(description)).toBeInTheDocument();
		}
	);

	// A flagged site served from its own domain still validates, so the flag alone decides.
	it.each(['VALID', 'INVALID', 'UNKNOWN'] as const)(
		'shows the security risk when Verify flags the proposer as a scam and the domain validation is %s',
		(validation) => {
			const { getByText, queryByText } = render(WalletConnectDomainVerification, {
				props: { proposal: proposal({ validation, isScam: true }) }
			});

			expect(getByText(`${en.wallet_connect.domain.title}: ${security_risk}`)).toBeInTheDocument();
			expect(getByText(security_risk_description)).toBeInTheDocument();

			expect(queryByText(valid_description)).not.toBeInTheDocument();
			expect(queryByText(invalid_description)).not.toBeInTheDocument();
			expect(queryByText(unknown_description)).not.toBeInTheDocument();
		}
	);

	it('shows the domain as unknown without a proposal', () => {
		const { getByText } = render(WalletConnectDomainVerification, {
			props: { proposal: undefined }
		});

		expect(getByText(`${en.wallet_connect.domain.title}: ${unknown}`)).toBeInTheDocument();
		expect(getByText(unknown_description)).toBeInTheDocument();
	});
});
