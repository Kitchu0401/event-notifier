const moment = require('moment')
const User = require('./../models/user')
const TelegramBot = require('node-telegram-bot-api')

const util = require('./../util/util')
const config = require('./../config')

module.exports = (function () {

  const bot = new TelegramBot(config.telegramBotToken)

  function getLogger (jobName, timestamp) {
    return (message) => {
      console.log(`[${jobName}][${timestamp}] ${message}`)
    }
  }

  /**
   * 모임 목록을 넘겨받아 사용자에게 전송될 알림 메시지를 조립하여 반환한다.
   * @param {Object} event - 모임 정보 목록
   * @param {Object} regexp - 사용자 태그로 구성된 정규표현식
   * @return {String} 알림 메시지
   */
  function generateMessage (eventList, regexp) {
    // let messageHeader = `${jobName}\n새로운 모임을 발견했습니다.`
    let messageHeader = '새로운 모임을 발견했습니다.'
    let messageBody = eventList.map((event) => {
      let content = regexp && regexp.test(event.content) ? util.highlight(event.content, regexp) : ''
      return `${event.title}\n${content ? content + '\n' : ''}link: ${event.link}`
    }).join('\n\n')
    return `${messageHeader}\n\n${messageBody}`
      // preventing markdown error
      .replace(/[\*\[\]_]/g, '')
      // Markdown 형식으로 키워드를 강조한다.
      .replace(regexp, '*$1*')
  }

  /**
   * 추출된 모임 정보를 받아 사용자들에게 텔레그램 메시지를 발송한다.
   * 본 펑션 구현시 반드시 Promise 객체를 반환해야한다.
   * @param {Array} eventList - 모임 목록
   * @return {Promise} 메시지 발송 작업 Promise 객체
   */
  function notifyUser (eventList) {
    if ( !Array.isArray(eventList) || eventList.length <= 0 ) { return }

    // Telegram 사용자 정보를 조회한다.
    return User.getActiveUser()
      .then((subscriberList) => {
        subscriberList.forEach((subscriber) => {
          try {
            // 모임 제목 또는 내용이 사용자가 등록한 구독을 위한 키워드에 해당하면서,
            // 무시하고자 하는 키워드에 해당하지 않을 경우 알림 대상으로 처리한다.
            let subscribedEventList = eventList.filter((event) => {
              return (subscriber.regexp_pos.test(event.title) || subscriber.regexp_pos.test(event.content))
                && !(subscriber.regexp_neg.test(event.title) || subscriber.regexp_neg.test(event.content))
            })

            if ( subscribedEventList.length > 0 ) {
              // 사용자에게 발송될 메시지 본문을 생성한다.
              let message = generateMessage(subscribedEventList, subscriber.regexp_pos)
              // 텔레그램 봇을 통해 모임 안내 메시지를 발송한다.
              bot.sendMessage(subscriber.id, message, { parse_mode: 'Markdown' })
            }
          } catch (error) {
            // 각 안내 메시지 전송은 사용자 간 독립적으로 수행한다.
            console.error(`- Error occured during sending message, user: ${subscriber.id}, error:`, error)
          }
        })
      })
  }

  return {
    getLogger: getLogger,
    // generateMessage: generateMessage,
    notifyUser: notifyUser
  }

})()
