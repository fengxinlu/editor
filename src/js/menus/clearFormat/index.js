/*
    clearFormat-menu
*/
import $ from '../../util/dom-core.js'

// 构造函数
function ClearFormat(editor) {
    this.editor = editor
    this.$elem = $(
        `<div class="w-e-menu">
            <i class="icon w-e-icon w-e-icon-format"></i>
        </div>`
    )
    this.type = 'click'

    // 当前是否 active 状态
    this._active = false
}

// 原型
ClearFormat.prototype = {
    constructor: ClearFormat,

    onClick: function(e) {
        const editor = this.editor
        let editorContent = editor.txt.html() // 获取文本源码
        let newContent = editorContent.replace(/style=\"(.*?)\"/g,'')
        editor.txt.html(newContent)
    }
}

export default ClearFormat