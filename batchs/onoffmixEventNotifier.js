module.exports = (function () {

  const request = require('request')
  const $ = require('cheerio')
  const mongoose = require('mongoose')
  const moment = require('moment')
  const TelegramBot = require('node-telegram-bot-api')

  // mongoose models
  const Event = require('./../models/onoffmixEvent')
  const User = require('./../models/telegramUser')
  
  const _config = require('./../config')['onoffmixEventNotifier']
  const bot = new TelegramBot(_config.telegramBotToken)

  console.log(`[${_config.jobName}] TelegramBot has been initialized with token: ${_config.telegramBotToken}`)
  
  /**
   * 모임정보를 추출하여 텔레그램 메시지를 발송한다.
   */
  function crawl () {
    request(_config.url, (error, response, body) => {
      if ( error ) {
        console.error(error)
        return
      }

      // Request 호출시간 초기화
      let taskTs = ts()

      // 크롤링으로 추출한 이벤트 객체들을 각각
      // db existance check > save Promise로 래핑하여 반환한다.
      let promises = $('ul.todayEvent:not(.alwaysShow)', '#content', body)
        .map(function () {
          // cheerio context 내 'this'는 selector에서 선택된 가상 DOM element
          let event = {
            index: $(this).attr('_idx'),
            thumbnail: $(this).find('li.eventThumbnail > a > img').attr('src'),
            link: $(this).find('li.eventTitle > a').attr('href'),
            title: $(this).find('li.eventTitle > a').attr('title'),
            extractTime: taskTs
          }

          // title 항목이 존재하지 않는 경우 저장하지 않는다.
          return event.title ? event : null
        })
        .get()
        .map((event) => {
          // 새롭게 발견한 이벤트에 대해 save Promise를
          // 그 외에는 null을 반환한다.
          return Event
            .findOne({ index: event.index })
            .then((found) => { return !found ? new Event(event).save() : null })
        })

      Promise
        .all(promises)
        .then((resultList) => {
          // 새롭게 발견한 이벤트에 대해
          let newEventList = resultList.filter((result) => { return result !== null })

          // 작업 수행 결과를 출력하고
          let newEventListStr = newEventList.reduce((str, event) => { return str + `\n[${_config.jobName}][${taskTs}] - ${event.title}` }, '')
          console.log(`[${_config.jobName}][${taskTs}] Request done with ${newEventList.length} events.${newEventListStr}`)

          // 후처리 로직을 호출한다.
          if ( newEventList.length > 0 ) {
            notifyUser(newEventList)
          }
        })
    })
  }

  /**
   * 신규 모임 정보를 받아 대상 사용자들에게 텔레그램 메시지를 발송한다.
   * @param {Array} eventList - 신규 모임 목록
   */
  function notifyUser (eventList) {
    // Telegram 사용자 정보를 조회한다.
    loadUserInfo()
      .then((subscriberList) => {
        subscriberList.forEach((subscriber) => {
          // 사용자가 등록한 키워드에 해당하는 모임정보만 알림 대상으로 처리한다.
          let subscribedEventList = eventList.filter((event) => { return subscriber.regexp.test(event.title) })

          if ( subscribedEventList.length > 0 ) {
            // 사용자에게 발송될 메시지 본문을 생성한다.
            let messageHeader = `[${ts()}]\n새로운 모임을 발견했습니다.`
            let messageBody = subscribedEventList.map((event) => {
                return `${event.title}\nlink: ${event.link}`
              }).join('\n\n')

            // Markdown 형식으로 키워드를 강조한다.
            let message = `${messageHeader}\n\n${messageBody}`
              .replace(/\*/g, '') // preventing error
              .replace(subscriber.regexp, '*$1*')
            
            // 텔레그램 봇을 통해 모임 안내 메시지를 발송한다.
            bot.sendMessage(subscriber.id, message, { parse_mode: 'Markdown' })
          }
        })
      })
      .catch((error) => { console.error(error) })
  }
  
  /**
   * 메시지 발송을 위한 사용자 목록 조회 promise를 반환한다.
   * @return {Promise} 사용자 목록 조회 promise
   */
  function loadUserInfo () {
    return User
      // 활성화되었으며,
      // keyword를 등록한 사용자만 조회한다.
      .find({ active: 1, 'tags.0': { $exists: true } })
      .then((userList) => {
        console.log(`[${_config.jobName}][${ts()}] Loading userInfo done with ${userList.length} users.`)
        return userList
      })
  }

  /**
   * 작업 간격으로 활용할 millisecond 단위 무작위 int 값을 반환한다.
   * @return {number} 작업 간격
   */
  function getRandomInterval () {
    return parseInt(Math.ceil(Math.random() * 4) + 8) * 1000 * 60
  }

  /**
   * 로깅을 위한 Timestamp 문자열을 반환한다.
   * @return {string} Timestamp 문자열
   */
  function ts () {
    return moment().format('YYYY-MM-DD HH:mm:ss')
  }

  return {
    run: () => {
      crawl()
    }
  }

})()
