const express = require('express')
const logger = require('morgan')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const bluebird = require('bluebird')

const app = express()

// middlewares
app.set('view engine', 'pug')
app.set('views', 'views')
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

// routers
app.use('/event', require('./routes/onoffmixEventSubscriber'))

// mongoose setup
const db = mongoose.connection
      db.on('error', console.error)
      db.once('open', () => { console.log('Connected to mongodb server.') })
mongoose.Promise = bluebird
mongoose.connect('mongodb://localhost/bd')

// 온오프믹스 이벤트 크롤링 배치 start
require('./batchs/onoffmixEventNotifier').run()

app.listen(8080, () => {
  console.log('Express is listening on port ' + 8080)
})
