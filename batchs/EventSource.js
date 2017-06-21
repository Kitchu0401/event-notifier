const moment = require('moment')
const User = require('./../models/user')
const TelegramBot = require('node-telegram-bot-api')

const config = require('./../config')
const bot = new TelegramBot(config.telegramBotToken)

class EventSource {

  /**
   * EventSource 객체 생성자
   * @param {string} jobName EventSource 식별자로 사용될 작업명
   */
  constructor (jobName) {
    this.jobName = jobName || ' - '
  }

  /**
   * 최신 등록된 모임 목록을 추출한다.
   * 본 펑션 구현시 반드시 Promise 객체를 반환해야한다.
   * @return {Promise} 모임 정보 추출 작업 Promise 객체
   */
  request () {
    throw 'EventSource.request() must be implemented!'
    // return new Promise((onFulfilled, onRejected) => { onFulfilled(eventList) })
  }

  /**
   * request() 펑션의 fallback 프로세스로서,
   * 오류 발생시 후순위로 호출되어 모임 목록을 추출하기 위한 펑션을 정의한다.
   * 본 펑션 구현시 반드시 Promise 객체를 반환해야한다.
   * @param {Object} error request() 수행 중 발생한 예외 객체
   * @return {Promise} 모임 정보 추출 작업 Promise 객체
   */
  // fallback (error) {
  //   // return new Promise((onFulfilled, onRejected) => { onFulfilled(eventList) })
  // }

  /**
   * 모임 목록을 전달받아 후처리 작업을 수행한다.
   * 본 펑션 구현시 반드시 Promise 객체를 반환해야한다.
   * @param {Array} eventList - 모임 목록
   * @return {Promise} 후처리 작업 Promise 객체
   */
  postRequest (eventList) {
    throw 'EventSource.postRequest() must be implemented!'
    // return new Promise((onFulfilled, onRejected) => { onFulfilled(eventList) })
  }

  /**
   * 추출된 모임 정보를 받아 사용자들에게 텔레그램 메시지를 발송한다.
   * 본 펑션 구현시 반드시 Promise 객체를 반환해야한다.
   * @param {Array} eventList - 모임 목록
   * @return {Promise} 메시지 발송 작업 Promise 객체
   */
  notifyUser (eventList) {
    if ( !Array.isArray(eventList) || eventList.length <= 0 ) { return }
    
    const generateMessageBody = (event) => {
      if ( event.content.length > 50 ) { event.content = event.content.substr(0, 50) + '..' }
      return `${event.title}${event.content ? '\n' + event.content : ''}\nlink: ${event.link}`
    }

    // Telegram 사용자 정보를 조회한다.
    return User.getActiveUser()
      .then((subscriberList) => {
        subscriberList.forEach((subscriber) => {
          try {
            // 모임 제목 또는 내용이 사용자가 등록한 키워드에 해당할 경우 알림 대상으로 처리한다.
            let subscribedEventList = eventList.filter((event) => {
              return subscriber.regexp.test(event.title) || subscriber.regexp.test(event.content)
            })

            if ( subscribedEventList.length > 0 ) {
              // 사용자에게 발송될 메시지 본문을 생성한다.
              // let messageHeader = `${jobName}\n새로운 모임을 발견했습니다.`
              let messageHeader = `새로운 모임을 발견했습니다.`
              let messageBody = subscribedEventList.map(generateMessageBody).join('\n\n')

              // Markdown 형식으로 키워드를 강조한다.
              let message = `${messageHeader}\n\n${messageBody}`
                // preventing markdown error
                .replace(/[\*\[\]_]/g, '')
                .replace(subscriber.regexp, '*$1*')
              
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

  /**
   * 사용자에게 전송될 모임 정보를 조립하여 반환한다.
   * @param {Object} event - 모임 정보 객체
   * @return {String} 모임 정보 문자열
   */
  // generateMessageBody (event) {
  //   if ( event.content.length > 50 ) { event.content = event.content.substr(0, 50) + '..' }
  //   return `${event.title}${event.content ? '\n' + event.content : ''}\nlink: ${event.link}`
  // }

  /**
   * 데이터를 요청하고 처리하기 위한 Promise chain을 생성하여 반환한다.
   * - request > [fallback] > postRequest > notifyUser
   * @return {Promise} 
   */
  _initRequest () {
    const jobName = this.jobName
    const taskTs = this.taskTs

    // request
    let chain = this.request()
    // fallbacks
    chain = typeof this.fallback === 'function' ? chain.catch(this.fallback) : chain
    // postRequest
    // apply task-layer properties
    chain = chain.then((eventList) => {
      return eventList.map((event) => {
        event.source = jobName
        event.extractTime = taskTs
        return event
      })
    }).then(this.postRequest)
    // notifyUser
    chain = chain.then((newEventList) => {
      let newEventListStr = newEventList.reduce((str, event) => { return str + `\n[${jobName}][${taskTs}] - ${event.title}` }, '')
      console.log(`[${jobName}][${taskTs}] Request done with ${newEventList.length} events.${newEventListStr}`)  
      return newEventList
    }).then(this.notifyUser)
    return chain
  }

  /**
   * 로깅을 위한 Timestamp 문자열을 반환한다.
   * @return {string} Timestamp 문자열
   */
  ts () {
    return moment().format('YYYY-MM-DD HH:mm:ss')
  }

  call () {
    // 작업 호출시간 초기화
    this.taskTs = this.ts()
    console.log(`[${this.jobName}][${this.taskTs}] Job has been started.`)

    this._initRequest()
      .then(() => { console.log('Job successfully done.') })
      // .catch((error) => { console.error(`Got an error: ${error.message || error}`) })
      .catch((error) => { console.error(error) })
  }

}

module.exports = EventSource
