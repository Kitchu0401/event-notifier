const express = require('express')
const path = require('path')
const mongoose = require('mongoose')

// mongoose models
const Event = require('./../models/onoffmixEvent')
const User = require('./../models/telegramUser')

const router = express.Router()

router.get('/', function (req, res, next) {
  Event
    .find()
    .sort({ extractTime: -1 })
    .select('title link')
    .limit(10)
    .then((found) => {
      res.render('event/subscriber', { eventList: found })
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

module.exports = router
