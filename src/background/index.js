chrome.runtime.onInstalled.addListener(() => {
  console.log('onInstalled...');
  scheduleRequest();
  scheduleWatchdog();
  startRequest();
});

// fetch and save data when chrome restarted, alarm will continue running when chrome is restarted
chrome.runtime.onStartup.addListener(() => {
  console.log('onStartup....');
  startRequest();
})

// alarm listener
chrome.alarms.onAlarm.addListener(alarm => {
  // if watchdog is triggered, check whether refresh alarm is there
  if (alarm && alarm.name === 'watchdog') {
    chrome.alarms.get('refresh', alarm => {
      if (alarm) {
        console.log('Refresh alarm exists.');
      } else {
        //if it is no there, start a new request and reschedule refresh alarm
        console.log("Refresh alarm doesn't exist, starting a new one");
        startRequest();
        scheduleRequest();
      }
    });
  } else {
    //if refresh alarm triggered, start a new request
    startRequest();
  }
})

//schedule a new fetch every 30 minutes
function scheduleRequest() {
  console.log('schedule refresh alarm to 30 minutes...')
  chrome.alarms.create('refresh', { periodInMinutes: 30 })
}

// schedule a watchdog check every 5 minutes
function scheduleWatchdog() {
  console.log('schedule watchdog alarm to 5 minutes...')
  chrome.alarms.create('watchdog', { periodInMinutes: 5 })
}

//fetch data and save to local storage
async function startRequest() {
  let tokensInfo = [];
  console.log('start HTTP Request...')
  const response = await fetch('https://mango-stats-v3.herokuapp.com/spot?mangoGroup=mainnet.1')
  if (!response.ok) {
      alert(`Somthing went wrong: ${response.status} - ${response.statusText}`)
  }
  rawData = await response.json()
  rawData.slice(-7, rawData.length).map(token => {
      const trimmedName = token.name.replace('/USDC','')
      tokensInfo.push({
          name: trimmedName,
          borrowRate: token.borrowRate.toFixed(3),
          depositRate: token.depositRate.toFixed(3),
          toggle: true
      })
  })
  chrome.storage.local.set(
    {tokensInfo: tokensInfo},
      function() {
      console.log(`stored tokensInfo : ${JSON.stringify(tokensInfo)}`)
    }
  )
}
