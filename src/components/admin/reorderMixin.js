// Drag & drop reordering for the admin panel's lists, plus move() for the
// arrow buttons (HTML5 drag & drop doesn't work on touch screens).
//
// Template usage on each item:
//   draggable="true"
//   @dragstart="dragStart(list, i, $event)" @dragover.prevent="dragOver(list, i)"
//   @dragend="dragEnd" @drop.prevent="dragEnd"
//   :class="{ dragging: isDragging(list, i) }"

export default {
  data() {
    return {
      drag: null, // { list, index }
    };
  },
  methods: {
    dragStart(list, index, e) {
      this.drag = { list, index };
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
      }
    },
    dragOver(list, index) {
      if (!this.drag || this.drag.list !== list || this.drag.index === index) return;
      const [item] = list.splice(this.drag.index, 1);
      list.splice(index, 0, item);
      this.drag.index = index;
    },
    dragEnd() {
      this.drag = null;
    },
    isDragging(list, index) {
      return !!this.drag && this.drag.list === list && this.drag.index === index;
    },
    move(list, index, dir) {
      const target = index + dir;
      if (target < 0 || target >= list.length) return;
      const [item] = list.splice(index, 1);
      list.splice(target, 0, item);
    },
  },
};
