import type { ManageStakePositionError } from '$declarations/gldt_stake/declarations/gldt_stake.did';
import { CanisterInternalError } from '$lib/canisters/errors';

export const mapGldtStakeCanisterError = (err: ManageStakePositionError): CanisterInternalError => {
	if ('StartDissolvingError' in err) {
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
