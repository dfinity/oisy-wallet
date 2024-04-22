export enum SendStep {
	INITIALIZATION = 'initialization',
	SIGN_APPROVE = 'sign_approve',
	APPROVE = 'approve',
	SIGN_TRANSFER = 'sign_transfer',
	TRANSFER = 'transfer',
	APPROVE_WALLET_CONNECT = 'approve_wallet_connect',
	DONE = 'done'
}

export enum SignStep {
	INITIALIZATION = 'initialization',
	SIGN = 'sign',
	APPROVE = 'approve',
	DONE = 'done'
}

export enum LoaderStep {
	INITIALIZATION = 'initialization',
	ETH_ADDRESS = 'eth_address',
	DONE = 'done'
}

export enum AddTokenStep {
	INITIALIZATION = 'initialization',
	SAVE = 'save',
	UPDATE_UI = 'update_ui',
	DONE = 'done'
}

export enum HideTokenStep {
	INITIALIZATION = 'initialization',
	HIDE = 'hide',
	UPDATE_UI = 'update_ui',
	DONE = 'done'
}

export enum SendIcStep {
	INITIALIZATION = 'initialization',
	APPROVE_FEES = 'approve_fees',
	APPROVE_TRANSFER = 'approve_transfer',
	SEND = 'send',
	RELOAD = 'reload',
	DONE = 'done'
}

export enum UpdateBalanceCkBtcStep {
	INITIALIZATION = 'initialization',
	RETRIEVE = 'retrieve',
	RELOAD = 'reload',
	DONE = 'done'
}
