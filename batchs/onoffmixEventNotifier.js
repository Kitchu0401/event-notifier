module.exports = (function () {

  const request = require('request')
  const $ = require('cheerio')
  const mongoose = require('mongoose')
  const moment = require('moment')
  const TelegramBot = require('node-telegram-bot-api')
  const config = require('./../config')

  // mongoose models
  const Event = require('./../models/onoffmixEvent')
  const User = require('./../models/telegramUser')
  
  const _config = config.onoffmixEventNotifier
  const bot = new TelegramBot(_config.telegramToken)

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
        // 새롭게 발견한 이벤트에 대해 Insert Promise를, 그 외에는 null을 반환한다.
        return Event
          .findOne({ index: event.index })
          .then((found) => { return !found ? new Event(event).save() : null })
      })

      Promise
        .all(promises)
        .then((resultList) => {
          // 새롭게 발견한 이벤트에 대해 작업 수행 결과를 출력하고, 후처리 로직을 호출한다.
          let newEventList = resultList.filter((result) => { return result !== null })
          console.log(`[${_config.jobName}][${taskTs}] Request done with ${newEventList.length} events.`)

          notifyUser(newEventList)
        })
    })
  }

  function notifyUser (eventList) {
    console.log('notifyUser', eventList.length, eventList)
    if ( eventList.length > 0 ) {
      
    }
  }

  function getRandomInterval () {
    return parseInt(Math.ceil(Math.random() * 3) + 12) * 1000 * 60
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
      // 배치 작업을 수행한다.
      startInterval(crawl)
    }
  }

})()