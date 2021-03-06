/*
    粘贴信息的处理
*/

import $ from './dom-core.js'
import { replaceHtmlSymbol } from './util.js'
import { objForEach } from './util.js'
import { filterWord } from './filterWord.js'

// 获取粘贴的纯文本
export function getPasteText(e) {
    const clipboardData = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData)
    let pasteText
    if (clipboardData == null) {
        pasteText = window.clipboardData && window.clipboardData.getData('text')
    } else {
        pasteText = clipboardData.getData('text/plain')
    }

    return replaceHtmlSymbol(pasteText)
}

// 获取粘贴的html
export function getPasteHtml(e, filterStyle, ignoreImg) {
    const clipboardData = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData)
    let pasteText, pasteHtml
    if (clipboardData == null) {
        pasteText = window.clipboardData && window.clipboardData.getData('text')
    } else {
        pasteText = clipboardData.getData('text/plain')
        pasteHtml = clipboardData.getData('text/html')
    }
    if (!pasteHtml && pasteText) {
        pasteHtml = '<p class="p">' + replaceHtmlSymbol(pasteText) + '</p>'
    }
    if (!pasteHtml) {
        return
    }

    // 过滤word中状态过来的无用字符
    pasteHtml = filterWord(pasteHtml)
    // const docSplitHtml = pasteHtml.split('</html>')
    // if (docSplitHtml.length === 2) {
    //     pasteHtml = docSplitHtml[0]
    // }

    // // 过滤无用标签
    // pasteHtml = pasteHtml.replace(/<(meta|script|link|style).+?>/igm, '')
    // pasteHtml = pasteHtml.replace(/<style>[\w\W\r\n]*?<\/style>/gmi, '')
    // pasteHtml = pasteHtml.replace(/<w:sdtpr[\w\W\r\n]*?<\/w:sdtpr>/gmi, '')
    // pasteHtml = pasteHtml.replace(/<o:p>[\w\W\r\n]*?<\/o:p>/gmi, '')
    // // 去掉注释
    // pasteHtml = pasteHtml.replace(/<!--[\w\W\r\n]*?-->/gmi, '')
    // // 过滤 data-xxx 属性
    // pasteHtml = pasteHtml.replace(/\s?data-.+?=('|").+?('|")/igm, '')

    // if (ignoreImg) {
    //     // 忽略图片
    //     pasteHtml = pasteHtml.replace(/<img.+?>/igm, '')
    // }

    // if (filterStyle) {
    //     // 过滤样式
    //     pasteHtml = pasteHtml.replace(/\s?(class|style)=('|").*?('|")/igm, '')
    // } else {
    //     // 保留样式
    //     pasteHtml = pasteHtml.replace(/\s?class=('|").*?('|")/igm, '')
    // }
    // 为p标签添加class
    pasteHtml = pasteHtml.replace(/<p>/g, '<p class="p">')
    return pasteHtml
}

// 获取粘贴的图片文件
export function getPasteImgs(e) {
    const result = []
    const txt = getPasteText(e)
    if (txt) {
        // 有文字，就忽略图片
        return result
    }

    const clipboardData = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData) || {}
    const items = clipboardData.items
    if (!items) {
        return result
    }

    objForEach(items, (key, value) => {
        const type = value.type
        if (/image/i.test(type)) {
            result.push(value.getAsFile())
        }
    })

    return result
}