const express = require('express')
const path = require('path')
const mongoose = require('mongoose')

// mongoose models
const Event = require('./../models/onoffmixEvent')
const User = require('./../models/telegramUser')

const router = express.Router()

router.get('/', function (req, res, next) {
  Promise.all([
    // 0: 최근 등록된 모임 목록
    _getRecentEventList(),
    // 1: 활성화된 구독자 숫자
    _getUserCount(),
    // 2: 등록된 키워드 목록
    _getTagList()
  ])
  .then((resultList) => {
    res.render('event/subscriber', {
      eventList: resultList[0],
      userCount: resultList[1],
      tagCount: resultList[2].length
    })
  })
  .catch((error) => {
    console.error(error)
    res.render('event/subscriber')
  })   
})

router.get('/:id', function (req, res, next) {
  let id = isNaN(req.params.id) ? '' : parseInt(req.params.id)

  _getUser(id)
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
  let tag = req.body['tag']

  // 문자열 only validation
  tag = typeof tag === 'string' ? tag : ''
  // 정규표현식 escape 처리
  // https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/%EC%A0%95%EA%B7%9C%EC%8B%9D
  tag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  _getUser(id)
    .then((found) => {
      if      ( tag.length < 2 || tag.length > 10 ) { res.send(_getCommonErrorObj('키워드는 2글자 이상 10글자 이하로 입력해주세요.')) }
      else if ( !found ) { res.send(_getCommonErrorObj('ID와 일치하는 사용자 정보가 존재하지 않습니다. 관리자에게 문의해주세요!')) }
      else if ( found.tags.length >= 50 ) { res.send(_getCommonErrorObj('키워드는 50개까지 등록 가능합니다.')) }
      else if ( found.tags.includes(tag) ) { res.send(_getCommonErrorObj('이미 등록한 키워드입니다.')) }
      else {
        User
          .findOneAndUpdate({ id: id }, { $push: { tags: tag } })
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
  let tag = req.body['tag']

  _getUser(id)
    .then((found) => {
      if ( !found ) { res.send(_getCommonErrorObj('ID와 일치하는 사용자 정보가 존재하지 않습니다. 관리자에게 문의해주세요!')) }
      else {
        User
          .findOneAndUpdate({ id: id }, { $pull: { tags: tag } })
          .then((result) => { res.send({ success: true }) })
      }
    })
    .catch((error) => {
      console.error(error)
      res.sendStatus(404)
    })
})

function _getRecentEventList () {
  return Event.find().sort({ extractTime: -1 }).select('title link').limit(10)
}

function _getUser (id) {
  return User.findOne({ id: id })
}

function _getUserCount () {
  return User.count({ active: 1 })
}

function _getTagList () {
  return User.distinct('tags')
}

function _getCommonErrorObj(message) {
  return {
    success: false,
    message: message
  }
}

module.exports = router
