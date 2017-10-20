if (document.body.classList.contains('ember-application')) {
  window.alert('Please upgrade to the new Twitch beta to use the Twitch Wave extension')
}

const BOX_COUNT = 6

let liveChannel = false

let observingSidebar = false
let waveBoxes = null

let lastUpdate = Date.now()

const sidebarObserver = new window.MutationObserver((mutations, observing) => {
  if (channelDisabled) {
    return
  }
  for (const mutation of mutations) {
    for (const chatMessage of mutation.addedNodes) {
      parseMessageContainer(liveChannel ? chatMessage : chatMessage.querySelector('.qa-mod-message'), liveChannel)

      if (waveBoxes) {
        const timestamp = Date.now()
        if (messagesSinceUpdate > 2 && timestamp - lastUpdate > 2 * 1000) {
          // console.time('populateMessageData')
          const messageDataArray = populateMessageData()
          // console.timeEnd('populateMessageData')
          for (let idx = 0; idx < BOX_COUNT; idx += 1) {
            const boxEl = waveBoxes[idx]
            const boxData = messageDataArray[idx]
            let titleText, titleUrl, scoreText
            const titleEl = boxEl.children[0]
            const scoreEl = boxEl.children[1]
            if (!boxData || boxData[1] < 0.025) {
              titleText = ''
              scoreText = ''
            } else {
              const title = boxData[0]
              const score = boxData[1]
              const emoteInfo = title.split(',')
              if (emoteInfo[1]) {
                titleUrl = `url(https://static-cdn.jtvnw.net/emoticons/v1/${emoteInfo[1]}/3.0)`
              } else {
                titleText = title
              }
              scoreText = `${Math.round(score * 100)}%`
              const hue = (360 + 200 - Math.floor(score * 280)) % 360
              const weight = 300 + Math.floor(score * 700)
              scoreEl.style.color = `hsl(${hue}, 90%, 50%)`
              scoreEl.style['font-weight'] = weight
            }
            titleEl.style['background-image'] = titleUrl || ''
            titleEl.innerText = titleText || ''
            scoreEl.innerText = scoreText
          }
          lastUpdate = timestamp
        }
      }
    }
  }
})

const pageObserver = new window.MutationObserver((mutations, observing) => {
  const channelNameElement = document.querySelector('.channel-header__user h5')
  if (!channelNameElement) {
    return
  }
  const newChannel = channelNameElement.textContent
  if (newChannel !== syncChannel) {
    setSyncChannel(newChannel)
  }
  let waveContainer = document.getElementById('_wave-container')
  if (!waveContainer) {
    const videoContainer = document.querySelector('.video-player__container')
    if (videoContainer) {
      waveContainer = document.createElement('div')
      waveContainer.id = '_wave-container'
      for (let idx = 0; idx < BOX_COUNT; idx += 1) {
        const messageBox = document.createElement('div')
        messageBox.className = '_wave-box'
        const titleDiv = document.createElement('div')
        const scoreDiv = document.createElement('div')
        titleDiv.className = '_wave-title'
        scoreDiv.className = '_wave-score'
        messageBox.appendChild(titleDiv)
        messageBox.appendChild(scoreDiv)
        messageBox.appendChild(document.createElement('div'))
        waveContainer.appendChild(messageBox)
      }
      videoContainer.appendChild(waveContainer)
      waveBoxes = waveContainer.children
    }
  }

  let sidebarEl = document.querySelector('.right-column ul')
  if (sidebarEl) {
    liveChannel = false
  } else {
    sidebarEl = document.querySelector('.right-column .chat-list__lines')
    if (sidebarEl) {
      liveChannel = true
    }
  }
  if (!sidebarEl) {
    observingSidebar = false
  } else if (!observingSidebar) {
    observingSidebar = true
    sidebarObserver.disconnect()
    resetMessages()
    sidebarObserver.observe(sidebarEl, { childList: true, subtree: false })
  }
})

waitForSelector('main', (nextElement) => {
  pageObserver.observe(nextElement, { childList: true, subtree: true })
}, 999)
