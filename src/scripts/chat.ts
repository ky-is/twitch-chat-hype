type KeyText = [key: string, text: string]

let userChatMessages: [HTMLElement, Set<string>, KeyText?][] = []
let userMessageCount = 0
let startIndex = 0
let messageTimestamps: number[] = []

const MAX_MESSAGE_COUNT = 50
const MIN_SCORE = MAX_MESSAGE_COUNT + 1
const PERFECT_SCORE = MAX_MESSAGE_COUNT * (MAX_MESSAGE_COUNT + 1) / 2

export function resetMessages() {
	userChatMessages = []
	userMessageCount = 0
	startIndex = 0
	messageTimestamps = []
}

//CHAT

function appendMessageData(messageEl: HTMLElement, emotes: Set<string>, keyText?: KeyText) {
	if (userMessageCount < MAX_MESSAGE_COUNT) {
		userMessageCount += 1
	} else {
		delete userChatMessages[startIndex]
		startIndex += 1
	}
	userChatMessages.push([messageEl, emotes, keyText])
	messageTimestamps.push(Date.now())
}

const R_HAS_LETTER = /\w/
const R_PUNCTUATION_CHARS = /\W/g
const R_REPEATED_CHARS = /(.)\1+/g

function getKeyFrom(text: string) {
	let key = text
	if (R_HAS_LETTER.test(text)) {
		key = key.replace(R_PUNCTUATION_CHARS, '').toLowerCase()
	}
	key = key.replace(R_REPEATED_CHARS, '$1')
	if (key.length > 50) {
		key = key.substr(1, 48)
	}
	return key
}

export function addMessage(messageEl: HTMLElement, isLiveChannel: boolean) {
	const messageChildren = messageEl.children
	if (!messageChildren) {
		return
	}
	const emotes = new Set<string>()
	const textFragments = new Set<string>()
	const queryAttributeName = isLiveChannel ? 'data-test-selector' : 'data-a-target'
	const queryEmoteName = isLiveChannel ? 'emote-button' : 'emote-name'
	for (let child of messageChildren) {
		if (child.className === 'text-fragment') {
			const text = (child as HTMLElement).innerText.trim()
			if (!text.length) {
				continue
			}
			textFragments.add(text)
		} else {
			let queryAttr = child.getAttribute(queryAttributeName)
			if (!queryAttr) {
				const newChild = child.children.item(0)
				if (!newChild) {
					continue
				}
				child = newChild
				queryAttr = child.getAttribute(queryAttributeName)
			}
			if (queryAttr === queryEmoteName) {
				const emoteContainer = child.querySelector('img') as HTMLImageElement
				if (!emoteContainer) {
					console.log('Unknown emote container', child)
					continue
				}
				const emoteUrl = emoteContainer && emoteContainer.src
				if (!emoteUrl) {
					console.log('Unknown emote source', child)
					continue
				}
				const urlSegments = emoteUrl.split('/')
				const emoteID = urlSegments[5]
				if (!emoteID) {
					console.log('Unknown emote id', urlSegments)
					continue
				}
				emotes.add(`${emoteContainer.alt},${emoteID}`)
				// console.log(emoteContainer.alt, emoteId, urlSegments) //SAMPLE
			}
		}
	}
	const text = Array.from(textFragments.values()).join(' ')
	const key = getKeyFrom(text)
	if (emotes.size || key.length) {
		appendMessageData(messageEl, emotes, key.length ? [key, text] : undefined)
	}
}

//POPULATE

export function messagesPerSecondInLast(seconds: number, timestamp: number) {
	let messageCount = 0
	let secondsAgo = seconds
	let timestampStart = timestamp - secondsAgo * 1000
	const firstTimestamp = messageTimestamps[0]
	if (firstTimestamp > timestampStart) {
		timestampStart = firstTimestamp
		secondsAgo = (timestamp - timestampStart) / 1000
		if (secondsAgo < 3) {
			return 0
		}
	}
	for (let idx = messageTimestamps.length - 1; idx >= 0; idx -= 1) {
		const messageAt = messageTimestamps[idx]
		if (messageAt < timestampStart) {
			messageTimestamps = messageTimestamps.slice(idx)
			break
		}
		messageCount += 1
	}
	return messageCount / secondsAgo
}

type MessageScores = {[emote: string]: number}
type MessageTextScores = {[emote: string]: [number, string]}
type MessageResult = [primaryMessage: string, score: number, messages?: string[]]

function sortByScore(lhs: MessageResult, rhs: MessageResult) {
	return rhs[1] - lhs[1]
}

export function calculateMessageData(maximumEntries: number) {
	const scoreForEmotes: MessageScores = {}
	const scoreForMessages: MessageTextScores = {}
	for (let idx = startIndex; idx < startIndex + userMessageCount; idx += 1) {
		const score = idx - startIndex + 1
		const [messageEl, emotes, keyText] = userChatMessages[idx]
		for (const emote of emotes) {
			scoreForEmotes[emote] = (scoreForEmotes[emote] ?? 0) + score
		}
		if (keyText) {
			const [key, text] = keyText
			if (!scoreForMessages[key]) {
				scoreForMessages[key] = [score, text]
			} else {
				scoreForMessages[key][0] += score
				if (text.length > 16 && scoreForMessages[key][0] >= MIN_SCORE * 2) {
					messageEl.innerHTML = '<span class="_hype-hyped">&#60;hype&#62;</span>'
				}
			}
		}
	}
	let results: MessageResult[] = []
	for (const emote in scoreForEmotes) {
		const score = scoreForEmotes[emote]
		if (score >= MIN_SCORE) {
			results.push([ emote, score / PERFECT_SCORE, [] ])
		}
	}
	for (const key in scoreForMessages) {
		const [score, text] = scoreForMessages[key]
		if (score >= MIN_SCORE) {
			results.push([ text, score / PERFECT_SCORE, undefined ])
		}
	}
	results = results
		.sort(sortByScore)
		.slice(0, maximumEntries)
	return results
}
