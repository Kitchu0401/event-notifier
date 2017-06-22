module.exports = (function () {

  const axios = require('axios')
  const request = require('request')
  const $ = require('cheerio')
  const mongoose = require('mongoose')
  const util = require('./../util/util')
  const TelegramBot = require('node-telegram-bot-api')

  // mongoose models
  const Event = require('./../models/event')
  const User = require('./../models/user')
  
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
      },
      timeout: 10000
    }

    return axios
      .get(url, options)
      .then((response) => {
        if ( !response.data.eventList ) { 
          throw {
            response: response,
            message: `Getting event list from API has been failed: has no event data.`
          }
        }
        return response.data.eventList.map((event) => {
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
  function crawl (error) {
    if ( error ) {
      console.log('Error occured in requesting API with:')
      console.log(`- ${error.message || error}`)
      console.log('Trying alternatives: requesting crawling.')
    }
    return new Promise((onFulfilled, onRejected) => {
      request(_config.url_crawl, (error, response, body) => {
        if ( error ) {
          onRejected(error)
        }

        // 크롤링한 웹페이지에서 유효한 모임 정보를 추출하여 반환한다.
        let eventList = $('ul.todayEvent:not(.alwaysShow)', '#content', body)
          .map(function () {
            // cheerio context 내 'this'는 selector에서 선택된 가상 DOM element
            return {
              index: $(this).attr('_idx'),
              thumbnail: $(this).find('li.eventThumbnail > a > img').attr('src'),
              link: $(this).find('li.eventTitle > a').attr('href'),
              title: $(this).find('li.eventTitle > a').attr('title'),
              extractTime: taskTs,
              source: _config.source
            }
          })
          .get()
          .filter((event) => {
            // title 항목이 존재하지 않는 경우 저장하지 않는다.
            return event.title !== undefined
          })

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
              let messageBody = subscribedEventList.map((event) => {
                return generateMessageBody(event, subscriber.regexp)
              }).join('\n\n')

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

        console.log(`[${_config.jobName}][${util.ts()}] Job has been done.`)
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
        console.log(`[${_config.jobName}][${util.ts()}] Loading userInfo done with ${userList.length} users.`)
        return userList
      })
  }

  /**
   * 사용자에게 전송될 모임 정보를 조립하여 반환한다.
   * @param {Object} event - 모임 정보 객체
   * @param {Object} regexp - 사용자 태그로 구성된 정규표현식
   * @return {String} 모임 정보 문자열
   */
  function generateMessageBody (event, regexp) {
    let content = regexp && regexp.test(event.content) ? util.highlight(event.content, regexp) : ''
    return `${event.title}\n${content ? content + '\n' : ''}link: ${event.link}`
  }

  return {
    run: () => {
      // 작업 호출시간 초기화
      taskTs = util.ts()
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
