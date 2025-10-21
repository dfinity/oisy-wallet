import type { ManageStakePositionError } from '$declarations/gldt_stake/declarations/gldt_stake.did';
import { CanisterInternalError } from '$lib/canisters/errors';

export const mapGldtStakeCanisterError = (err: ManageStakePositionError): CanisterInternalError => {
	if ('StartDissolvingError' in err) {
		return new CanisterInternalError('Failed to start dissolving');
	}

	if ('AddStakeError' in err) {
		return new CanisterInternalError('Failed to add stake');
	}

	if ('DissolveInstantlyError' in err) {
		return new CanisterInternalError('Failed to dissolve instantly');
	}

	if ('WithdrawError' in err) {
		return new CanisterInternalError('Failed to withdraw');
	}

	if ('ClaimRewardError' in err) {
		return new CanisterInternalError('Failed to claim reward');
	}

	if ('GeneralError' in err) {
		return new CanisterInternalError('General gldt_stake error');
	}

	return new CanisterInternalError('Unknown GldtStakeCanisterError');
};
