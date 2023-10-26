export enum SendStep {
	INITIALIZATION = 'initialization',
	SIGN = 'sign',
	SEND = 'send',
	APPROVE = 'approve',
	DONE = 'done'
}

export enum SignStep {
	INITIALIZATION = 'initialization',
	SIGN = 'sign',
	APPROVE = 'approve',
	DONE = 'done'
}

export enum AirdropStep {
	INITIALIZATION = 'initialization',
	AIRDROP = 'airdrop',
	INVITE_FRIENDS = 'invite_friends',
	DONE = 'done'
}

export enum LoaderStep {
	INITIALIZATION = 'initialization',
	ETH_ADDRESS = 'eth_address',
	ETH_DATA = 'eth_data',
	DONE = 'done'
}

export enum AddTokenStep {
	INITIALIZATION = 'initialization',
	SAVE = 'save',
	DONE = 'done'
}