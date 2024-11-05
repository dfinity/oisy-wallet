import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/networks.icrc.env';
import { balance } from '$icp/api/icrc-ledger.api';
import * as agent from '$lib/actors/agents.ic';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import type { HttpAgent } from '@dfinity/agent';
import { IcrcLedgerCanister, type IcrcAccount } from '@dfinity/ledger-icrc';
import { mock } from 'vitest-mock-extended';

describe('icrc-ledger.api', () => {
	const ledgerCanisterMock = mock<IcrcLedgerCanister>();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(IcrcLedgerCanister, 'create').mockImplementation(() => ledgerCanisterMock);
		vi.spyOn(agent, 'getAgent').mockResolvedValue(mock<HttpAgent>());
	});

	describe('balance', () => {
		it('successfully calls balance endpoint', async () => {
			const balanceE8s = 314_000_000n;
			ledgerCanisterMock.balance.mockResolvedValue(balanceE8s);

			const tokens = await balance({
				certified: true,
				owner: mockPrincipal,
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
				identity: mockIdentity
			});

			expect(tokens).toEqual(balanceE8s);
			expect(ledgerCanisterMock.balance).toBeCalledTimes(1);

			const account: IcrcAccount = {
				owner: mockPrincipal
			};

			expect(ledgerCanisterMock.balance).toBeCalledWith({
				certified: true,
				...account
			});
		});
	});
});
