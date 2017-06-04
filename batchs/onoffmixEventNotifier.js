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
  
  function crawl () {
    request(_config.url, (error, response, body) => {
      if ( error ) { onRejected(error) }

      // Request 호출시간화초기화
      let taskTs = ts()

      // init cheerio context
      let promises = $('ul.todayEvent:not(.alwaysShow)', '#content', body).map(function () {
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
        // 새롭게 발견한 이벤트에 대해 Inserted object를, 그 외에는 null을 반환한다.
        return Event
          .findOne({ index: event.index })
          .then((found) => { return !found ? new Event(event).save().then((saved) => { return saved }) : null })
      })

      Promise
        .all(promises)
        .then((resultList) => {
          // 새롭게 발견한 이벤트에 대해 작업 수행 결과를 출력하고, 후처리 로직을 호출한다.
          let newEventList = resultList.filter((result) => { return result !== null })
          let newEventListStr = newEventList.reduce((event) => { return `\n[${_config.jobName}][${taskTs}] - ${event.title}` }, '')
          
          console.log(`[${_config.jobName}][${taskTs}] Request done with ${newEventList.length} events.${newEventListStr}`)
          if ( newEventList.length > 0 ) {
            notifyUser(newEventList)
          }
        })
    })
  }
  
  function loadUserInfo () {
    return User
      .find()
      .then((userList) => {
        // keyword를 등록한 사용자에 대해서만 알린다.
        userList = userList.filter((user) => { return user.tags.length > 0 })

        console.log(`[${_config.jobName}][${ts()}] Loading userInfo done with ${userList.length} users.`)
        return userList
      })
  }

  function notifyUser (eventList) {
    // 등록된 Telegram 사용자 정보를 조회한다.
    loadUserInfo()
      .then((subscriberList) => {
        subscriberList.forEach((subscriber) => {
          // 사용자가 등록한 키워드에 해당하는 모임정보만 알림 대상으로 처리한다.
          let subscribedEventList = eventList.filter((event) => { return subscriber.regexp.test(event.title) })

          if ( subscribedEventList.length > 0 ) {
            let messageHeader = `[${ts()}]\n새로운 모임을 발견했습니다.`
            let messageBody = subscribedEventList.map((event) => {
                return `${event.title}\nlink: ${event.link}`
              }).join('\n\n')

            // Markdown 형식으로 키워드를 강조한다.
            let message = `${messageHeader}\n\n${messageBody}`
              .replace(/\*/g, '') // preventing error
              .replace(subscriber.regexp, '*$1*')
            
            // 텔레그램 봇을 통해 메시지를 발송한다.
            bot.sendMessage(subscriber.id, message, { parse_mode: 'Markdown' })
          }
        })
      })
      .catch((error) => { console.error(error) })
  }

  function getRandomInterval () {
    return parseInt(Math.ceil(Math.random() * 4) + 8) * 1000 * 60
  }

  function ts () {
    return moment().format('YYYY-MM-DD HH:mm:ss')
  }

  function startInterval (task) {
    task()
    setTimeout(() => {
      startInterval(task)
    }, _config.fixedInterval || getRandomInterval())
  }

  return {
    run: () => {
      startInterval(crawl)
    }
  }

})()