let userChatMessages: [Set<string>, Set<string>?][] = []
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

function appendMessageData(emotes: Set<string>, textFragments?: Set<string>) {
	if (userMessageCount < MAX_MESSAGE_COUNT) {
		userMessageCount += 1
	} else {
		delete userChatMessages[startIndex]
		startIndex += 1
	}
	userChatMessages.push([emotes, textFragments])
	messageTimestamps.push(Date.now())
}

const R_REPEAT_CHARS = /(.)\1{3,}/g
const R_ENDING_BASIC_PUNCTUATION = /[\.,]+$/g

export function addMessage(messageEl: Element, isLiveChannel: boolean) {
	const messageChildren = messageEl.children
	if (!messageChildren) {
		return
	}
	const emotes = new Set<string>()
	const textFragments = new Set<string>()
	for (const child of messageChildren) {
		if (child.className === 'text-fragment') {
			let text = (child as HTMLElement).innerText.replace(R_REPEAT_CHARS, '$1$1$1').trim()
			if (!text.endsWith('...')) {
				text = text.replace(R_ENDING_BASIC_PUNCTUATION, '')
			}
			if (text) {
				textFragments.add(text.toLowerCase())
			}
		} else if (child.getAttribute(isLiveChannel ? 'data-test-selector' : 'data-a-target') === (isLiveChannel ? 'emote-button' : 'emote-name')) {
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
			const emoteId = parseInt(urlSegments[urlSegments.length - 4])
			// console.log(emoteContainer.alt, emoteId, urlSegments) //SAMPLE
			emotes.add(`${emoteContainer.alt},${emoteId}`)
		}
	}
	if (emotes.size || textFragments.size) {
		appendMessageData(emotes, textFragments.size ? textFragments : undefined)
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
type MessageResult = [primaryMessage: string, score: number, messages?: string[]]

function sortByScore(lhs: MessageResult, rhs: MessageResult) {
	return rhs[1] - lhs[1]
}

export function calculateMessageData(maximumEntries: number) {
	const scoreForEmotes: MessageScores = {}
	const scoreForMessages: MessageScores = {}
	for (let idx = startIndex; idx < startIndex + userMessageCount; idx += 1) {
		const score = idx - startIndex + 1
		const [emotes, textFragments] = userChatMessages[idx]
		for (const emote of emotes) {
			scoreForEmotes[emote] = (scoreForEmotes[emote] ?? 0) + score
		}
		if (textFragments) {
			for (const textFragment of textFragments) {
				scoreForMessages[textFragment] = (scoreForMessages[textFragment] ?? 0) + score
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
	for (const message in scoreForMessages) {
		const score = scoreForMessages[message]
		if (score >= MIN_SCORE) {
			results.push([ message, score / PERFECT_SCORE, undefined ])
		}
	}
	return result
		.sort((lhs, rhs) => rhs[0] - lhs[0])
	results = results
		.sort(sortByScore)
		.slice(0, maximumEntries)
	return results
}
