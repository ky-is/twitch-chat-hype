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

export function addMessage(messageEl: Element, isLiveChannel: boolean) {
	const messageChildren = messageEl.children
	if (!messageChildren) {
		return
	}
	const emotes = new Set<string>()
	const textFragments = new Set<string>()
	for (const child of messageChildren) {
		if (child.className === 'text-fragment') {
			const text = (child as HTMLElement).innerText.trim()
			if (text) {
				textFragments.add(text)
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
type MessageResult = [score: number, primaryMessage: string, messages?: MessageScores]

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
	let result: MessageResult[] = []
	for (const emote in scoreForEmotes) {
		const score = scoreForEmotes[emote]
		if (score >= MIN_SCORE) {
			result.push([ score / PERFECT_SCORE, emote, {} ])
		}
	}
	for (const message in scoreForMessages) {
		const score = scoreForMessages[message]
		if (score >= MIN_SCORE) {
			result.push([ score / PERFECT_SCORE, message, undefined ])
		}
	}
	return result
		.sort((lhs, rhs) => rhs[0] - lhs[0])
		.slice(0, maximumEntries)
}
