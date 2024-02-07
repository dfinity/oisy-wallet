export interface CkBTCWalletWorker {
	start: () => void;
	stop: () => void;
	trigger: () => void;
}
