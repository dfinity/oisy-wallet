import type {
	AddUserCredentialResult,
	CustomToken,
	PendingTransaction,
	UserToken,
	UserTokenId
} from '$declarations/backend/backend.did';
import {
	addPendingBtcTransaction,
	addUserCredential,
	createUserProfile,
	getPendingBtcTransactions,
	getUserProfile,
	listCustomTokens,
	listUserTokens,
	removeCustomToken,
	removeUserToken,
	setCustomToken,
	setManyCustomTokens,
	setManyUserTokens,
	setUserToken
} from '$lib/api/backend.api';
import { BackendCanister } from '$lib/canisters/backend.canister';
import { POUH_ISSUER_CANISTER_ID } from '$lib/constants/app.constants';
import { POUH_CREDENTIAL_TYPE } from '$lib/constants/credentials.constants';
import type {
	AddUserCredentialParams,
	BtcAddPendingTransactionParams,
	BtcGetPendingTransactionParams,
	GetUserProfileResponse
} from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { mockUtxo } from '$tests/mocks/btc.mock';
import { mockCustomTokens } from '$tests/mocks/custom-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockUserProfile } from '$tests/mocks/user-profile.mock';
import { mockUserTokens } from '$tests/mocks/user-tokens.mock';
import { Principal } from '@dfinity/principal';
import type { QueryParams } from '@dfinity/utils';
import { mock } from 'vitest-mock-extended';

