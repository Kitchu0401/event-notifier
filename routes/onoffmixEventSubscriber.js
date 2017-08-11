const express = require('express')
const path = require('path')
const mongoose = require('mongoose')

// mongoose models
const Event = require('./../models/event')
const User = require('./../models/user')

const router = express.Router()

const TITLE = 'Event Notifier'

router.get('/', function (req, res, next) {
  Promise.all([
    // 0: 최근 등록된 모임 목록
    Event.getRecentEventList(),
    // 1: 활성화된 구독자 숫자
    User.getUserCount(),
    // 2: 등록된 구독 키워드 목록
    User.getPosTagList(),
    // 2: 등록된 무시 키워드 목록
    User.getNegTagList()
  ])
  .then((resultList) => {
    res.render('index', {
      data: {
        title: TITLE,
        eventList: resultList[0],
        userCount: resultList[1],
        tagCount: resultList[2].length + resultList[3].length  
      },
      vue: {
        head: {
          title: TITLE,
          meta: [
            { property: 'og:title', content: TITLE },
            { name: 'twitter:title', content: TITLE },
            // Scripts
            { script: '/event/subscriber/static/scripts/jquery-3.2.1.min.js' },
            { script: '/event/subscriber/static/scripts/vue.min.js' },
            // Styles
            { rel: 'stylesheet', type: 'text/css', style: '/event/subscriber/static/styles/bulma.min.css' },
            { rel: 'stylesheet', type: 'text/css', style: '/event/subscriber/static/styles/font-awesome.min.css' }
          ],
          structuredData: {
            "@context": "http://schema.org",
            "@type": "Organization",
            "url": "http://kitchu.lazecrew.com/event/subscriber/"
            // "contactPoint": [{
            //     "@type": "ContactPoint",
            //     "telephone": "+1-401-555-1212",
            //     "contactType": "customer service"
            // }]
          }
        },
        components: [
          'navigator',
          'login',
          'guide'
        ]
      }
    })
  })
  .catch((error) => {
    console.error(error)
    // res.render('event/subscriber')
  })   
})

router.get('/:id', function (req, res, next) {
  let id = isNaN(req.params.id) ? '' : parseInt(req.params.id)

  User.getUser(id)
    .then((found) => {
      if ( !found ) {
        res.send({
          success: false,
          message: 'ID와 일치하는 사용자 정보가 존재하지 않습니다. 관리자에게 문의해주세요!'
        })
      } else {
        res.send({
          success: true,
          user: found
        })
      }
    })
    .catch((error) => {
      console.error(error)
      res.sendStatus(404)
    })
})

router.put('/tag', function (req, res, next) {
  let id = req.body['id']
  let tagType = req.body['tagType']
  let tag = req.body['tag']

  // 문자열 only validation
  tag = typeof tag === 'string' ? tag : ''
  
  User.getUser(id)
    .then((found) => {
      if      ( tag.length < 2 || tag.length > 10 ) { res.send(_getCommonErrorObj('키워드는 2글자 이상 10글자 이하로 입력해주세요.')) }
      else if ( !found ) { res.send(_getCommonErrorObj('ID와 일치하는 사용자 정보가 존재하지 않습니다. 관리자에게 문의해주세요!')) }
      else if ( found[tagType].length >= 50 ) { res.send(_getCommonErrorObj('키워드는 50개까지 등록 가능합니다.')) }
      else if ( found[tagType].includes(tag) ) { res.send(_getCommonErrorObj('이미 등록한 키워드입니다.')) }
      else {
        User
          .findOneAndUpdate({ 'id': id }, { $push: { [tagType]: tag } })
          .then((result) => { res.send({ success: true }) })
      }
    })
    .catch((error) => {
      console.error(error)
      res.sendStatus(404)
    })
})

router.delete('/tag', function (req, res, next) {
  let id = req.body['id']
  let tagType = req.body['tagType']
  let tag = req.body['tag']

  User.getUser(id)
    .then((found) => {
      if ( !found ) { res.send(_getCommonErrorObj('ID와 일치하는 사용자 정보가 존재하지 않습니다. 관리자에게 문의해주세요!')) }
      else {
        User
          .findOneAndUpdate({ id: id }, { $pull: { [tagType]: tag } })
          .then((result) => { res.send({ success: true }) })
      }
    })
    .catch((error) => {
      console.error(error)
      res.sendStatus(404)
    })
})

function _getCommonErrorObj(message) {
  return {
    success: false,
    message: message
  }
}

module.exports = router
