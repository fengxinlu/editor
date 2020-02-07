/*
    工具
*/

// 和 UA 相关的属性
export const UA = {
    _ua: navigator.userAgent,

    // 是否 webkit
    isWebkit: function () {
        const reg = /webkit/i
        return reg.test(this._ua)
    },

    // 是否 IE
    isIE: function () {
        return 'ActiveXObject' in window
    }
}

// 遍历对象
export function objForEach(obj, fn) {
    let key, result
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            result = fn.call(obj, key, obj[key])
            if (result === false) {
                break
            }
        }
    }
}

// 遍历类数组
export function arrForEach(fakeArr, fn) {
    let i, item, result
    const length = fakeArr.length || 0
    for (i = 0; i < length; i++) {
        item = fakeArr[i]
        result = fn.call(fakeArr, item, i)
        if (result === false) {
            break
        }
    }
}

// 获取随机数
export function getRandom(prefix) {
    return prefix + Math.random().toString().slice(2)
}

// 替换 html 特殊字符
export function replaceHtmlSymbol(html) {
    if (html == null) {
        return ''
    }
    return html.replace(/</gm, '&lt;')
                .replace(/>/gm, '&gt;')
                .replace(/"/gm, '&quot;')
                .replace(/(\r\n|\r|\n)/g, '<br/>')
}

// 返回百分比的格式
export function percentFormat(number) {
    number = (parseInt(number * 100))
    return number + '%'
}

// 判断是不是 function
export function isFunction(fn) {
    return typeof fn === 'function'
}

export function hasClass(element, className) {
    if (!element) return;

    return element.classList.contains(className.trim());
}

export function isComponent(element) {
    return element && (/se-component/.test(element.className) || /^(TABLE|HR)$/.test(element.nodeName));
}

export function isWysiwygDiv(element) {
    if (element && element.nodeType === 1 && (hasClass(element, 'se-wrapper-wysiwyg') || /^BODY$/i.test(element.nodeName))) return true;
    return false;
}

export function isFormatElement(element) {
    if (element && element.nodeType === 1 && /^(P|DIV|H[1-6]|LI|TH|TD|SECTION)$/i.test(element.nodeName) && !isComponent(element) && !isWysiwygDiv(element)) return true;
    return false;
}

export function _HTMLConvertor(contents) {
    const ec = {'&': '&amp;', '\u00A0': '&nbsp;', '\'': '&quot;', '<': '&lt;', '>': '&gt;'};
    return contents.replace(/&|\u00A0|'|<|>/g, function (m) {
        return (typeof ec[m] === 'string') ? ec[m] : m;
    });
}

// 格式化节点
export function convertHTMLForCodeView(html, indentSize) {
    let returnHTML = '';
    const reg = window.RegExp;
    const brReg = new reg('^(BLOCKQUOTE|PRE|TABLE|THEAD|TBODY|TR|TH|TD|OL|UL|IMG|IFRAME|VIDEO|AUDIO|FIGURE|FIGCAPTION|HR|BR)$', 'i');
    const wDoc = typeof html === 'string' ? document.createRange().createContextualFragment(html) : html;

    indentSize *= 1;
    indentSize = indentSize > 0 ? new window.Array(indentSize + 1).join(' ') : '';

    (function recursionFunc (element, indent, lineBR) {
        const children = element.childNodes;
        const elementRegTest = brReg.test(element.nodeName);
        const elementIndent = (elementRegTest ? indent : '');

        for (let i = 0, len = children.length, node, br, nodeRegTest; i < len; i++) {
            node = children[i];
            nodeRegTest = brReg.test(node.nodeName);
            br = nodeRegTest ? '\n' : '';
            lineBR = isFormatElement(node) && !elementRegTest && !/^(TH|TD)$/i.test(element.nodeName) ? '\n' : '';

            if (node.nodeType === 3) {
                returnHTML += _HTMLConvertor((/^\n+$/.test(node.data) ? '' : node.data));
                continue;
            }

            if (node.childNodes.length === 0) {
                returnHTML += (/^(HR)$/i.test(node.nodeName) ? '\n' : '') + elementIndent + node.outerHTML + br;
                continue;
            }
            
            node.innerHTML = node.innerHTML;
            const tag = node.nodeName.toLowerCase();
            returnHTML += (lineBR || (elementRegTest ? '' : br)) + (elementIndent || nodeRegTest ? indent : '') + node.outerHTML.match(reg('<' + tag + '[^>]*>', 'i'))[0] + br;
            recursionFunc(node, indent + indentSize, '');
            returnHTML += (nodeRegTest ? indent : '') + '</' + tag + '>' + (lineBR || br || elementRegTest ? '\n' : '' || /^(TH|TD)$/i.test(node.nodeName) ? '\n' : '');
        }
    }(wDoc, '', '\n'));

    return returnHTML.trim() + '\n';
}