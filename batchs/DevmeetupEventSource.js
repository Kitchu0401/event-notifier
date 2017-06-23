const axios = require('axios')
const request = require('request')
const $ = require('cheerio')
const moment = require('moment')

const EventSource = require('./_EventSource')
const Event = require('./../models/event')

class DevmeetupEventSource extends EventSource {

  /**
   * DevmeetupEventSource 구현체 생성자
   * EventSource 식별자로 사용될 작업명을 정의해주는걸 권장한다.
   */
  constructor () {
    super()
    this.jobName = 'dev-meetup.github.io'
  }

  /**
   * https://dev-meetup.github.io/의 events.json raw link를 호출하여 이벤트 목록을 반환하는 Promise 객체를 반환한다.
   * @return {Promise} 이벤트 정보 추출 작업 Promise 객체
   */
  request () {
    const url = 'https://raw.githubusercontent.com/dev-meetup/dev-meetup.github.io/c595265f2c784fa4a796d60abcffa5f433e85a14/data/events.json'
    const options = { 
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      timeout: 10000
    }
    return axios
      .get(url, options)
      .then(function (response) {
        return response.data.events
          .map((event) => {
            return {
              index: event.id,
              link: event.url,
              title: event.title,
              eventStartDateTime: event.start,
              eventEndDateTime: event.end,
              tags: event.tags,
              source: this.jobName,
              extractTime: this.taskTs
            }
          })
      }.bind(this))
  }

  /**
   * 모임 목록을 전달받아 후처리 작업을 수행하고 새롭게 발견된 ㅇ벤트 정보를 필터링하여 반환하는 Promise 객체를 반환한다.
   * @param {Array} eventList - 이벤트 목록
   * @return {Promise} 후처리 작업 Promise 객체
   */
  postRequest (eventList) {
    return new Promise(function (onFulfilled, onRejected) {
      try {
        const now = moment()
        let savePromises = eventList
          .filter((event) => {
            // 타 배치작업에서 다루는 소스일 경우 제외한다.
            return !event.link.includes('onoffmix.com')
              // 이벤트 시작일이 현재보다 이전일 경우 제외한다.
              && moment(event.eventStartDateTime).isAfter(now, 'day')
          })
          .map((event) => {
            return Event
              .findOne({ index: event.index, source: this.jobName })
              .then((found) => {
                // 새롭게 등록되었거나 제목이 수정된 모임 정보에 대해 save Promise를, 그 외에는 null을 반환한다.
                let isNotifiable = !found || event.title !== found.title
                return isNotifiable ? Event.findOneAndUpdate({ index: event.index }, event, { new: true, upsert: true }) : null
              })
          })
        
        Promise
          .all(savePromises)
          .then((resultList) => {
            // 새롭게 발견한 이벤트에 한해 반환한다.
            let newEventList = resultList.filter((result) => { return result !== null })
            let newEventListStr = newEventList.reduce((str, event) => { return str + `\n[${this.jobName}][${this.taskTs}] - ${event.title}` }, '')
            console.log(`[${this.jobName}][${this.taskTs}] Request done with ${newEventList.length} events.${newEventListStr}`)
            onFulfilled(newEventList)
          })
      } catch (error) {
        onRejected(error)
      }
    }.bind(this))
  }

}

module.exports = DevmeetupEventSource
