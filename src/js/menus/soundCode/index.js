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
            <i class="icon w-e-icon w-e-icon-sound-code"></i>
        </div>`
    )
    this.type = 'click'

    // 当前是否 active 状态
    this._active = false
}

// 原型
SoundCode.prototype = {
    constructor: SoundCode,

    onClick: function(e) {
        const editor = this.editor
        const $textElem = editor.$textElem
        const $soundCodeElem = editor.$soundCodeElem // 获取源码编辑器
        const htmlEditFlag = $soundCodeElem[0].style.display // 记录编辑器是否处于编辑状态
        const editorContent = editor.txt.html() // 获取文本源码
        const editorValue = $soundCodeElem[0].value // 获取源码容器内源码value(string)
        if (htmlEditFlag === 'none') {
            $soundCodeElem[0].value = editorContent
            $soundCodeElem.css('display', 'block')
            $textElem.css('display', 'none')
            this._menusControl(false)
        } else {
            editor.txt.html(editorValue)
            $soundCodeElem.css('display', 'none')
            $textElem.css('display', 'block')
            this._menusControl(true)
        }
    },

    _menusControl: function (disable) { // 控制menu显隐
        const editor = this.editor
        const { menus: { menus } } = editor
        Object.keys(menus).map((item) => {
            const menuItem = menus[item].$elem
            item !== 'soundCode' && menuItem.css('visibility', !disable ? 'hidden' : 'visible')
        })
    }
}

export default SoundCode