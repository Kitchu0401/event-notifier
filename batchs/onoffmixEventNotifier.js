module.exports = (function () {

  const axios = require('axios')
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

  let taskTs

  console.log(`[${_config.jobName}] TelegramBot has been initialized with token: ${_config.telegramBotToken}`)

  /**
   * 모임 정보 API를 호출하여 최신 등록된 모임 목록을 반환한다.
   * @return {Array} 모임 목록
   */
  function requestEventInfo () {
    const url = _config.url
    const options = { 
      headers: {
        'Host': 'onoffmix.com',
        'X-Requested-With': 'XMLHttpRequest'
      }
    }

    return axios
      .get(url, options)
      .then((result) => {
        return result.data.eventList.map((event) => {
          return {
            index: event.idx,
            thumbnail: event.bannerUrl,
            link: event.eventUrl,
            title: event.title,
            content: event.abstract.replace(/\r\n/g, ' '),
            extractTime: taskTs,
            source: _config.source
          }
        })
      })
  }

  /**
   * 모임 정보 사이트를 크롤링하여 모임 목록을 반환한다.
   * 본 펑션은 requestEventInfo 의 fallback function으로,
   * 해당 펑션에서 오류가 발생 할 경우 호출된다.
   * @return {Array} 모임 목록
   */
  function crawl () {
    return new Promise((onFulfilled, onRejected) => {
      request(_config.url, (error, response, body) => {
        if ( error ) {
          onRejected(error)
        }

        // 크롤링한 웹페이지에서 유효한 모임 정보를 추출하여 반환한다.
        let eventList = $('ul.todayEvent:not(.alwaysShow)', '#content', body)
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

        onFulfilled(eventList)
      })
    })
  }

  /**
   * 모임 목록을 전달받아 후처리 작업을 수행하고 새롭게 발견된 모임 정보를 필터링하여 반환한다.
   * @param {Array} eventList - 모임 목록
   */
  function postExtract (eventList) {
    return new Promise((onFulfilled, onRejected) => {
      let savePromises = eventList.map((event) => {
          return Event
            .findOne({ index: event.index })
            .then((found) => {
              // 새롭게 등록되었거나 제목이 수정된 모임 정보에 대해 save Promise를, 그 외에는 null을 반환한다.
              let isNotifiable = !found || event.title !== found.title
              return isNotifiable ? Event.findOneAndUpdate({ index: event.index }, event, { new: true, upsert: true }) : null
            })
        })
      
      Promise
        .all(savePromises)
        .then((resultList) => {
          // 새롭게 발견한 이벤트에 대해
          let newEventList = resultList.filter((result) => { return result !== null })
  
          // 작업 수행 결과를 출력하고
          let newEventListStr = newEventList.reduce((str, event) => { return str + `\n[${_config.jobName}][${taskTs}] - ${event.title}` }, '')
          console.log(`[${_config.jobName}][${taskTs}] Request done with ${newEventList.length} events.${newEventListStr}`)

          onFulfilled(newEventList)
        })
    })
  }

  /**
   * 신규 모임 정보를 받아 대상 사용자들에게 텔레그램 메시지를 발송한다.
   * @param {Array} eventList - 신규 모임 목록
   */
  function notifyUser (eventList) {
    if ( !Array.isArray(eventList) || eventList.length <= 0 ) { return }

    // Telegram 사용자 정보를 조회한다.
    loadUserInfo()
      .then((subscriberList) => {
        subscriberList.forEach((subscriber) => {
          try {
            // 모임 제목 또는 내용이 사용자가 등록한 키워드에 해당할 경우 알림 대상으로 처리한다.
            let subscribedEventList = eventList.filter((event) => {
              return subscriber.regexp.test(event.title) || subscriber.regexp.test(event.content)
            })

            if ( subscribedEventList.length > 0 ) {
              // 사용자에게 발송될 메시지 본문을 생성한다.
              let messageHeader = `${_config.source}\n새로운 모임을 발견했습니다.`
              let messageBody = subscribedEventList.map(generateMessageBody).join('\n\n')

              // Markdown 형식으로 키워드를 강조한다.
              let message = `${messageHeader}\n\n${messageBody}`
                .replace(/[\*\[\]]/g, '') // preventing error
                .replace(subscriber.regexp, '*$1*')
              
              // 텔레그램 봇을 통해 모임 안내 메시지를 발송한다.
              bot.sendMessage(subscriber.id, message, { parse_mode: 'Markdown' })
            }
          } catch (error) {
            // 각 안내 메시지 전송은 사용자 간 독립적으로 수행한다.
            console.error(`[${_config.jobName}][${taskTs}] Error occured during sending message, user: ${subscriber.id}, error:`, error)
          }
        })

        console.log(`[${_config.jobName}][${ts()}] Job has been done.`)
      })
  }
  
  /**
   * 메시지 발송을 위한 사용자 목록 조회 promise를 반환한다.
   * @return {Promise} 사용자 목록 조회 promise
   */
  function loadUserInfo () {
    return User
      // 활성화되었으며, keyword를 등록한 사용자만 조회한다.
      .find({ active: 1, 'tags.0': { $exists: true } })
      .then((userList) => {
        console.log(`[${_config.jobName}][${ts()}] Loading userInfo done with ${userList.length} users.`)
        return userList
      })
  }

  /**
   * 사용자에게 전송될 모임 정보를 조립하여 반환한다.
   * @param {Object} event - 모임 정보 객체
   * @return {String} 모임 정보 문자열
   */
  function generateMessageBody (event) {
    if ( event.content.length > 50 ) { event.content = event.content.substr(0, 50) + '..' }
    return `${event.title}${event.content ? '\n' + event.content : ''}\nlink: ${event.link}`
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
      // 작업 호출시간 초기화
      taskTs = ts()
      console.log(`[${_config.jobName}][${taskTs}] Job has been started.`)

      requestEventInfo()
        .catch(crawl)
        .then(postExtract)
        .then(notifyUser)
        .catch((error) => {
          console.error(`[${_config.jobName}][${taskTs}] An error occured:`)
          console.error(error)
        })
    }
  }

})()
