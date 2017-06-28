const _ = require('underscore')
const axios = require('axios')
const moment = require('moment')

const common = require('./source.common')
const util = require('./../util/util')
const Event = require('./../models/event')

module.exports = (function () {

  let jobName = 'dev-meetup.github.io'
  let taskTs, now, log

  function init () {
    taskTs = util.ts()
    now = moment()
    log = common.getLogger(jobName, taskTs)
  }

  /**
   * https://dev-meetup.github.io/의 events.json raw link를 호출하여 이벤트 목록을 반환하는 Promise 객체를 반환한다.
   * @return {Promise} 이벤트 정보 추출 작업 Promise 객체
   */
  function requestData () {
    const requestUrl = 'https://raw.githubusercontent.com/dev-meetup/dev-meetup.github.io/c595265f2c784fa4a796d60abcffa5f433e85a14/data/events.json'
    const requestOpt = {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      timeout: 25000
    }  
    return axios
      .get(requestUrl, requestOpt)
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
              source: jobName,
              extractTime: taskTs
            }
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
        _.map(
          _.filter(eventList, event => !fromOnoffmix(event) && latestEvent(event)),
          (event) => {
            return Event
              .findOne({ index: event.index, source: jobName })
              .then((found) => {
                // 새롭게 등록되었거나 제목이 수정된 모임 정보에 대해 save Promise를, 그 외에는 null을 반환한다.
                let isNotifiable = !found || event.title !== found.title
                return isNotifiable ? Event.findOneAndUpdate({ index: event.index }, event, { new: true, upsert: true }) : null
              })
          }
        )
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

  function fromOnoffmix (event) { return event.link.includes('onoffmix.com') }
  function latestEvent (event) { return moment(event.eventStartDateTime).isAfter(now, 'day') }
  
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