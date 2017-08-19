<template lang="html">
  <div class="level">
    <div class="level-item level-center">
      <div class="field">
        <p class="control">
          <h3 class="title" style="text-align: center;">Welcome, {{ user.first_name }} {{ user.last_name }}</h3>
          <p style="margin-bottom: 6px; text-align: center;">Type tag and press enter!</p>
          <input type="text" class="input" name="formTag" ref="formTag" v-model="formTag" v-on:keyup.enter.stop="addTag">
          <div class="button-group" style="margin-top: 6px;">
            <a class="button is-info" style="width: 50%;" value="Button #1" @click="tagType = 'tags_pos'" :disabled="tagType !== 'tags_pos'">
              <span>Adding &nbsp;</span>
              <i class="fa fa-thumbs-o-up"></i>
            </a>
            <a class="button is-danger" style="width: 50%;" value="Button #2" @click="tagType = 'tags_neg'" :disabled="tagType !== 'tags_neg'">
              <span>Adding &nbsp;</span>
              <i class="fa fa-thumbs-o-down"></i>
            </a>
          </div>
        </p>
        <transition name="fade" v-if="errorMsg">
          <article class="message is-danger" style="margin-top: 6px; text-align: center;">
            <div class="message-body" style="padding: 6px;">{{ errorMsg }}</div>
          </article>
        </transition>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data: function() {
    return {
      formTag: '',
      tagType: 'tags_pos'
    }
  },
  props: [
    'user',
    'errorMsg'
  ],
  mounted: function () {
    this.$refs.formTag.focus()
  },
  methods: {
    addTag: function () {
      this.$emit('addtag', this.formTag, this.tagType)
    }
  }
}
</script>

<style lang="css">
.button-group > .button:first-of-type {
  border-top-right-radius: 0px;
  border-bottom-right-radius: 0px;
}
.button-group > .button:last-of-type {
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
}
</style>
