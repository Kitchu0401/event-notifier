const moment = require('moment')

module.exports = {

  highlight: (text, regexp, range = 10) => {
    let syntactics = text.split(' ')
    let length = syntactics.length
    for ( let i = 0; i < syntactics.length; i++ ) {
      let syntactic = syntactics[i]
      if ( regexp.test(syntactic) ) {
        let from = Math.max(0, i - range)
        let to = Math.min(length, i + range + 1)
        let prefix = from > 0 ? '..' : ''
        let suffix = to < length ? '..' : ''
        return prefix + syntactics.slice(from, to).join(' ').replace(regexp, '*$1*') + suffix
      }
    }
    return text
  },

  /**
   * 로깅을 위한 Timestamp 문자열을 반환한다.
   * @return {string} Timestamp 문자열
   */
  ts: () => {
    return moment().format('YYYY-MM-DD HH:mm:ss')
  }

}