<template lang="html">
  <div class="columns">
    <div class="column is-offset-3 is-6" style="text-align: center;">
      <nav class="pagination is-centered">
        <ul class="pagination-list">
          <li class="is-small" v-for="(link, index) in guide">
            <a class="nav-dot" v-if="index !== guidePage" @click="guidePage = index"></a>
            <a class="nav-dot active" v-if="index === guidePage"></a>
          </li>
        </ul>
      </nav>
      <p style="margin: 8px 0px 12px;" v-html="guide[guidePage].content"></p>
      <img style="border: 1px solid rgba(0, 0, 0, 0.2); border-radius: 6px;" :src="guide[guidePage].imgSrc">
    </div>
  </div>
</template>

<script>
export default {
  data: function() {
    return {
      guidePage: 0,
      guide: [
        { imgSrc: '/event/subscriber/static/images/guide-0.png', content: '먼저 텔레그램에서 @OomEventNotifier를 찾아주세요.' },
        { imgSrc: '/event/subscriber/static/images/guide-1.png', content: '대화를 시작하면 바로 텔레그램 ID를 알려줍니다.' },
        { imgSrc: '/event/subscriber/static/images/guide-2.png', content: '확인하신 텔레그램 ID를 이 창에 입력해주세요.' },
        { imgSrc: '/event/subscriber/static/images/guide-3.png', content: '이제 모임 정보를 받아볼 키워드를 추가할 수 있습니다!' },
        { imgSrc: '/event/subscriber/static/images/guide-4.png', content: '추가한 키워드를 포함하는 이벤트가 등록되면<br/>텔레그램 봇이 알려드립니다.' }
      ]
    }
  }
}
</script>

<style lang="css" scoped>
/* style for dot-style pagination */
.nav-dot {
  width: 11px;
  height: 11px;
  margin: 0px 4px;
  border-radius: 100%;
  display: inline-block;
  background-color: rgba(0, 0, 0, 0.3);
}
.nav-dot.active {
  background-color: rgba(0, 0, 0, 0.6);
}
</style>
