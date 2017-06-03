const express = require('express')
const path = require('path')
const mongoose = require('mongoose')

// mongoose models
const User = require('./../models/telegramUser')

const router = express.Router()

router.get('/subscriber', function (req, res, next) {
  res.render('event/subscriber')
})

router.get('/subscriber/:id', function (req, res, next) {
  User
    .findOne({ id: isNaN(req.params.id) ? '' : parseInt(req.params.id) })
    .then((found) => { res.json({ found: found !== null, user: found }) })
})

router.post('/subscriber', function (req, res, next) {
  User
    .findOneAndUpdate({ id: req.body['id'] }, { $set: { tags: req.body['tags[]'] } })
    .then((result) => { res.json({ success: true }) })
    .catch((error) => { console.error(error) })
})

module.exports = router
