const mongoose = require('mongoose')
const _ = require('underscore')

const schema = new mongoose.Schema({
  id: Number,
  first_name: String,
  last_name: String,
  username: String,
  tags_pos: [String],
  tags_neg: [String],
  regexp: Object,
  active: Number
})

class User {
  static getUser (id) {
    return this.findOne({ id: id })
  }

  // 활성화되었으며, keyword를 등록한 사용자만 조회한다.
  static getActiveUser () {
    return this.find({ active: 1, 'tags_pos.0': { $exists: true } })
  }

  static getUserCount () {
    return this.count({ active: 1 })
  }

  static getPosTagList () {
    return this.distinct('tags_pos')
  }

  static getNegTagList () {
    return this.distinct('tags_neg')
  }
}

// 텔레그램 사용자 스키마 공통 후처리
schema.post('find', (docs, next) => {
  _.each(docs, (doc) => {
    _.each(['tags_pos', 'tags_neg'], (tagType) => {
      // 정규표현식 생성을 위한 regex operator escaping
      doc[tagType] = _.map(doc[tagType], (tag) => { return tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") })
      // keyword 일치 확인에 사용할 정규표현식을 추가 property 형태로 저장한다.
      doc[`regexp_${tagType}`] = new RegExp(`(${doc[tagType].join('|')})`, 'ig')
    })
  })
  
  next()
})

schema.loadClass(User)
module.exports = mongoose.model('user', schema)
