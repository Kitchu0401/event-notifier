const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  id: Number,
  first_name: String,
  last_name: String,
  username: String,
  tags: [String],
  regexp: Object,
  active: Number
})

class User {
  static getUser (id) {
    return this.findOne({ id: id })
  }

  // 활성화되었으며, keyword를 등록한 사용자만 조회한다.
  static getActiveUser () {
    return this.find({ active: 1, 'tags.0': { $exists: true } })
  }

  static getUserCount () {
    return this.count({ active: 1 })
  }

  static getTagList () {
    return this.distinct('tags')
  }
}

// 텔레그램 사용자 스키마 공통 후처리
schema.post('find', (docs, next) => {
  docs.forEach((doc) => {
    // 정규표현식 생성을 위한 regex operator escaping
    doc.tags = doc.tags.map((tag) => { return tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") })
    // keyword 일치 확인에 사용할 정규표현식을 추가 property 형태로 저장한다.
    doc.regexp = new RegExp(`(${doc.tags.join('|')})`, 'ig')
  })
  
  next()
})

schema.loadClass(User)
module.exports = mongoose.model('user', schema)