describe('backend.api', () => {
	const backendCanisterMock = mock<BackendCanister>();

	const certified = false;

	const baseParams = {
		identity: mockIdentity
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(BackendCanister, 'create').mockResolvedValue(backendCanisterMock);
	});

	describe('listUserTokens', () => {
		const mockParams: CanisterApiFunctionParams<QueryParams> = {
			...baseParams,
			certified
		};

		beforeEach(() => {
			backendCanisterMock.listUserTokens.mockResolvedValue(mockUserTokens);
		});

		it('should successfully call listUserTokens endpoint', async () => {
			const result = await listUserTokens(mockParams);

			expect(result).toEqual(mockUserTokens);

			expect(backendCanisterMock.listUserTokens).toHaveBeenCalledExactlyOnceWith({ certified });
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(listUserTokens({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if listUserTokens throws', async () => {
			backendCanisterMock.listUserTokens.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(listUserTokens(mockParams)).rejects.toThrow();
		});
	});

	describe('listCustomTokens', () => {
		const mockParams: CanisterApiFunctionParams<QueryParams> = {
			...baseParams,
			certified
		};

		beforeEach(() => {
			backendCanisterMock.listCustomTokens.mockResolvedValue(mockCustomTokens);
		});

		it('should successfully call listCustomTokens endpoint', async () => {
			const result = await listCustomTokens(mockParams);

			expect(result).toEqual(mockCustomTokens);
			expect(backendCanisterMock.listCustomTokens).toHaveBeenCalledExactlyOnceWith({ certified });
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(listCustomTokens({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if listCustomTokens throws', async () => {
			backendCanisterMock.listCustomTokens.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(listCustomTokens(mockParams)).rejects.toThrow();
		});
	});

	describe('setManyCustomTokens', () => {
		const mockParams: CanisterApiFunctionParams<{
			tokens: CustomToken[];
		}> = {
			...baseParams,
			tokens: mockCustomTokens
		};

		beforeEach(() => {
			backendCanisterMock.setManyCustomTokens.mockResolvedValue();
		});

		it('should successfully call setManyCustomTokens endpoint', async () => {
			await setManyCustomTokens(mockParams);

			expect(backendCanisterMock.setManyCustomTokens).toHaveBeenCalledExactlyOnceWith({
				tokens: mockCustomTokens
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(setManyCustomTokens({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if setManyCustomTokens throws', async () => {
			backendCanisterMock.setManyCustomTokens.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(setManyCustomTokens(mockParams)).rejects.toThrow();
		});
	});

	describe('setCustomToken', () => {
		const [mockCustomToken] = mockCustomTokens;

		const mockParams: CanisterApiFunctionParams<{
			token: CustomToken;
		}> = {
			...baseParams,
			token: mockCustomToken
		};

		beforeEach(() => {
			backendCanisterMock.setCustomToken.mockResolvedValue();
		});

		it('should successfully call setCustomToken endpoint', async () => {
			await setCustomToken(mockParams);

			expect(backendCanisterMock.setCustomToken).toHaveBeenCalledExactlyOnceWith({
				token: mockCustomToken
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(setCustomToken({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if setCustomToken throws', async () => {
			backendCanisterMock.setCustomToken.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(setCustomToken(mockParams)).rejects.toThrow();
		});
	});

	describe('removeUserToken', () => {
		const [mockUserToken] = mockUserTokens;

		const mockParams: CanisterApiFunctionParams<UserTokenId> = {
			...baseParams,
			chain_id: mockUserToken.chain_id,
			contract_address: mockUserToken.contract_address
		};

		beforeEach(() => {
			backendCanisterMock.removeUserToken.mockResolvedValue();
		});

		it('should successfully call removeUserToken endpoint', async () => {
			await removeUserToken(mockParams);

			expect(backendCanisterMock.removeUserToken).toHaveBeenCalledExactlyOnceWith({
				chain_id: mockUserToken.chain_id,
				contract_address: mockUserToken.contract_address
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(removeUserToken({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if removeUserToken throws', async () => {
			backendCanisterMock.removeUserToken.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(removeUserToken(mockParams)).rejects.toThrow();
		});
	});

	describe('removeCustomToken', () => {
		const [mockCustomToken] = mockCustomTokens;

		const mockParams: CanisterApiFunctionParams<{ token: CustomToken }> = {
			...baseParams,
			token: mockCustomToken
		};

		beforeEach(() => {
			backendCanisterMock.removeCustomToken.mockResolvedValue();
		});

		it('should successfully call removeCustomToken endpoint', async () => {
			await removeCustomToken(mockParams);

			expect(backendCanisterMock.removeCustomToken).toHaveBeenCalledExactlyOnceWith({
				token: mockCustomToken
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(removeCustomToken({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if removeCustomToken throws', async () => {
			backendCanisterMock.removeCustomToken.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(removeCustomToken(mockParams)).rejects.toThrow();
		});
	});

	describe('setManyUserTokens', () => {
		const mockParams: CanisterApiFunctionParams<{ tokens: UserToken[] }> = {
			...baseParams,
			tokens: mockUserTokens
		};

		beforeEach(() => {
			backendCanisterMock.setManyUserTokens.mockResolvedValue();
		});

		it('should successfully call setManyUserTokens endpoint', async () => {
			await setManyUserTokens(mockParams);

			expect(backendCanisterMock.setManyUserTokens).toHaveBeenCalledExactlyOnceWith({
				tokens: mockUserTokens
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(setManyUserTokens({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if setManyUserTokens throws', async () => {
			backendCanisterMock.setManyUserTokens.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(setManyUserTokens(mockParams)).rejects.toThrow();
		});
	});

	describe('setUserToken', () => {
		const [mockUserToken] = mockUserTokens;

		const mockParams: CanisterApiFunctionParams<{
			token: UserToken;
		}> = {
			...baseParams,
			token: mockUserToken
		};

		beforeEach(() => {
			backendCanisterMock.setUserToken.mockResolvedValue();
		});

		it('should successfully call setUserToken endpoint', async () => {
			await setUserToken(mockParams);

			expect(backendCanisterMock.setUserToken).toHaveBeenCalledExactlyOnceWith({
				token: mockUserToken
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(setUserToken({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if setUserToken throws', async () => {
			backendCanisterMock.setUserToken.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(setUserToken(mockParams)).rejects.toThrow();
		});
	});

	describe('createUserProfile', () => {
		const mockParams: CanisterApiFunctionParams = {
			...baseParams
		};

		beforeEach(() => {
			backendCanisterMock.createUserProfile.mockResolvedValue(mockUserProfile);
		});

		it('should successfully call createUserProfile endpoint', async () => {
			const result = await createUserProfile(mockParams);

			expect(result).toEqual(mockUserProfile);
			expect(backendCanisterMock.createUserProfile).toHaveBeenCalledOnce();
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(createUserProfile({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if createUserProfile throws', async () => {
			backendCanisterMock.createUserProfile.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(createUserProfile(mockParams)).rejects.toThrow();
		});
	});

	describe('getUserProfile', () => {
		const mockParams: CanisterApiFunctionParams<QueryParams> = {
			...baseParams,
			certified
		};

		const mockResponse: GetUserProfileResponse = { Ok: mockUserProfile };

		beforeEach(() => {
			backendCanisterMock.getUserProfile.mockResolvedValue(mockResponse);
		});

		it('should successfully call getUserProfile endpoint', async () => {
			const result = await getUserProfile(mockParams);

			expect(result).toEqual(mockResponse);
			expect(backendCanisterMock.getUserProfile).toHaveBeenCalledExactlyOnceWith({ certified });
		});

		it('should return the backend error', async () => {
			const mockErrResponse: GetUserProfileResponse = { Err: { NotFound: null } };

			backendCanisterMock.getUserProfile.mockResolvedValue(mockErrResponse);

			const result = await getUserProfile(mockParams);

			expect(result).toEqual(mockErrResponse);
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(getUserProfile({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if getUserProfile throws', async () => {
			backendCanisterMock.getUserProfile.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(getUserProfile(mockParams)).rejects.toThrow();
		});
	});

	describe('addUserCredential', () => {
		const successfulCredentialJWT =
			'eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0.eyJpc3MiOiJkaWQ6aWNwOnFkaWlmLTJpYWFhLWFhYWFwLWFoamFxLWNhaSIsInZwIjp7IkBjb250ZXh0IjoiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiLCJ0eXBlIjoiVmVyaWZpYWJsZVByZXNlbnRhdGlvbiIsInZlcmlmaWFibGVDcmVkZW50aWFsIjpbImV5SnFkMnNpT25zaWEzUjVJam9pYjJOMElpd2lZV3huSWpvaVNXTkRjeUlzSW1zaU9pSk5SSGQzUkVGWlMwdDNXVUpDUVVkRWRVVk5Ra0ZuVFhOQlFXOUJRVUZCUVVGSFFVRktkMFZDTWxGbVFYVk5TbWhJVkcxTVNqVXljMnR5Tm1SalVYRjRZMTlYTVV4bGRYTkNXbGR5ZW5wMlUxRlhUU0o5TENKcmFXUWlPaUprYVdRNmFXTndPbVpuZEdVMUxXTnBZV0ZoTFdGaFlXRmtMV0ZoWVhSeExXTmhhU0lzSW1Gc1p5STZJa2xqUTNNaWZRLmV5SmxlSEFpT2pFM016RTBNVFF5TWpnc0ltbHpjeUk2SW1oMGRIQnpPaTh2YVdSbGJuUnBkSGt1YVdNd0xtRndjQzhpTENKdVltWWlPakUzTXpFME1UTXpNamdzSW1wMGFTSTZJbVJoZEdFNmRHVjRkQzl3YkdGcGJqdGphR0Z5YzJWMFBWVlVSaTA0TEhScGJXVnpkR0Z0Y0Y5dWN6b3hOek14TkRFek16STRORGszT1RJeE1EUTNMR0ZzYVdGelgyaGhjMmc2Tm1VM05qVTBZelF5WXpSbU9ETTBORFpqTURaaVpUUTJNekZtT1dWbU5XVXpaR0ZtTVdReFpqSmxaRFppTTJVMk1HTXlZek16WWpVNU1HUmlNMkl3TkNJc0luTjFZaUk2SW1ScFpEcHBZM0E2TjJWaWIya3RkSGwxZVhNdFlYRnROR010ZHpKc04ya3RkbWQxWTIwdGVIWmhkM2d0YkdWdGVuZ3RObXR4TW1jdFpqVXpkVGN0ZVhabWFESXRibUZsSWl3aWRtTWlPbnNpUUdOdmJuUmxlSFFpT2lKb2RIUndjem92TDNkM2R5NTNNeTV2Y21jdk1qQXhPQzlqY21Wa1pXNTBhV0ZzY3k5Mk1TSXNJblI1Y0dVaU9sc2lWbVZ5YVdacFlXSnNaVU55WldSbGJuUnBZV3dpTENKSmJuUmxjbTVsZEVsa1pXNTBhWFI1U1dSQmJHbGhjeUpkTENKamNtVmtaVzUwYVdGc1UzVmlhbVZqZENJNmV5SkpiblJsY201bGRFbGtaVzUwYVhSNVNXUkJiR2xoY3lJNmV5Sm9ZWE5KWkVGc2FXRnpJam9pWlhab2NuQXRjMnBqZHpNdE5XZGlaV010ZW5sek4yMHRaMk4yZW1ndFpHMXJhMlV0WTJOak5IQXRNMkpsYXpjdGNtZDVjbll0YTNSamRYUXRZM0ZsSWl3aVpHVnlhWFpoZEdsdmJrOXlhV2RwYmlJNkltaDBkSEJ6T2k4dmJEZHlkV0V0Y21GaFlXRXRZV0ZoWVhBdFlXaG9ObUV0WTJGcExtbGpNQzVoY0hBaWZYMTlmUS4yZG4zb210alpYSjBhV1pwWTJGMFpWa0ZiZG5aOTZOa2RISmxaWU1CZ3dHREFZSUVXQ0NtV3ZvNDRpUWlpR09vbnJ0enotVmMtY0MxNXNqNGRXdzVpTTE0T1haZWk0TUNTR05oYm1semRHVnlnd0dEQVlNQmd3R0RBWU1CZ2dSWUlEWWpfU3A3VFNlRGtMU3c0Q1pFbXl3ZEdZM1dGc20tejZ2cGo1a2hKdHlZZ3dHQ0JGZ2dRRUw3S0VUYklHNFhKS0pJN3ZPVDljc2RJaWdQS1kyVWo4R09Da0NGTTBPREFZSUVXQ0NOUGJ4YkdzZ0g2MDh4TzVGeExibFAzMHBRQm9JSGNaOGN1amQzR3lySTc0TUNTZ0FBQUFBQVlBQW5BUUdEQVlNQmd3Sk9ZMlZ5ZEdsbWFXVmtYMlJoZEdHQ0ExZ2dFaDFTTXk3bENHT2RERXV2UFNRUTh3eW84TDBMNWZ2QW9Ga3JnV19nOHJpQ0JGZ2diTTFyc3hwVWRoMUtWdW5QMk11amhOVzQtMGNZVG95aFBMY09CUElnbXM2Q0JGZ2dUWVZGSWpQNnU0T1FWWko0NVhaTXJsa3VVR0ZGbTBCcEpQRk9FSkdlZ0JxQ0JGZ2dQZWVCM2dnUjlhaEdrV2JGbFBsRFBaWnZhRzlQUUdXdGs1WGpDX3JCVS1LQ0JGZ2d5eXFVQlhBRXJqTnZ0U3Vqa1JmUGtLcXQ3LUF0My1rZ1c4d1R5UFlWQ2dLQ0JGZ2d2Qi1iVEZUMmJyajhKVGdla0dRYTVaNzRmRmtCaGpWUllxVXN0SWRTUXN1Q0JGZ2c1d3lrY08tdkJWNnJ4MlVwT2w3LWw0X3l4U0lac0JWRFhCMnY5TmE1akwtQ0JGZ2dkSGxaMDE2Y2VCRHByNWZzSjVDMC1lNElKOUhlSjJCWHJMby1EZC1ZMUw2Q0JGZ2dkTXE4Yml5MVBDNFktWUY0ZDNHVURJdEt5aUo0N1FwSV9tdG9TcmhXQXNXREFZSUVXQ0FNeWRpZW1WU0gydW9mRmdsTzhBZ0IyelB3RWtsb3NIVVpnMjYwbGk2Uk1ZTUNSSFJwYldXQ0EwbVhtUHVqLS1mTmd4aHBjMmxuYm1GMGRYSmxXREMzYmlnc0JoT3FUcmFJOE9OSFlnbldneG85bzdkSFZCVi0wakdsSFhFbmlqSHQxVzIzT08wX3h6VGY3NEVHWGtocVpHVnNaV2RoZEdsdmJxSnBjM1ZpYm1WMFgybGtXQjBzVmJOSDdQSm9iSU40SFd4WjBiUS1lMHk2amV0c0d6ZGhCX0xOQW10alpYSjBhV1pwWTJGMFpWa0NsTm5aOTZKa2RISmxaWU1CZ2dSWUlPUnpZc0k2eEoydkNsRWw5cG9sYmk3b0hESFVFZ2hJa2M2am1UeWw0M3JCZ3dHREFZSUVXQ0N3ak8wUnBEeVNDU2hDZmhRZGlPUi1hSjkycVRLOFhZWTIycDQxcTN6Nmk0TUNSbk4xWW01bGRJTUJnd0dEQVlNQmdnUllJSWM1LTc3ZFBlMnFqLTlCaHdObndKQmIzamRyWTkwMzRyRjItd2kxZ2dVdmd3R0NCRmdnZ19JMFpfVmVPeWljbnNiS09mNmNBdTlsdlI1dTFjRVlac0txdm5hLXFuYURBWU1DV0Iwc1ZiTkg3UEpvYklONEhXeFowYlEtZTB5NmpldHNHemRoQl9MTkFvTUJnd0pQWTJGdWFYTjBaWEpmY21GdVoyVnpnZ05ZTXRuWjk0S0NTZ0FBQUFBQVlBQUFBUUZLQUFBQUFBQmdBSzRCQVlKS0FBQUFBQUJnQUxBQkFVb0FBQUFBQUdfX193RUJnd0pLY0hWaWJHbGpYMnRsZVlJRFdJVXdnWUl3SFFZTkt3WUJCQUdDM0h3RkF3RUNBUVlNS3dZQkJBR0MzSHdGQXdJQkEyRUFrQWRSSUhlT3NocFRDZ0s4eDJQbjlLR1NrelVHbG1yM3RVd1FwTkt5VGVhb2F5QU9ORUM2NWlaNzlNU0kyYUVkQkhMRGpCdGlJUm1QbU9UbWlDdWppbHBPT3FXdnpvbWJmNEplMlZyZm9TWXBhSUJ6Vlc4blIxSnlFLWpYUGtET2dnUllJRGJ6elNWOWtQczQ1Q1dYOFpPbDRESGIxWVcyS1NlVHV3VGJSNVNBUE9CdWdnUllJSWotb050cDg0LWM4X3VvajRvRUR6eXR5YTUzY3ZvYVFHcHVwR1Q2aFl1ZWdnUllJR2xoN3hOOEt1NExCR2NJTHZiVHdTd0Q2VEFUdGdLa3kySVVKdzVJU0dQeGdnUllJUENPd3BJY205bHVEcl9nM19maUk4MFdOMklWcDROcEplcEZkb01zSFU1N2d3SkVkR2x0WllJRFNiNnB1T2lfcWJpREdHbHphV2R1WVhSMWNtVllNSVFXNnl0UDJ4ajV1eVZKSjQ1WjM1allDUnFIM2l2bnlVWmhwMEZkaU1EYXAtSEFWVWhxQnczQkEyeWdGTGNhOFdSMGNtVmxnd0dDQkZnZ0ViYzZrUnFsYTg4QVB1TnhFZnZHU2RDRzg2eE5SZ29ld09MZHlPcmNEaTZEQWtOemFXZURBWUlFV0NDTTNmazZYd1YzUFZqbU1yUWR1bHhDMkRCSWNpMFJLdTJWekhGTDh1WEcyb01DV0NDMHVmQTR2ZjJYM2lDYnVHUGowc3ZZdTduZDZETUNYOFZ1VE9HVFpzekFKNE1CZ3dKWUlHSFVUN3VLZWJwNmo3ZUdPZHhyVjJ6OVJPUHpfem45ZExlbEFDV0RqS3NvZ2dOQWdnUllJTEUydmJMUmlXM004U2dXUWlmeEJLSy1YMnBtQTl5cVVFamhPdXpxZzhSdSIsImV5SnFkMnNpT25zaWEzUjVJam9pYjJOMElpd2lZV3huSWpvaVNXTkRjeUlzSW1zaU9pSk5SSGQzUkVGWlMwdDNXVUpDUVVkRWRVVk5Ra0ZuVFhOQlFXOUJRVUZCUVVGbFFUWlJVVVZDYm05dlZUSjVNbWc1T0dSdExYRkJjbkpzWDFCVlVYUkVSV0pwTVVSQ09WUk5VSE5zY0dsZloyVnNaeUo5TENKcmFXUWlPaUprYVdRNmFXTndPbkZrYVdsbUxUSnBZV0ZoTFdGaFlXRndMV0ZvYW1GeExXTmhhU0lzSW1Gc1p5STZJa2xqUTNNaWZRLmV5SmxlSEFpT2pFM016RTBNVFF5TXpJc0ltbHpjeUk2SW1oMGRIQnpPaTh2WkhWdGJYa3RhWE56ZFdWeUxuWmpMeUlzSW01aVppSTZNVGN6TVRReE16TXpNaXdpYW5ScElqb2laR0YwWVRwMFpYaDBMM0JzWVdsdU8yTm9ZWEp6WlhROVZWUkdMVGdzYVhOemRXVnlPbWgwZEhCek9pOHZaSFZ0YlhrdGFYTnpkV1Z5TG5aakxIUnBiV1Z6ZEdGdGNGOXVjem94TnpNeE5ERXpNek15TWpFek5UZzVNVEUxTEhOMVltcGxZM1E2Wlhab2NuQXRjMnBqZHpNdE5XZGlaV010ZW5sek4yMHRaMk4yZW1ndFpHMXJhMlV0WTJOak5IQXRNMkpsYXpjdGNtZDVjbll0YTNSamRYUXRZM0ZsSWl3aWMzVmlJam9pWkdsa09tbGpjRHBsZG1oeWNDMXphbU4zTXkwMVoySmxZeTE2ZVhNM2JTMW5ZM1o2YUMxa2JXdHJaUzFqWTJNMGNDMHpZbVZyTnkxeVozbHlkaTFyZEdOMWRDMWpjV1VpTENKMll5STZleUpBWTI5dWRHVjRkQ0k2SW1oMGRIQnpPaTh2ZDNkM0xuY3pMbTl5Wnk4eU1ERTRMMk55WldSbGJuUnBZV3h6TDNZeElpd2lkSGx3WlNJNld5SldaWEpwWm1saFlteGxRM0psWkdWdWRHbGhiQ0lzSWxCeWIyOW1UMlpWYm1seGRXVnVaWE56SWwwc0ltTnlaV1JsYm5ScFlXeFRkV0pxWldOMElqcDdJbEJ5YjI5bVQyWlZibWx4ZFdWdVpYTnpJanA3ZlgxOWZRLjJkbjNvbXRqWlhKMGFXWnBZMkYwWlZrR1lOblo5Nk5rZEhKbFpZTUJnd0dEQVlJRVdDQ21Xdm80NGlRaWlHT29ucnR6ei1WYy1jQzE1c2o0ZFd3NWlNMTRPWFplaTRNQ1NHTmhibWx6ZEdWeWd3R0RBWUlFV0NCOHlEeWRWUU1DQTc2Wk90S1pxc3h4bWdoRzhHUWV2TGt1XzdvNllHZWcxNE1CZ2dSWUlEa2pnSEhDdzJWQ2Y1ZkpaTnBZbVdXdEtvNjhsRUNzS2NUMUZPQjhMRlE0Z3dHQ0JGZ2c3Z0FGQXlpcFZZOEJNSFlmdUF4X29Bek5TM3RlWC1oTXY0ZHhGaEF0RGR1REFZTUJnd0dDQkZnZzJaOGNqZVpkODY0N3I3cWZHYV9yYVgtSngyYjFxZUliNmI5Q3cyOWRPZGlEQVlJRVdDQ2xablFzTzZwc2VkZzIyQ2FUMU9tSlBrVDdSVTh6MFBlb2k0czhSRVpwUklNQmd3R0RBWUlFV0NESndQYXZQVVpONVAzWmpUdnVCNHJPd3dkNVc4bWo5aERFRXJyU1Vrd0VsWU1CZ3dHQ0JGZ2dOallRSnZjXzVHRFBoSnd0aVRBcEtMWVFDWl9PU2V6Qmx3aHVscDlGbmtDREFZSUVXQ0RxODB2WW9BZjlMYU9WWTE1RThyXzJ3cm81aWREby1HNFhLMWp0MlRiUWpJTUJnZ1JZSUhqNkRXZVRYNzdQNzBuSWlpei1ZbFF6MUx2QUROVnlQQXR2WE9YRVNkaVRnd0pLQUFBQUFBSGdPa0VCQVlNQmd3R0RBazVqWlhKMGFXWnBaV1JmWkdGMFlZSURXQ0JtdzFHb0VJelVhb0lZTGNQa3RKamU3OVhrQmc2UkJiYi1OZnZTUi1zVS00SUVXQ0N1U3psb2hVamEwZHItTzVtdDNUVjFUUTlGV1hMbFdJVVpxc1FFT2dGZkVZSUVXQ0FKYnFVb2lETlMwbW56TGc2ODhpU3o4M3pSWU80QmJxcy04MWx4T0VYZF80SUVXQ0N6eVNSMGF3UWJMNjlCUEhEb240UC1veDl5Q3JHVGRvdjdfZ0dRU2hEQkNJSUVXQ0RYM0tKd2JnWDlzbkQzWU9YR2dKZVREVEhUQWpCSDBDODMwcnpWeC1EMnRvSUVXQ0FLZFJ5OUc0NWhsTGlKSnJxZlRzc3oyb3FxSHNuMWhXVFVJaVcwSzJzeDQ0SUVXQ0RkcTYwcVBoSzJoMFVpTEQxc0Z1Y08xRnFQQk1HVEZmNmlvbVhqMWpEU3k0SUVXQ0NGRGR1STFZS3hWSUJqdWlKdElGbUkxd2R3T0Nla0lCaWc5YmtWdlM2dGFJSUVXQ0IwX1gwLWkzUWd3U1F2anVHbV9rLUJvRzNvN04yVW95bG8xY3hVUEpQQzU0SUVXQ0FFUFlnODY1NmJLUmVtekJHd3Baa3hpZ0NXTnFDLWRUeGtVZFp5NTMteFBvTUJnZ1JZSURMMDYzOGJyMVpaX2RtS2NyMDZFNVJpYUs0ekhraXJIMEJRVWNpRGh0V0xnd0pFZEdsdFpZSURTWmlHd05tSzZNMkRHR2x6YVdkdVlYUjFjbVZZTUxpOS0xZm5uX1RwMzZjRlc3WHRIWGg3bC1zdmxvaGEyS3c5M3pXVVQ0QS1uejJ2a1lla2UyZmlCNmFtYndnM0dtcGtaV3hsWjJGMGFXOXVvbWx6ZFdKdVpYUmZhV1JZSFpObHFNbnlmMEV3WUlVSU5kR0Zta0ZjWjFkYzB3d0VvWVA5Q1dNQ2EyTmxjblJwWm1sallYUmxXUUo5MmRuM29tUjBjbVZsZ3dHQ0JGZ2diYUE1NkJTQUlXMXVraDlIVGx1QXFWVGpyWVlCRWV0RlNLQnBCc0l3cVBlREFZTUJnZ1JZSUcwNzFMeEFKZ0VOanhDcmhDMWdQYVdEaEJ2Nk0xeGQyNHFXMlJSZ2Q3eEdnd0pHYzNWaWJtVjBnd0dEQVlJRVdDQzRTN2R3WWtyQmRJZW41aUhkY1Jidy1Bell2Qk1rQzlZNnlQUm1QMV95VUlNQmd3R0NCRmdnWlU4aUtnMTNoY2xBYTB6RENYRHE1S3hPbVNHUnFpQ1hBRm94V1VpczZkdURBWUlFV0NESUNhTDNIRWcyZWVvSVA4bzlwWU45NHBCdDRITVZuSFpyUTVZLW51N3FhSU1CZ2dSWUlKYm8yM3lhS0RKdTZ3ZTJCZnU0WUlSWXRnNm1CV3FPRi1NWHhnWDBnT3dwZ3dKWUhaTmxxTW55ZjBFd1lJVUlOZEdGbWtGY1oxZGMwd3dFb1lQOUNXTUNnd0dEQWs5allXNXBjM1JsY2w5eVlXNW5aWE9DQTFnYjJkbjNnWUpLQUFBQUFBSGdBQUFCQVVvQUFBQUFBZV9fX3dFQmd3SktjSFZpYkdsalgydGxlWUlEV0lVd2dZSXdIUVlOS3dZQkJBR0MzSHdGQXdFQ0FRWU1Ld1lCQkFHQzNId0ZBd0lCQTJFQWlwR3lPd21LNjMzVjVTVnhmd3dwMDVaOFgwNWgwTFhIeHBjWExtOVdncXBlUWoxQ0IzYVZ4UmVycC1PMk50cVVDVGpYMWNydTRtdzhjY3hvaVBWQ3haWnVZT3BOa2QyNVd0Q1pRb01YRUpmakpRSnI3d0F4S0xSR1FRVnNodEJLZ2dSWUlObHBLek81TmlIZnBiWkJTdWNTclFpQ29QWXBkc044VU9yY3BWNzJab21RZ2dSWUlMTnVpNS1fdTlaRGUtRHdyZzlXVWxTUWRvUTd3aEJrRW9CTDNaWExUU1BRZ3dKRWRHbHRaWUlEU2ZhaXQ1cXZ6UENDR0dsemFXZHVZWFIxY21WWU1JRUlONFBnd0puTVAwT2pEakRNZnJaZEdYbXZfenI3RVBRVVBEM1JFVlBEd00zQ1FqV3pYV214VnpVNzZ0cFBOR1IwY21WbGd3SkRjMmxuZ3dKWUlHdWFRYWliMTJhZzVMbzVnQjhGS0xZQXRoRTU2N2pTVjdQeldMRXZJQXNOZ3dKWUlEM01rRjhxSElsQzFmYi1IVElBdnk2QS1TVVJKQ1M0ODJHa0gyYVFaNWk3Z2dOQSJdfX0.';

		const mockParams: CanisterApiFunctionParams<AddUserCredentialParams> = {
			...baseParams,
			credentialJwt: successfulCredentialJWT,
			credentialSpec: {
				credential_type: POUH_CREDENTIAL_TYPE,
				arguments: []
			},
			issuerCanisterId: Principal.fromText(POUH_ISSUER_CANISTER_ID)
		};

		const mockResponse: AddUserCredentialResult = { Ok: null };

		beforeEach(() => {
			backendCanisterMock.addUserCredential.mockResolvedValue(mockResponse);
		});

		it('should successfully call addUserCredential endpoint', async () => {
			const result = await addUserCredential(mockParams);

			expect(result).toEqual(mockResponse);
			expect(backendCanisterMock.addUserCredential).toHaveBeenCalledExactlyOnceWith({
				credentialJwt: successfulCredentialJWT,
				credentialSpec: {
					credential_type: POUH_CREDENTIAL_TYPE,
					arguments: []
				},
				issuerCanisterId: Principal.fromText(POUH_ISSUER_CANISTER_ID)
			});
		});

		it('should return the backend error', async () => {
			const mockErrResponse: AddUserCredentialResult = { Err: { InvalidCredential: null } };

			backendCanisterMock.addUserCredential.mockResolvedValue(mockErrResponse);

			const result = await addUserCredential(mockParams);

			expect(result).toEqual(mockErrResponse);
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(addUserCredential({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if addUserCredential throws', async () => {
			backendCanisterMock.addUserCredential.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(addUserCredential(mockParams)).rejects.toThrow();
		});
	});

	describe('addPendingBtcTransaction', () => {
		const mockParams: CanisterApiFunctionParams<BtcAddPendingTransactionParams> = {
			...baseParams,
			txId: new Uint8Array([1, 2, 3]),
			utxos: [mockUtxo],
			network: { mainnet: null },
			address: 'address'
		};

		const mockResponse = true;

		beforeEach(() => {
			backendCanisterMock.btcAddPendingTransaction.mockResolvedValue(mockResponse);
		});

		it('should successfully call btcAddPendingTransaction endpoint', async () => {
			const result = await addPendingBtcTransaction(mockParams);

			expect(result).toEqual(mockResponse);
			expect(backendCanisterMock.btcAddPendingTransaction).toHaveBeenCalledExactlyOnceWith({
				txId: new Uint8Array([1, 2, 3]),
				utxos: [mockUtxo],
				network: { mainnet: null },
				address: 'address'
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(
				addPendingBtcTransaction({ ...mockParams, identity: undefined })
			).rejects.toThrow();
		});

		it('should throw an error if addPendingBtcTransaction throws', async () => {
			backendCanisterMock.btcAddPendingTransaction.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(addPendingBtcTransaction(mockParams)).rejects.toThrow();
		});
	});

	describe('getPendingBtcTransactions', () => {
		const mockParams: CanisterApiFunctionParams<BtcGetPendingTransactionParams> = {
			...baseParams,
			network: { mainnet: null },
			address: 'address'
		};

		const mockResponse: PendingTransaction[] = [
			{
				txid: new Uint8Array([1, 2, 3]),
				utxos: [mockUtxo]
			}
		];

		beforeEach(() => {
			backendCanisterMock.btcGetPendingTransaction.mockResolvedValue(mockResponse);
		});

		it('should successfully call btcGetPendingTransaction endpoint', async () => {
			const result = await getPendingBtcTransactions(mockParams);

			expect(result).toEqual(mockResponse);
			expect(backendCanisterMock.btcGetPendingTransaction).toHaveBeenCalledExactlyOnceWith({
				network: { mainnet: null },
				address: 'address'
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(
				getPendingBtcTransactions({ ...mockParams, identity: undefined })
			).rejects.toThrow();
		});

		it('should throw an error if getPendingBtcTransactions throws', async () => {
			backendCanisterMock.btcGetPendingTransaction.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(getPendingBtcTransactions(mockParams)).rejects.toThrow();
		});
	});
});
