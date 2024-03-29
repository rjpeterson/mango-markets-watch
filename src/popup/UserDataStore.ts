import { XData } from "alpinejs";
import { MetricType, TriggerType } from "./NewAccountAlert";

export interface UserDataStoreType extends XData {
  toggles: Toggles,
  tokenAlerts: TokenAlerts,
  accounts: Accounts,
  accountAlerts: AccountAlert[],
  browserNotifs: boolean,
  OSNotifs: boolean
}

interface Toggles {
  [token: string]: boolean
}

export interface TokenAlerts {
  [id: string]: {
		baseSymbol: string,
		percent: string,
		side: AlertSide,
		type: TokenRateType
	},
}

export enum AlertSide {
  Below = 'below',
  Above = 'above'
}

export enum TokenRateType {
  Deposit = 'deposit',
  Borrow = 'borrow',
  Funding = 'funding'
}

interface Accounts {
  [address: string]: AccountData,
}

export interface AccountData {
  balance: number,
	health: number,
	name: string | undefined
}

export interface AccountAlert {
  id: number,
  address: string,
  triggerType: TriggerType,
  metricType: MetricType,
  triggerValue: number,
  deltaValue: number,
  timeFrame: number
}