import type { PostMessageDataResponsePowProtector } from '$lib/types/post-message';

export interface PowProtectorWorkerInitResult {
	start: () => void;
	stop: () => void;
	trigger: () => void;
}

export type PowProtectorWorker = () => Promise<PowProtectorWorkerInitResult>;

export const syncPowProtection = ({ _data }: { _data: PostMessageDataResponsePowProtector }) => {};

export const syncPowProtectionError = ({
	_error: _err,
	_hideToast = false
}: {
	_error: unknown;
	_hideToast?: boolean;
}) => {};
