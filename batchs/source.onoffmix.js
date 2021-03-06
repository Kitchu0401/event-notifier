const _ = require('underscore')
const axios = require('axios')
const request = require('request')
const $ = require('cheerio')

const common = require('./source.common')
const util = require('./../util/util')
const Event = require('./../models/event')

module.exports = (function () {

  let jobName = 'onoffmix.com'
  let taskTs, log

  function init () {
    taskTs = util.ts()
    log = common.getLogger(jobName, taskTs)
  }

  /**
   * 온오프믹스 API를 호출하여 모임 목록을 반환하는 Promise 객체를 반환한다.
   * @return {Promise} 모임 정보 추출 작업 Promise 객체
   */
  function requestData () {
    const requestUrl = 'http://onoffmix.com/_/xmlProxy/xmlProxy.ofm?url=api.onoffmix.com%2Fevent%2Flist&output=json&pageRows=12&page=1&sort=if(recruitEndDateTime-NOW()%3E0%23+1%23+0)%7CDESC%2CFIND_IN_SET(%27advance%27%23wayOfRegistration)%7CDESC%2Cidx%7CDESC&searchAll=&exclude=&numLT=&getPinCount=true&getAttendCount=true&blockAbuse=true&s=&eventStartDate=&eventEndDate='
    const requestOpt = {
      headers: {
        'Host': 'onoffmix.com',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 25000
    }  
    return axios
      .get(requestUrl, requestOpt)
      .then(function (response) {
        // message: 'Getting event list from API has been failed: has no event data.'
        return response.data.eventList.map((event) => {
          return {
            index: event.idx,
            thumbnail: event.bannerUrl,
            link: event.eventUrl,
            title: event.title,
            content: event.abstract.replace(/\r\n/g, ' '),
            source: jobName,
            extractTime: taskTs
          }
        })
      })
      .catch(fallback)
  }

  /**
   * 온오프믹스 웹페이지를 크롤링하여 모임 목록을 반환하는 Promise 객체를 반환한다.
   * - request() 펑션의 fallback 프로세스
   * @param {Object} error request() 수행 중 발생한 예외 객체
   * @return {Promise} 모임 정보 추출 작업 Promise 객체
   */
  function fallback (error) {
    const requestUrl = 'http://onoffmix.com/event?sort=latest'
    if ( error ) {
      log('Error occured in requesting API with:')
      log(`- ${error.message || error}`)
      log('Trying alternatives: requesting crawling.')
    }
    return new Promise((onResolved, onRejected) => {
      request(requestUrl, (error, response, body) => {
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
              title: $(this).find('li.eventTitle > a').attr('title')
            }
          })
          .get()
          // title 항목이 존재하지 않는 경우 저장하지 않는다.
          .filter(event => event.title !== undefined)
          .map((event) => {
            event.source = jobName
            event.extractTime = taskTs
            return event
          })
        onResolved(eventList)
      })
    })
  }

  /**
   * 모임 목록을 전달받아 모임 정보를 저장하고
   * 새로운 모임을 필터링하여 반환하는 Promise 객체를 반환한다.
   * @param {Array} eventList - 모임 목록
   * @return {Promise} 후처리 작업 Promise 객체
   */
  function postRequest (eventList) {
    return Promise
      .all(
        _.map(eventList, (event) => {
          return Event
            .findOne({ index: event.index, source: jobName })
            .then((found) => {
              // 새롭게 등록되었거나 제목이 수정된 모임 정보에 대해 save Promise를, 그 외에는 null을 반환한다.
              let isNotifiable = !found || event.title !== found.title
              return isNotifiable ? Event.findOneAndUpdate({ index: event.index }, event, { new: true, upsert: true }) : null
            })
        })
      )
      // 새롭게 발견한 이벤트만 반환한다.
      .then(promiseList => _.filter(promiseList, promise => !!promise))
      // Logging
      .then(newEventList => {
        let newEventListStr = newEventList.reduce((str, event) => { return str + `\n - ${event.title}` }, '')
        log(`Request done with ${newEventList.length} events.${newEventListStr}`)
        return newEventList
      })
  }
  
  return {
    run: () => {
      init()
      log(`Job has been started.`)

      util.promisePipe([
        requestData,
        postRequest,
        common.notifyUser
      ])
    }
  }

})()