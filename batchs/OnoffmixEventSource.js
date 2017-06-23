const axios = require('axios')
const request = require('request')
const $ = require('cheerio')

const EventSource = require('./EventSource')
const Event = require('./../models/event')

class OnoffmixEventSource extends EventSource {

  /**
   * 온오프믹스 API를 호출하여 모임 목록을 반환하는 Promise 객체를 반환한다.
   * @return {Promise} 모임 정보 추출 작업 Promise 객체
   */
  request () {
    const url = 'http://onoffmix.com/_/xmlProxy/xmlProxy.ofm?url=api.onoffmix.com%2Fevent%2Flist&output=json&pageRows=12&page=1&sort=if(recruitEndDateTime-NOW()%3E0%23+1%23+0)%7CDESC%2CFIND_IN_SET(%27advance%27%23wayOfRegistration)%7CDESC%2Cidx%7CDESC&searchAll=&exclude=&numLT=&getPinCount=true&getAttendCount=true&blockAbuse=true&s=&eventStartDate=&eventEndDate='
    const options = { 
      headers: {
        'Host': 'onoffmix.com',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 10000
    }
    const _this = this
    return axios
      .get(url, options)
      .then(function (response) {
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
            source: this.jobName,
            extractTime: this.taskTs
          }
        })
      }.bind(this))
  }

  /**
   * 온오프믹스 웹페이지를 크롤링하여 모임 목록을 반환하는 Promise 객체를 반환한다.
   * - request() 펑션의 fallback 프로세스
   * @param {Object} error request() 수행 중 발생한 예외 객체
   * @return {Promise} 모임 정보 추출 작업 Promise 객체
   */
  fallback (error) {
    if ( error ) {
      console.log('Error occured in requesting API with:')
      console.log(`- ${error.message || error}`)
      console.log('Trying alternatives: requesting crawling.')
    }
    const url = 'http://onoffmix.com/event?sort=latest'
    return new Promise(function (onFulfilled, onRejected) {
      request(url, function (error, response, body) {
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
            }
          })
          .get()
          .filter((event) => {
            // title 항목이 존재하지 않는 경우 저장하지 않는다.
            return event.title !== undefined
          })
          .forEach((event) => {
            event.source = this.jobName
            event.extractTime = this.taskTs
          })

        onFulfilled(eventList)
      })
    })
  }

  /**
   * 모임 목록을 전달받아 후처리 작업을 수행하고 새롭게 발견된 모임 정보를 필터링하여 반환하는 Promise 객체를 반환한다.
   * @param {Array} eventList - 모임 목록
   * @return {Promise} 후처리 작업 Promise 객체
   */
  postRequest (eventList) {
    return new Promise(function (onFulfilled, onRejected) {
      let savePromises = eventList.map(function (event) {
          // 새롭게 발견한 이벤트에 대해 save Promise를
          // 그 외에는 null을 반환한다.
          return Event
            .findOne({ index: event.index })
            .then((found) => {
              // 새롭게 등록되었거나 제목이 수정된 모임 정보에 대해 save Promise를, 그 외에는 null을 반환한다.
              let isNotifiable = !found || event.title !== found.title
              return true ? Event.findOneAndUpdate({ index: event.index }, event, { new: true, upsert: true }) : null
            })
        })
      
      Promise
        .all(savePromises)
        .then(function (resultList) {
          // 새롭게 발견한 이벤트에 한해 반환한다.
          let newEventList = resultList.filter((result) => { return result !== null })

          let newEventListStr = newEventList.reduce((str, event) => { return str + `\n[${this.jobName}][${this.taskTs}] - ${event.title}` }, '')
          console.log(`[${this.jobName}][${this.taskTs}] Request done with ${newEventList.length} events.${newEventListStr}`)
          onFulfilled(newEventList)
        }.bind(this))
    }.bind(this))
  }

}

module.exports = OnoffmixEventSource
