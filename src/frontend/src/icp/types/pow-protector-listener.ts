export interface PowProtectorWorkerInitResult {
	start: () => void;
	stop: () => void;
	trigger: () => void;
	destroy: () => void;
}

export type PowProtectorWorker = () => Promise<PowProtectorWorkerInitResult>;
