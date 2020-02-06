/*
    menu - lineHeight
*/
import $ from '../../util/dom-core.js'
import DropList from '../droplist.js'
import { getSelectionRange, getSelectedHtml, setStyle } from '../../util/setStyle.js'

// 构造函数
function lineHeight(editor) {
    this.editor = editor
    this.$elem = $(
        `<div class="w-e-menu">
            <i class="icon w-e-icon w-e-icon-line-height"></i>
        </div>`
    )
    this.type = 'droplist'

    // 当前是否 active 状态
    this._active = false

    // 初始化 droplist
    this.droplist = new DropList(this, {
        width: 100,
        $title: $('<p>设置行高</p>'),
        type: 'list', // droplist 以列表形式展示
        list: [
            { $elem: $('<p>1</p>'), value: '1' },
            { $elem: $('<p>1.5</p>'), value: '1.5' },
            { $elem: $('<p>1.75</p>'), value: '1.75' },
            { $elem: $('<p>2</p>'), value: '2' },
            { $elem: $('<p>3</p>'), value: '3' },
            { $elem: $('<p>4</p>'), value: '4' },
            { $elem: $('<p>5</p>'), value: '5' }
        ],
        onClick: (value) => {
            // 注意 this 是指向当前的 lineHeight 对象
            this._command(value)
        }
    })
}

// 原型
lineHeight.prototype = {
    onstructor: lineHeight,

    // 执行命令
    _command: function (val) {
        const editor = this.editor
        console.log(val, '111111')
        const isSeleEmpty = editor.selection.isSelectionEmpty()

        if (isSeleEmpty) {
            // 选区是空的，插入并选中一个“空白”
            // editor.selection.createEmptyRange()
        }
        editor.selection.restoreSelection();
        this._setLineHeight(val)
    },
    // 设置行高
    _setLineHeight: function (val) {
        val = val == 1 ? 'unset' : (val + 'em');
        var range = getSelectionRange(window);
        var selectNodes = range.getSelectedHtml();
        var targetNodes = [];
        for (var i = 0; i < selectNodes.length; i++) {
            var html = setStyle(document, selectNodes[i], 'lineHeight', val);
            targetNodes.push(html);
        }
        range.replace(targetNodes);
    }
}

export default lineHeight