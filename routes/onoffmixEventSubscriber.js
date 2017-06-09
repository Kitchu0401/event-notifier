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
  User
    .findOne({ id: isNaN(req.params.id) ? '' : parseInt(req.params.id) })
    .then((found) => { res.json({ found: found !== null, user: found }) })
})

router.post('/', function (req, res, next) {
  User
    .findOneAndUpdate({ id: req.body['id'] }, { $set: { tags: req.body['tags[]'] } })
    .then((result) => { res.json({ success: true }) })
    .catch((error) => { console.error(error) })
})

function _getRecentEventList () {
  return Event.find().sort({ extractTime: -1 }).select('title link').limit(10)
}

function _getUserCount () {
  return User.count({ active: 1 })
}

function _getTagList () {
  return User.distinct('tags')
}

module.exports = router
