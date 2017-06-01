let request = require('request')
let cheerio = require('cheerio')
let mongoose = require('mongoose')
let moment = require('moment')
// let TelegramBot = require('node-telegram-bot-api')

// mongoose setup
const db = mongoose.connection
      db.on('error', console.error)
      db.once('open', () => { console.log('Connected to mongodb server.') })
mongoose.connect('mongodb://localhost/bd')

const Event = mongoose.model(
  'event',
  new mongoose.Schema({
    index: String,
    thumbnail: String,
    link: String,
    title: String
  })
)

const log = true
const url = 'http://onoffmix.com/event?sort=latest'

// 데이터를 크롤링하여 파일에 저장
// crawl()
startRandomInterval(crawl)

function crawl () {
  request(url, (error, response, body) => {
    if ( error ) { console.error(`[${ts()}] ${error}`); return }

    // init cheerio context
    const $ = cheerio.load(body)

    $('ul.todayEvent:not(.alwaysShow)', '#content').each(function () {
      let event = {
        index: $(this).attr('_idx'),
        thumbnail: $(this).find('li.eventThumbnail > a > img').attr('src'),
        link: $(this).find('li.eventTitle > a').attr('href'),
        title: $(this).find('li.eventTitle > a').attr('title')
      }

      // title 항목이 존재하지 않는 경우 저장하지 않는다.
      if ( !event.title ) { return }

      Event.findOneAndUpdate({ index: event.index }, event, { new: true, upsert: true })
        .then((saved) => { log && console.log(`[${ts()}] ${saved.title} saved.`) })
        .catch((error) => { console.error(`[${ts()}] ${error}`) })
    })
  })
}

function startRandomInterval (task) {
  setTimeout(() => {
    task()
    startRandomInterval(task)
  }, getRandomInterval())
}

function getRandomInterval () {
  return parseInt(Math.random() * 5 + 15) * 1000 * 60
}

function ts() {
  return moment().format('YYYY-MM-DD HH:mm:ss')
}
