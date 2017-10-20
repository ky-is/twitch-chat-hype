let userChatMessages = []
let userMessageCount = 0
let startIndex = 0
let messagesSinceUpdate = 0
let messageTimestamps = []

const MAX_MESSAGE_COUNT = 99
const MESSAGE_POWER = 3
const PERFECT_SCORE = 24502500
// let newPerfectScore = 0 //SAMPLE
// for (let idx = 0; idx < MAX_MESSAGE_COUNT; idx += 1) {
//   newPerfectScore += Math.pow(idx + 1, MESSAGE_POWER)
// }
// console.log(newPerfectScore)

const EMOJI_REGEX = /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/gu
const REPEAT_REGEX = /(\w)\1\1+/g
const PUNCTUATION_REGEX = /[,\/!&;:`~()\?]/g

const IGNORE_WORDS = [ 'an', 'and', 'am', 'are', 'at', 'be', 'been', 'for', 'had', 'has', 'in', 'is', 'it', 'its', 'me', 'my', 'of', 'the', 'they', 'this', 'to', 'you', 'was', 'were', 'will' ]
const EMOJI_APPENDAGES = [ '/', '//', 'b' ] //TODO

const resetMessages = function() {
  userChatMessages = []
  userMessageCount = 0
  startIndex = 0
  messagesSinceUpdate = 0
  messageTimestamps = []
}

//CHAT

const addMessage = function(message) {
  if (userMessageCount < MAX_MESSAGE_COUNT) {
    userMessageCount += 1
  } else {
    delete userChatMessages[startIndex]
    startIndex += 1
  }
  userChatMessages.push(message)
  messagesSinceUpdate += 1
  messageTimestamps.push(Date.now())
}

const parseMessageContainer = function(messageContainer, liveChannel) {
  const words = new Set()
  const emotes = new Set()
  const messageChildren = messageContainer.children
  if (!messageChildren) {
    return
  }
  for (let idx = liveChannel ? 3 : 0; idx < messageChildren.length; idx += 1) {
    const child = messageChildren[idx]
    const tag = child.tagName
    if (tag === 'SPAN') {
      let string = child.innerText.toLowerCase()
      if (string === '<message deleted>') {
        words.add('<message deleted>')
        continue
      }
      string = string.replace('rap god', 'rapgod').replace(EMOJI_REGEX, (match, a, b) => {
        emotes.add(match)
        return ''
      }).replace(REPEAT_REGEX, (match, character) => {
        return `${character}${character}`
      }).replace(PUNCTUATION_REGEX, ' ')
      for (let word of string.split(' ')) {
        if (word.length <= 1 || IGNORE_WORDS.includes(word)) {
          continue
        }
        if (word[0] === '@') {
          word = word.slice(1)
        }
        if (word.endsWith(`'s`)) {
          word = word.slice(0, -2)
        }
        words.add(word)
      }
    } else if (tag === 'DIV') {
      const emoteContainer = child.children[0]
      const emoteUrl = emoteContainer && emoteContainer.src
      if (emoteUrl) {
        const urlSegments = emoteUrl.split('/')
        const emoteId = parseInt(urlSegments[urlSegments.length - 2])
        emotes.add(`${emoteContainer.alt},${emoteId}`)
      } else if (child.getAttribute('data-a-target') === 'chat-message-mention') {
        words.add(child.innerText.slice(1).toLowerCase())
      } else {
        console.log('Unknown chat div', child)
      }
    } else if (tag === 'A') {
      // console.log('Ignore links', child)
    } else {
      console.log('Unknown chat tag:', tag, child)
    }
  }
  addMessage([ words, emotes ])
}

//POPULATE

const messagesPerSecondInLast = function(seconds, timestamp) {
  let messageCount = 0
  let secondsAgo = seconds
  let timestampStart = timestamp - secondsAgo * 1000
  const firstTimestamp = messageTimestamps[0]
  if (firstTimestamp > timestampStart) {
    timestampStart = firstTimestamp
    secondsAgo = (timestamp - firstTimestamp) / 1000
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

const populateMessageData = function() {
  messagesSinceUpdate = 0
  const popularMessages = {}
  for (let idx = startIndex; idx < startIndex + userMessageCount; idx += 1) {
    const score = Math.pow(MAX_MESSAGE_COUNT - (idx - startIndex), MESSAGE_POWER)
    const messageArray = userChatMessages[idx]
    for (const messageType of messageArray) {
      for (const wordEmote of messageType) {
        if (popularMessages[wordEmote]) {
          popularMessages[wordEmote] += score
        } else {
          popularMessages[wordEmote] = score
        }
      }
    }
  }
  let result = []
  for (const message in popularMessages) {
    const messageScore = popularMessages[message]
    result.push([ message, messageScore / PERFECT_SCORE ])
  }
  result.sort((a, b) => { return b[1] - a[1] })
  return result
}
