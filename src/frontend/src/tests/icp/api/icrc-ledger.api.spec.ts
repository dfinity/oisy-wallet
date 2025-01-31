import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
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
		const params = {
			certified: true,
			owner: mockPrincipal,
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
			identity: mockIdentity
		};

		const balanceE8s = 314_000_000n;

		const account: IcrcAccount = {
			owner: mockPrincipal
		};

		beforeEach(() => {
			ledgerCanisterMock.balance.mockResolvedValue(balanceE8s);
		});

		it('successfully calls balance endpoint', async () => {
			const tokens = await balance(params);

			expect(tokens).toEqual(balanceE8s);
			expect(ledgerCanisterMock.balance).toBeCalledTimes(1);

			expect(ledgerCanisterMock.balance).toBeCalledWith({
				certified: true,
				...account
			});
		});

		it('successfully calls balance endpoint as query', async () => {
			const tokens = await balance({
				...params,
				certified: false
			});

			expect(tokens).toEqual(balanceE8s);
			expect(ledgerCanisterMock.balance).toBeCalledTimes(1);

			expect(ledgerCanisterMock.balance).toBeCalledWith({
				certified: false,
				...account
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(
				balance({
					certified: true,
					owner: mockPrincipal,
					ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
					identity: undefined
				})
			).rejects.toThrow();
		});
	});
});
