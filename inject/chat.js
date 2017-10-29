let userChatMessages = []
let userMessageCount = 0
let startIndex = 0
let messagesSinceUpdate = 0
let messageTimestamps = []

const MAX_MESSAGE_COUNT = 70
const MESSAGE_POWER = 3
const PERFECT_SCORE = 6175225 //SAMPLE 60:3348900 70:6175225 80:10497600 99:24502500
// let newPerfectScore = 0
// for (let idx = 0; idx < MAX_MESSAGE_COUNT; idx += 1) {
//   newPerfectScore += Math.pow(idx + 1, MESSAGE_POWER)
// }
// console.log(newPerfectScore)

const EMOJI_REGEX = /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/gu
const REPEAT_REGEX = /(.)\1\1+/g
const PUNCTUATION_REGEX = /[,&;:()\[\]]/g

const IGNORE_WORDS = [ 'and', 'am', 'are', 'at', 'be', 'been', 'can', 'does', 'for', 'had', 'has', 'in', 'is', 'it', 'its', 'me', 'of', 'they', 'that', 'this', 'to', 'you', 'was', 'were', 'will', 'with' ]
const EMOTE_APPENDAGES = [ '/', '//', 'b', '==c' ] //TODO
const PREFIX_WORDS = [ 'a', 'an', 'by', 'go', 'he', 'im', 'its', 'lets', 'oh', 'our', 'my', 'no', 'she', 'so', 'take', 'the' ]
const SUFFIX_WORDS = [ 'chan', 'kun', 'san', 'sama' ]

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
  for (let childIndex = liveChannel ? 3 : 0; childIndex < messageChildren.length; childIndex += 1) {
    const child = messageChildren[childIndex]
    const tag = child.tagName
    if (tag === 'SPAN') {
      const string = child.innerText.toLowerCase().replace('woah', 'whoa').replace(EMOJI_REGEX, (match, a, b) => {
        emotes.add(match)
        return ''
      }).replace(REPEAT_REGEX, (match, character) => {
        return match === 'www' ? match : `${character}${character}`
      }).replace(PUNCTUATION_REGEX, ' ').trim()

      if (string.length <= 1) {
        continue
      }

      const splitWords = string.split(' ')
      let isSpacedLetters = true
      for (const word of splitWords) {
        if (word.length > 1) {
          isSpacedLetters = false
          break
        }
      }
      if (isSpacedLetters) {
        words.add(splitWords.join(''))
        continue
      }
      words.add(string)

      const splitCount = splitWords.length
      if (splitCount > 1) {
        for (let splitIndex = 0; splitIndex < splitCount; splitIndex += 1) {
          let word = splitWords[splitIndex]
          if (IGNORE_WORDS.includes(word)) {
            continue
          }
          if (splitIndex < splitCount - 1) {
            let combineCount = 0
            const nextWord = splitWords[splitIndex + 1]
            let separator
            if (!isNaN(word)) {
              combineCount = 1
              separator = ' '
            } else if (PREFIX_WORDS.includes(word)) {
              separator = ' '
              combineCount = PREFIX_WORDS.includes(nextWord) ? 2 : 1
            } else if (SUFFIX_WORDS.includes(nextWord)) {
              separator = '-'
              combineCount = 1
            }
            if (combineCount > 0) {
              for (let combineIndex = 0; splitIndex < splitCount && combineIndex < combineCount; combineIndex += 1) {
                splitIndex += 1
                word = `${word}${separator || ''}${nextWord}`
              }
              continue
            }
          }
          if (word[0] === '@') {
            word = word.slice(1)
          }

          if (word.length > 1) {
            words.add(word)
          }
        }
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
    secondsAgo = (timestamp - timestampStart) / 1000
    if (secondsAgo < 1) {
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

const populateMessageData = function() {
  messagesSinceUpdate = 0
  const popularMessages = {}
  for (let idx = startIndex; idx < startIndex + userMessageCount; idx += 1) {
    const score = Math.pow(MAX_MESSAGE_COUNT - (idx - startIndex), MESSAGE_POWER)
    const messageArray = userChatMessages[idx]
    for (const messageType of messageArray) {
      for (const messageText of messageType) {
        const messageData = popularMessages[messageText]
        if (messageData) {
          messageData[0] += score
          messageData[1] = true
        } else {
          popularMessages[messageText] = [ score, false ]
        }
      }
    }
  }
  for (const message in popularMessages) {
    const split = message.split(' ')
    if (split.length <= 1) {
      continue
    }
    const wholeMessageData = popularMessages[message]
    const scoreThreshold = wholeMessageData[0] * 2
    for (const individualWord of split) {
      const individualWordScore = popularMessages[individualWord]
      if (individualWordScore && individualWordScore[0] < scoreThreshold) {
        delete popularMessages[individualWord]
      }
    }
    const combinedMessage = popularMessages[split.join('')]
    if (combinedMessage) {
      combinedMessage[0] += wholeMessageData[0]
      combinedMessage[1] = true
      delete popularMessages[message]
    }
  }
  let result = []
  for (const message in popularMessages) {
    const messageData = popularMessages[message]
    if (messageData[1]) {
      result.push([ message, messageData[0] / PERFECT_SCORE ])
    }
  }
  result.sort((a, b) => { return b[1] - a[1] })
  return result
}
