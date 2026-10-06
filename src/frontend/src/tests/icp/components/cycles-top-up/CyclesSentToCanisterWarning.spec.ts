import * as cyclesTopUpEnv from '$env/cycles-top-up.env';
import CyclesSentToCanisterWarning from '$icp/components/cycles-top-up/CyclesSentToCanisterWarning.svelte';
import { CYCLES_SENT_TO_CANISTER_WARNING } from '$lib/constants/test-ids.constants';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockTcyclesToken } from '$tests/mocks/cycles-mint.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { Principal } from '@icp-sdk/core/principal';
import { render } from '@testing-library/svelte';

describe('CyclesSentToCanisterWarning', () => {
	const canister = 'ywcsb-maaaa-aaaai-q6k7a-cai';

	const warning = replacePlaceholders(en.cycles_top_up.text.sent_to_canister, {
		$token: 'TCYCLES'
	});

	const topUpHint = replacePlaceholders(en.cycles_top_up.text.sent_to_canister_top_up, {
		$token: 'TCYCLES'
	});

	const enableTopUp = (enabled: boolean) =>
		vi.spyOn(cyclesTopUpEnv, 'CYCLES_TOP_UP_ENABLED', 'get').mockReturnValue(enabled);

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('should warn about TCYCLES sent to a canister and point to Top up', () => {
		enableTopUp(true);

		const { getByTestId } = render(CyclesSentToCanisterWarning, {
			props: { destination: canister, token: mockTcyclesToken }
		});

		expect(getByTestId(CYCLES_SENT_TO_CANISTER_WARNING)).toHaveTextContent(warning);
		expect(getByTestId(CYCLES_SENT_TO_CANISTER_WARNING)).toHaveTextContent(topUpHint);
	});

	it('should leave out the pointer to Top up while its flag is off', () => {
		enableTopUp(false);

		const { getByTestId } = render(CyclesSentToCanisterWarning, {
			props: { destination: canister, token: mockTcyclesToken }
		});

		expect(getByTestId(CYCLES_SENT_TO_CANISTER_WARNING)).toHaveTextContent(warning);
		expect(getByTestId(CYCLES_SENT_TO_CANISTER_WARNING)).not.toHaveTextContent(topUpHint);
	});

	it('should warn about a canister account with a subaccount', () => {
		const { getByTestId } = render(CyclesSentToCanisterWarning, {
			props: {
				destination: encodeIcrcAccount({
					owner: Principal.fromText(canister),
					subaccount: new Uint8Array(32).fill(1)
				}),
				token: mockTcyclesToken
			}
		});

		expect(getByTestId(CYCLES_SENT_TO_CANISTER_WARNING)).toBeInTheDocument();
	});

	it('should not warn about TCYCLES sent to a user', () => {
		const { queryByTestId } = render(CyclesSentToCanisterWarning, {
			props: { destination: mockPrincipalText, token: mockTcyclesToken }
		});

		expect(queryByTestId(CYCLES_SENT_TO_CANISTER_WARNING)).toBeNull();
	});

	it('should not warn about another token sent to a canister', () => {
		const { queryByTestId } = render(CyclesSentToCanisterWarning, {
			props: { destination: canister, token: mockValidIcrcToken }
		});

		expect(queryByTestId(CYCLES_SENT_TO_CANISTER_WARNING)).toBeNull();
	});
});
