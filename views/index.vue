<template lang="html">
  <div id="app">
    <navigator
      :title="title"
      :user-count="userCount"
      :tag-count="tagCount">
    </navigator>
    <!-- content-anonymous -->
    <div class="container" style="padding: 20px;" v-if="!user">
      <form-login :form-id="formId" @login="login"></form-login>
      <guide></guide>
    </div>
    <!-- content-logged-user -->
    <div class="container" style="padding: 20px;" v-if="!!user">
      <div class="columns">
        <div class="column is-offset-2 is-8">
          <form-tag :user="user" :error-msg="errorMsg" @addtag="addTag"></form-tag>
        </div>
      </div>
      <div class="columns">
        <div class="column is-offset-1 is-10">
          <list-tag :tags="user.tags_pos" :type="'tags_pos'" :remove-tag="removeTag"></list-tag>
          <list-tag :tags="user.tags_neg" :type="'tags_neg'" :remove-tag="removeTag"></list-tag>
          <list-event :event-list="eventList"></list-event>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data: function() {
    return {
      formId: '',
      errorMsg: '',
      user: null
    }
  },
  methods: {
    login: function(user) {
      this.user = user
    },
    loadTagList: function (e) {
      let code = e.which || e.keyCode
      if ( code !== 13 && code !== 9 ) {
        this.formTag = e.target.value
      }
    },
    addTag: function (formTag, tagType) {
      if ( this.validate(formTag, tagType) === false ) { return }

      $.ajax({
        url: '/event/subscriber/tag',
        type: 'PUT',
        dataType: 'json',
        data: {
          id: this.user.id,
          tag: formTag,
          tagType: tagType
        }
      })
      .done(function (result) {
        if ( result.success ) {
          this.user[tagType].push(formTag)
          this.user[tagType].sort()
        } else {
          this.showError(result.message)
        }
      }.bind(this))
    },
    removeTag: function (index, tagType) {
      $.ajax({
        url: '/event/subscriber/tag',
        type: 'DELETE',
        dataType: 'json',
        data: {
          id: this.user.id,
          tag: this.user[tagType][index],
          tagType: tagType
        }
      })
      .done(function (result) {
        if ( result.success ) {
          this.user[tagType].splice(index, 1)
          this.user[tagType].sort()
        } else {
          this.showError(result.message)
        }
      }.bind(this))
    },
    validate: function (formTag, tagType) {
      try {
        if ( formTag.length < 2 || formTag.length > 10 ) throw '키워드는 2글자 이상 10글자 이하로 입력해주세요.'
        if ( this.user[tagType].includes(formTag) ) throw '이미 등록한 키워드입니다.'
        if ( this.user[tagType].length >= 50 ) throw '키워드는 50개까지 등록 가능합니다.'
      } catch (error) {
        this.showError(error)
        return false
      }
      return true
    },
    showError: function (message) {
      clearTimeout(this.errorTimeout)
      this.errorMsg = message
      this.errorTimeout = setTimeout(function () { this.errorMsg = '' }.bind(this), 3000)
    }
  }
}
</script>

<style lang="css">
/* style for vue.js transition */
.fade-enter-active, .fade-leave-active {
  transition: opacity .5s
}
.fade-enter, .fade-leave-to {
  opacity: 0
}
</style>
