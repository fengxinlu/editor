/*
    menu - code
*/
import $ from '../../util/dom-core.js'
import { getRandom, replaceHtmlSymbol } from '../../util/util.js'
import Panel from '../panel.js'
import { UA } from '../../util/util.js'

// 构造函数
function SoundCode(editor) {
    this.editor = editor
    this.$elem = $(
        `<div class="w-e-menu">
            源码
        </div>`
    )
    // 当前是否 active 状态
    this._active = false
}

// 原型
SoundCode.prototype = {
    constructor: SoundCode,
    onClick: function(e) {
        const editor = this.editor
        console.log(editor, 'editor-----')
    }
}

export default SoundCode