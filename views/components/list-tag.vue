<template lang="html">
  <div class="tag-list" v-if="tags.length > 0">
    <p class="tag-header">
      <span>{{ type === 'pos' ? 'Like' : 'Dislike' }} these keywords &nbsp;</span>
      <i class="fa fa-thumbs-o-up"></i>
    </p>
    <span class="tag is-medium" v-for="(tag, index) in tags">
      {{ tag }}
      <button class="delete is-small" @click="removeTag(index, type)">
    </span>
  </div>
</template>

<script>
export default {
  props: [
    'tags',
    'type',
    'removeTag'
  ]
}
</script>

<style lang="css">
.tag-list { text-align: center; /* margin-bottom: .75rem; */ }
.tag-list .tag-header { padding: 6px; margin: 0px 0px 12px; color: #7a7a7a; border-bottom: 1px solid #7a7a7a; }
.tag-list .tag { margin-right: 8px; margin-bottom: 8px; }
</style>
