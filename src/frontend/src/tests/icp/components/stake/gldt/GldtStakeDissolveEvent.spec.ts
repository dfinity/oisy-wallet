import { GLDT_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import GldtStakeDissolveEvent from '$icp/components/stake/gldt/GldtStakeDissolveEvent.svelte';
import type { IcToken } from '$icp/types/ic-token';
import type { TokenId } from '$lib/types/token';
import { formatTimestampToDaysDifference } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { stakePositionMockResponse } from '$tests/mocks/gldt_stake.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { render } from '@testing-library/svelte';

describe('GldtStakeDissolveEvent', () => {
	const gldtToken = {
		...mockIcrcCustomToken,
		id: Symbol('GLDT') as TokenId,
		standard: 'icrc',
		ledgerCanisterId: GLDT_LEDGER_CANISTER_ID,
		symbol: 'GLDT'
	} as IcToken;

	it('should display correct tag if event is unlocked', () => {
		const { getByText } = render(GldtStakeDissolveEvent, {
			props: { gldtToken, event: stakePositionMockResponse.dissolve_events[0] }
		});

		expect(getByText(en.stake.text.unlocked)).toBeInTheDocument();
	});

	it('should display correct tag if event is not unlocked', () => {
		const timestamp = BigInt(Date.now() + 100000000);

		const { getByText } = render(GldtStakeDissolveEvent, {
			props: {
				gldtToken,
				event: {
					...stakePositionMockResponse.dissolve_events[0],
					dissolved_date: timestamp
				}
			}
		});

		expect(
			getByText(
				replacePlaceholders(en.stake.text.unlocking_in, {
					$time: formatTimestampToDaysDifference({
						timestamp: Number(timestamp)
					})
				})
			)
		).toBeInTheDocument();
	});
});
