/*
    menu - iframe
*/
import $ from '../../util/dom-core.js'
import { getRandom } from '../../util/util.js'
import Panel from '../panel.js'

// 构造函数
function Iframe(editor) {
    this.editor = editor
    this.$elem = $('<div class="w-e-menu"><i class="icon w-e-icon w-e-icon-iframe"></i></div>')
    this.type = 'panel'

    // 当前是否 active 状态
    this._active = false
}

// 原型
Iframe.prototype = {
    constructor: Iframe,

    onClick: function () {
        this._createPanel()
    },

    _createPanel: function () {
        // 创建 id
        const textValId = getRandom('text-val')
        const btnId = getRandom('btn')

        // 创建 panel
        const panel = new Panel(this, {
            width: 350,
            // 一个 panel 多个 tab
            tabs: [
                {
                    // 标题
                    title: '插入Iframe',
                    // 模板
                    tpl: `<div>
                        <input id="${textValId}" type="text" class="block" placeholder="http://..."/>
                        <div class="w-e-button-container">
                            <button id="${btnId}" class="right">插入</button>
                        </div>
                    </div>`,
                    // 事件绑定
                    events: [
                        {
                            selector: '#' + btnId,
                            type: 'click',
                            fn: () => {
                                const $text = $('#' + textValId)
                                const val = $text.val().trim()
                                if (val) {
                                    this._insert(val)
                                }
                                // 返回 true，表示该事件执行完之后，panel 要关闭。否则 panel 不会关闭
                                return true
                            }
                        }
                    ]
                } // first tab end
            ] // tabs end
        }) // panel end

        // 显示 panel
        panel.show()

        // 记录属性
        this.panel = panel
    },

    // 插入Iframe
    _insert: function (flvSrc) {
        const editor = this.editor
        editor.cmd.do('insertHTML', '<div class="flv-box"><iframe class="video_iframe" frameborder="0" src="' + flvSrc + '"></iframe></div>')
    }
}

export default Iframe