let userChatMessages: Set<string>[] = []
let userMessageCount = 0
let startIndex = 0
let messageTimestamps: number[] = []

const MAX_MESSAGE_COUNT = 50
const PERFECT_SCORE = MAX_MESSAGE_COUNT * (MAX_MESSAGE_COUNT + 1) / 2

export function resetMessages() {
	userChatMessages = []
	userMessageCount = 0
	startIndex = 0
	messageTimestamps = []
}

//CHAT

function appendMessageData(emotes: Set<string>) {
	if (emotes.size) {
		if (userMessageCount < MAX_MESSAGE_COUNT) {
			userMessageCount += 1
		} else {
			delete userChatMessages[startIndex]
			startIndex += 1
		}
		userChatMessages.push(emotes)
	}
	messageTimestamps.push(Date.now())
}

export function addMessage(messageEl: Element, isLiveChannel: boolean) {
	const messageChildren = messageEl.children
	if (!messageChildren) {
		return
	}
	const emotes = new Set<string>()
	for (const child of messageChildren) {
		const targetName = child.getAttribute(isLiveChannel ? 'data-test-selector' : 'data-a-target')
		if (targetName === (isLiveChannel ? 'emote-button' : 'emote-name')) {
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
	appendMessageData(emotes)
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

function sortMessageScores(a: any, b: any) {
	return b[1] - a[1]
}

export function populateMessageData() {
	const scoresByMessage: {[message: string]: [score: number, hasMultiple: boolean]} = {}
	for (let idx = startIndex; idx < startIndex + userMessageCount; idx += 1) {
		const score = idx - startIndex
		const messageArray = userChatMessages[idx]
		for (const messageText of messageArray) {
				const messageData = scoresByMessage[messageText]
				if (messageData) {
					messageData[0] += score
					messageData[1] = true
				} else {
					scoresByMessage[messageText] = [ score, false ]
				}
		}
	}
	let result: [string, number][] = []
	for (const message in scoresByMessage) {
		const messageData = scoresByMessage[message]
		if (messageData[1]) {
			result.push([ message, messageData[0] / PERFECT_SCORE ])
		}
	}
	result.sort(sortMessageScores)
	return result
}
