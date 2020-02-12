/*
    menu - iframe
*/
import $ from '../../util/dom-core.js'

// 构造函数
function Preview(editor) {
    this.editor = editor
    this.$elem = $('<div class="w-e-menu"><i class="icon w-e-icon w-e-icon-preview"></i></div>')
    this.type = 'click'

    // 当前是否 active 状态
    this._active = false
}

// 原型
Preview.prototype = {
    constructor: Preview,

    onClick: function () {
        const editor = this.editor
        const editorCode = editor.txt.html();
        const $body = $('body')
        const htmlCode = `${previewStyle}<div class="editor-container">${editorCode}</div>`
        const blob = new Blob([htmlCode], {
            'type': 'text/html'
        })
        const iframeSrc = window.URL.createObjectURL(blob)
        const $previewBox = $(`<div class="previewBox">
            <iframe src="${ iframeSrc }"></iframe>
        </div>`)
        $body.append($previewBox)
        const $previewClose = document.querySelector('.previewBox')
        const that = this
        $previewClose.addEventListener('click', function () {
            that._hidePreview()
        })
    },

    _hidePreview: function () {
        const $body = $('body')
        const child = document.querySelector('.previewBox')
        $body[0].removeChild(child)
    }
}
const baseSize = 32/2;
const previewStyle = `
    <style>
        html, body{
            height: 100%;
            padding: 0;
            margin: 0;
        }
        body, div, dl, dt, dd, ul, ol, li, h1, h2, h3, h4, h5, h6, pre, code, form, fieldset, legend, input, textarea, p, blockquote, th, td, hr, button, article, aside, details, figcaption, figure, footer, header, hgroup, menu, nav, section{
            margin: 0;
            padding: 0;
        }
        .editor-container {
            margin-top: 16px;
            font-size: ${baseSize}px;
            text-align: justify;
            line-height: 26px;
            word-wrap: break-word;
            padding: 20px 24px;
        }
        img {
            display: block;
            width: 100%!important;
            max-width: 100%!important;
            height: auto!important;
            margin: 8px 0 10px;
        }
        h1, h2, h3, h4, h5{
            font-weight: bold;
            padding: 15px 0;
        }
        h1 {
            font-size: ${baseSize * 2}px;
        }
        h2 {
            font-size: ${baseSize * 1.5}px;
        }
        h3 {
            font-size: ${baseSize * 1.2}px;
        }
        h4 {
            font-size: ${baseSize * 1.17}px;
        }
        h5 {
            font-size: ${baseSize * 1.1}px;
        }
    </style>
`

export default Preview