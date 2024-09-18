export interface WalletWorker {
	start: () => void;
	stop: () => void;
	trigger: () => void;
}
