import '../styles/hype.css'
import '../styles/twitch.css'

import { injectTwitchPageOnBehalfOf } from '@ky-is/twitch-extension-channel-manager/inject'
import { addMessage, messagesPerSecondInLast, calculateMessageData, resetMessages } from './chat'

const BOX_COUNT = 6

let isLiveChannel = false
let observingSidebarEl: Element | null = null
let hypeBoxes: HTMLCollection | null = null

let lastUpdateTimestamp = Date.now()

const sidebarObserver = new window.MutationObserver((mutations) => {
	for (const mutation of mutations) {
		for (const chatNode of mutation.addedNodes) {
			const chatEl = chatNode as HTMLElement
			const badge = chatEl.querySelector('.chat-badge')
			if (badge?.getAttribute('aria-label') === 'Moderator badge') {
				continue
			}
			const messageEl = chatEl.querySelector(isLiveChannel ? '.chat-line__no-background > *:last-child' : '.video-chat__message > span:last-child') as HTMLElement
			if (!messageEl) {
				// if (!chatEl.classList.contains('chat-line__status')) {
				// 	console.log('No element for node', isLiveChannel, chatNode)
				// }
				continue
			}
			addMessage(messageEl, isLiveChannel)
		}
	}

	if (hypeBoxes) {
		const timestamp = Date.now()
		if (timestamp - lastUpdateTimestamp < 4) {
			return
		}
		lastUpdateTimestamp = timestamp

		const messageDataArray = calculateMessageData(BOX_COUNT)
		const mpsEl = document.getElementById('_hype-mps')
		if (mpsEl) {
			mpsEl.innerText = messagesPerSecondInLast(15, timestamp).toFixed(1)
		}

		for (let idx = 0; idx < BOX_COUNT; idx += 1) {
			const boxEl = hypeBoxes[idx]
			const boxData = messageDataArray[idx]
			let titleText, titleUrl, scoreText
			const titleEl = boxEl.children[0] as HTMLElement
			const scoreEl = boxEl.children[1] as HTMLElement
			if (boxData) {
				const title = boxData[0]
				const score = boxData[1]
				const messages = boxData[2]
				if (messages !== undefined) {
					const emoteInfo = title.split(',')
					titleUrl = `url(https://static-cdn.jtvnw.net/emoticons/v2/${emoteInfo[1]}/default/dark/3.0)`
				} else {
					titleText = title
				}
				scoreText = `${Math.round(score * 100)}%`
				const hue = (360 + 200 - Math.floor(score * 300)) % 360
				const weight = 300 + Math.ceil(score * 600)
				const saturation = 50 + Math.round(score * 50)
				scoreEl.style.color = `hsl(${hue}, ${saturation}%, 50%)`
				scoreEl.style.fontWeight = weight.toString()
			}
			titleEl.style.backgroundImage = titleUrl ?? ''
			titleEl.innerText = titleText ?? ''
			scoreEl.innerText = scoreText ?? ''
		}
	}
})

function injectHype() {
	let hypeEl = document.getElementById('_hype')
	if (!hypeEl) {
		hypeBoxes = null
		const videoContainer = document.querySelector('.video-player__container')
		if (videoContainer) {
			hypeEl = document.createElement('div')
			hypeEl.id = '_hype'
			const hypeContainer = document.createElement('div')
			hypeContainer.id = '_hype-container'
			for (let idx = 0; idx < BOX_COUNT; idx += 1) {
				const messageBox = document.createElement('div')
				messageBox.className = '_hype-box'
				messageBox.innerHTML = '<div class="_hype-title"></div><div class="_hype-score"></div>'
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

	let sidebarEl = document.querySelector('.chat-scrollable-area__message-container')
	isLiveChannel = !!sidebarEl
	if (!sidebarEl) {
		sidebarEl = document.querySelector('.channel-root__right-column ul')
	}
	if (sidebarEl && sidebarEl !== observingSidebarEl) {
		observingSidebarEl = sidebarEl
		sidebarObserver.disconnect()
		resetMessages()
		sidebarObserver.observe(sidebarEl, { childList: true, subtree: false })
	}
}

injectTwitchPageOnBehalfOf('hype', injectHype)
