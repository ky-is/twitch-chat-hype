const BOX_COUNT = 6

let liveChannel = false
let observingSidebarEl = null
let hypeBoxes = null
let lastUpdate = Date.now()
let mainElement = null

const sidebarObserver = new window.MutationObserver((mutations, observing) => {
	if (channelDisabled) {
		return
	}
	for (const mutation of mutations) {
		for (const chatMessage of mutation.addedNodes) {
			const el = liveChannel ? chatMessage : chatMessage.querySelector('.video-chat__message > span:last-child')
			if (!el) {
				console.log('No element for node', liveChannel, chatMessage)
				continue
			}
			parseMessageContainer(el, liveChannel)

			if (hypeBoxes) {
				const timestamp = Date.now()
				if (messagesSinceUpdate > 2 && timestamp - lastUpdate > 2000) {
					// console.time('populateMessageData')
					const messageDataArray = populateMessageData()
					const messagesPerSecond = messagesPerSecondInLast(30, timestamp)
					// console.timeEnd('populateMessageData')
					document.getElementById('_hype-mps').innerText = messagesPerSecond.toFixed(1)

					for (let idx = 0; idx < BOX_COUNT; idx += 1) {
						const boxEl = hypeBoxes[idx]
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
							const hue = (360 + 200 - Math.floor(score * 300)) % 360
							const weight = 300 + Math.ceil(score * 600)
							const saturation = 50 + Math.round(score * 50)
							scoreEl.style.color = `hsl(${hue}, ${saturation}%, 50%)`
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
	const channelNameElement = mainElement.querySelector('.channel-header__user h5')
	if (!channelNameElement) {
		return
	}
	const newChannel = channelNameElement.textContent
	if (newChannel !== syncChannel) {
		setSyncChannel(newChannel)
	}
	if (!channelDisabled) {
		addHype()
	}
})

const toggleHype = function(enabled) {
	if (enabled) {
		addHype()
	} else {
		const hypeEl = document.getElementById('_hype')
		if (hypeEl) {
			hypeEl.remove()
		}
		sidebarObserver.disconnect()
		observingSidebarEl = null
	}
}

const addHype = function() {
	let hypeEl = document.getElementById('_hype')
	if (!hypeEl) {
		const videoContainer = document.querySelector('.video-player__container')
		if (videoContainer) {
			hypeEl = document.createElement('div')
			hypeEl.id = '_hype'
			const hypeContainer = document.createElement('div')
			hypeContainer.id = '_hype-container'
			for (let idx = 0; idx < BOX_COUNT; idx += 1) {
				const messageBox = document.createElement('div')
				messageBox.className = '_hype-box'
				const titleDiv = document.createElement('div')
				const scoreDiv = document.createElement('div')
				titleDiv.className = '_hype-title'
				scoreDiv.className = '_hype-score'
				messageBox.appendChild(titleDiv)
				messageBox.appendChild(scoreDiv)
				messageBox.appendChild(document.createElement('div'))
				hypeContainer.appendChild(messageBox)
			}
			hypeEl.appendChild(hypeContainer)
			const hypeStats = document.createElement('div')
			hypeStats.id = '_hype-stats'
			hypeStats.innerHTML = '<span id="_hype-mps"></span> messages per second'
			hypeEl.appendChild(hypeStats)

			videoContainer.appendChild(hypeEl)
			hypeBoxes = hypeContainer.children
		}
	}

	let sidebarEl = document.querySelector('.right-column ul')
	if (sidebarEl) {
		liveChannel = false
	} else {
		sidebarEl = document.querySelector('.right-column .chat-list__lines .tw-full-height')
		if (sidebarEl) {
			liveChannel = true
		}
	}
	if (sidebarEl && sidebarEl !== observingSidebarEl) {
		observingSidebarEl = sidebarEl
		sidebarObserver.disconnect()
		resetMessages()
		sidebarObserver.observe(sidebarEl, { childList: true, subtree: false })
	}
}

waitForSelector('main', (nextElement) => {
	mainElement = nextElement
	pageObserver.observe(mainElement, { childList: true, subtree: true })
}, 999)
