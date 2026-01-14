import type { ManageStakePositionError } from '$declarations/gldt_stake/gldt_stake.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import { GldtUnstakeDissolvementsLimitReached } from '$lib/types/errors';

export const mapGldtStakeCanisterError = (err: ManageStakePositionError): CanisterInternalError => {
	if ('StartDissolvingError' in err) {
		if ('DissolvementsLimitReached' in err.StartDissolvingError) {
			return new GldtUnstakeDissolvementsLimitReached(
				err.StartDissolvingError.DissolvementsLimitReached
			);
		}

		return new CanisterInternalError(
			Object.values(err.StartDissolvingError)[0] ?? 'Failed to start dissolving'
		);
	}

	if ('AddStakeError' in err) {
		return new CanisterInternalError(Object.values(err.AddStakeError)[0] ?? 'Failed to add stake');
	}

	if ('DissolveInstantlyError' in err) {
		return new CanisterInternalError(
			Object.values(err.DissolveInstantlyError)[0] ?? 'Failed to dissolve instantly'
		);
	}

	if ('WithdrawError' in err) {
		return new CanisterInternalError(Object.values(err.WithdrawError)[0] ?? 'Failed to withdraw');
	}

	if ('ClaimRewardError' in err) {
		return new CanisterInternalError(
			Object.values(err.ClaimRewardError[0])[0] ?? 'Failed to claim reward'
		);
	}

	if ('GeneralError' in err) {
		return new CanisterInternalError(
			Object.values(err.GeneralError)[0] ?? 'General gldt_stake error'
		);
	}

	return new CanisterInternalError('Unknown GldtStakeCanisterError');
};
