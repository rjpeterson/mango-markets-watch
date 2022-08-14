import debugCreator from 'debug'
import { AlertTypes, updateBadgeText } from '.'
import settings from './settings'
import { getTokenInfo, TokensInfo, Token } from './tokenData'

const debug = debugCreator('background:tokenAlerts')
export let triggeredTokenAlerts = 0

export enum TokenRateType {
  Borrow = 'borrow',
  Deposit = 'deposit',
  Funding = 'funding',
}
export enum AlertSide {
  Above = 'above',
  Below = 'below',
}
export interface TokenAlert {
  baseSymbol: string
  type: TokenRateType
  side: AlertSide
  percent: number
}

export interface TokenAlerts {
  [id: string]: TokenAlert
}

//TODO create custom html OS alerts using https://groups.google.com/a/chromium.org/g/chromium-extensions/c/nhIz8U96udY
const onTriggered = (tokenAlertId: string, tokenAlert: TokenAlert, alertTypes: AlertTypes, rate: number) => {
  if (alertTypes.os) {
    chrome.notifications.create(tokenAlertId, {
      type: 'basic',
      iconUrl: 'dist/icons/logo.svg',
      title: `Mango Markets Watch`,
      message: `${tokenAlert.baseSymbol} ${tokenAlert.type} rate is ${tokenAlert.side} ${
        tokenAlert.percent
      }% (${rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)`,
      priority: 2,
    })
  }
  chrome.runtime.sendMessage({
    msg: 'tokenAlert triggered',
    data: {
      tokenAlertId: tokenAlertId,
      tokenAlert: tokenAlert,
    },
  })
}

const onUntriggered = (tokenAlertId: string, tokenAlert: TokenAlert, alertTypes: AlertTypes) => {
  if (alertTypes.os) {
    chrome.notifications.clear(tokenAlertId)
  }
  chrome.runtime.sendMessage({
    msg: 'tokenAlert untriggered',
    data: {
      tokenAlertId: tokenAlertId,
      tokenAlert: tokenAlert,
    },
  })
}

export const updateTokenAlerts = async (tokenAlerts: TokenAlerts, sendResponse: Function): Promise<void> => {
  chrome.storage.local.set({ tokenAlerts: tokenAlerts })
  const tokensInfo = await getTokenInfo(settings.cluster, settings.group)
  chrome.storage.local.get(['alertTypes'], result => {
    checkAllTokenAlerts(tokensInfo, tokenAlerts, result.alertTypes)
    updateBadgeText()
    sendResponse({ msg: 'tokenAlerts updated successfully' })
  })
}

const checkSingleTokenAlert = (token: Token, tokenAlert: TokenAlert) => {
  debug('comparing tokenAlert', JSON.stringify(tokenAlert, null, 2), 'to token data', JSON.stringify(token, null, 2))
  if (token[tokenAlert.type] !== '0.00' && !parseFloat(token[tokenAlert.type])) {
    debug(`${tokenAlert.type} rate of ${token.baseSymbol} is not a number`)
    return
  }
  if (
    (tokenAlert.side === 'above' && parseFloat(token[tokenAlert.type]) > tokenAlert.percent) ||
    (tokenAlert.side === 'below' && parseFloat(token[tokenAlert.type]) < tokenAlert.percent)
  ) {
    return {
      triggered: true,
      rate: parseFloat(token[tokenAlert.type]),
    }
  } else {
    return {
      triggered: false,
      rate: undefined,
    }
  }
}

export const checkAllTokenAlerts = (tokensInfo: TokensInfo, tokenAlerts: TokenAlerts, alertTypes: AlertTypes): void => {
  debug('calling checkAllTokenAlerts...')
  // debug('got tokenAlerts:', JSON.stringify(response.tokenAlerts), 'alertTypes:', JSON.stringify(response.alertTypes))
  let triggeredAlerts = 0
  for (const entry in tokenAlerts) {
    let triggered: boolean
    let rate: number
    const tokenAlert: TokenAlert = tokenAlerts[entry]
    tokensInfo
      .filter(token => {
        return token.baseSymbol === tokenAlert.baseSymbol
      })
      .forEach(token => {
        ;({ triggered, rate } = checkSingleTokenAlert(token, tokenAlert))
      })
    if (triggered) {
      debug(`token notification triggered`)
      onTriggered(entry, tokenAlert, alertTypes, rate)
      triggeredAlerts += 1
    } else {
      onUntriggered(entry, tokenAlert, alertTypes)
      debug('conditions not met')
    }
  }
  triggeredAlerts > 0 && alertTypes.browser === true
    ? (triggeredTokenAlerts = triggeredAlerts)
    : (triggeredTokenAlerts = 0)
}
