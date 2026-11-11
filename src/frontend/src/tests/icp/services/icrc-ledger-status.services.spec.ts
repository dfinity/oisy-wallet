import * as canisterStateApi from '$icp/api/canister-state.api';
import * as icrcLedgerApi from '$icp/api/icrc-ledger.api';
import { checkIcrcLedgerStatus } from '$icp/services/icrc-ledger-status.services';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	CertifiedRejectErrorCode,
	HttpErrorCode,
	MissingSignatureErrorCode,
	ProtocolError,
	RejectError,
	ReplicaRejectCode,
	TrustError,
	UncertifiedRejectErrorCode,
	UncertifiedRejectUpdateErrorCode,
	requestIdOf
} from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import type { MockInstance } from 'vitest';

describe('icrc-ledger-status.services', () => {
	describe('checkIcrcLedgerStatus', () => {
		const ledgerCanisterId = 'aiw2p-tyaaa-aaaam-aebyq-cai';

		const requestId = requestIdOf({ method_name: 'icrc1_metadata' });

		// What the agent throws for a query the replica rejected, as a mainnet ledger without
		// ICRC methods (IC0536) or without code (IC0537) answers.
		const queryReject = ({
			rejectCode = ReplicaRejectCode.CanisterError,
			rejectErrorCode
		}: {
			rejectCode?: ReplicaRejectCode;
			rejectErrorCode?: string;
		}) =>
			RejectError.fromCode(
				new UncertifiedRejectErrorCode(requestId, rejectCode, 'test', rejectErrorCode, undefined)
			);

		const check = () => checkIcrcLedgerStatus({ identity: mockIdentity, ledgerCanisterId });

		let metadataSpy: MockInstance<typeof icrcLedgerApi.metadata>;
		let existenceSpy: MockInstance<typeof canisterStateApi.getCanisterExistence>;

		beforeEach(() => {
			vi.clearAllMocks();

			metadataSpy = vi.spyOn(icrcLedgerApi, 'metadata');
			existenceSpy = vi.spyOn(canisterStateApi, 'getCanisterExistence').mockResolvedValue('exists');
		});

		it('should ask the ledger for its metadata with a query', async () => {
			metadataSpy.mockResolvedValue([]);

			await check();

			expect(metadataSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId,
				certified: false
			});
		});

		it('should report a ledger that answers', async () => {
			metadataSpy.mockResolvedValue([]);

			await expect(check()).resolves.toEqual({ status: 'responding' });
		});

		it.each(['IC0301', 'IC0537'])(
			'should report no ledger when the replica rejects with %s',
			async (rejectErrorCode) => {
				metadataSpy.mockRejectedValue(queryReject({ rejectErrorCode }));

				await expect(check()).resolves.toEqual({ status: 'no_ledger' });

				expect(existenceSpy).not.toHaveBeenCalled();
			}
		);

		it.each(['IC0207', 'IC0508', 'IC0509'])(
			'should report a ledger that does not respond when the replica rejects with %s',
			async (rejectErrorCode) => {
				metadataSpy.mockRejectedValue(queryReject({ rejectErrorCode }));

				await expect(check()).resolves.toEqual({ status: 'not_responding' });
			}
		);

		it('should report a ledger that does not respond on a transient reject', async () => {
			metadataSpy.mockRejectedValue(
				queryReject({ rejectCode: ReplicaRejectCode.SysTransient, rejectErrorCode: 'IC0201' })
			);

			await expect(check()).resolves.toEqual({ status: 'not_responding' });
		});

		it('should report an error with the code the replica names', async () => {
			metadataSpy.mockRejectedValue(queryReject({ rejectErrorCode: 'IC0536' }));

			await expect(check()).resolves.toEqual({ status: 'error', errorCode: 'IC0536' });
		});

		it('should report an error without a code when the replica names none', async () => {
			metadataSpy.mockRejectedValue(queryReject({}));

			await expect(check()).resolves.toEqual({ status: 'error' });
		});

		it('should read the reject of a certified call and of an update call too', async () => {
			metadataSpy.mockRejectedValueOnce(
				RejectError.fromCode(
					new CertifiedRejectErrorCode(requestId, ReplicaRejectCode.CanisterError, 'test', 'IC0537')
				)
			);

			await expect(check()).resolves.toEqual({ status: 'no_ledger' });

			metadataSpy.mockRejectedValueOnce(
				RejectError.fromCode(
					new UncertifiedRejectUpdateErrorCode(
						requestId,
						ReplicaRejectCode.CanisterError,
						'test',
						'IC0508'
					)
				)
			);

			await expect(check()).resolves.toEqual({ status: 'not_responding' });
		});

		it('should report no ledger when no replica answers and the canister does not exist', async () => {
			// A query to a canister that no subnet hosts fails its signature check.
			metadataSpy.mockRejectedValue(TrustError.fromCode(new MissingSignatureErrorCode()));
			existenceSpy.mockResolvedValue('not_found');

			await expect(check()).resolves.toEqual({ status: 'no_ledger' });

			expect(existenceSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: Principal.fromText(ledgerCanisterId)
			});
		});

		it.each(['exists', 'unknown'] as const)(
			'should report a ledger that does not respond when no replica answers and the canister existence is %s',
			async (existence) => {
				metadataSpy.mockRejectedValue(
					ProtocolError.fromCode(new HttpErrorCode(503, 'Service Unavailable', []))
				);
				existenceSpy.mockResolvedValue(existence);

				await expect(check()).resolves.toEqual({ status: 'not_responding' });
			}
		);
	});
});
