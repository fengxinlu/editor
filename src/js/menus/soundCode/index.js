/*
    menu - soundCode
*/
import $ from '../../util/dom-core.js'
import { convertHTMLForCodeView } from '../../util/util.js'

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
        const codeMirror = editor.codeMirror
        const $textElem = editor.$textElem
        const $soundCodeElem = document.querySelector('.CodeMirror') // 获取源码编辑器
        const htmlEditFlag = $soundCodeElem.style.visibility // 记录编辑器是否处于编辑状态
        const editorContent = convertHTMLForCodeView($textElem[0], 4) // 获取文本源码
        const editorValue = codeMirror.getValue() // 获取源码容器内源码value(string)

        if (htmlEditFlag === 'hidden') {
            $soundCodeElem.setAttribute('style', 'visibility: visible; border-bottom: 1px solid #ccc')

            codeMirror.setValue(editorContent)
            $textElem.css('display', 'none')
            this._menusControl(false)
        } else {
            editor.txt.html(editorValue)
            $soundCodeElem.setAttribute('style', 'visibility: hidden')
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