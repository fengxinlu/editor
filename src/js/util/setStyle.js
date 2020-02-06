/*
**设置选中文字样式
*/

// 用于记录浏览器的类型
var browser = {};
var ua = navigator.userAgent.toLowerCase();

browser.msie = (/msie ([\d.]+)/).test(ua);
browser.firefox = (/firefox\/([\d.]+)/).test(ua);
browser.chrome = (/chrome\/([\d.]+)/).test(ua);

// 获取多个节点的HTML
export function getInnerHtml (nodes) {
    var builder = [];
    for (var i = 0; i < nodes.length; i++) {
        // if (nodes[i].nodeValue != undefined){
        //     builder.push(nodes[i].innerHTML || nodes[i].nodeValue);
        // }else{
        //     if (nodes[i].textContent) builder.push(nodes[i].textContent.replace(/\</ig, function() { return "<"; }));
        //     else if (nodes[i].nodeValue) builder.push(nodes[i].nodeValue.replace(/\</ig, function() { return "<"; }));
        // }
        builder.push(nodes[i].innerHTML || nodes[i].nodeValue);
    }
    return builder;
}
export function SelectionRange (doc, range) {
    // 获取选中的内容的HTML
    this.getSelectedHtml = function () {
        if (range == null) return '';

        if (browser.msie) {
            if (range.htmlText !== undefined) return range.htmlText;
            else return '';
        } else if (browser.firefox || browser.chrome) {
            return getInnerHtml(range.cloneContents().childNodes);
        } else {
            return '';
        }
    };
    // 用html替换选中的内容的HTML
    this.replace = function (html) {
        if (range != null) {
            if (browser.msie) {
                if (range.pasteHTML !== undefined) {
                    // 当前选中html可能以为某种原因（例如点击了另一个DIV）而丢失，重新选中
                    range.select();
                    range.pasteHTML(html);
                    return true;
                }
            } else if (browser.firefox || browser.chrome) {
                if (range.deleteContents !== undefined && range.insertNode !== undefined) {
                    // 将文本html转换成DOM对象
                    var temp = html;
                    var elems = [];
                    for (var i = 0; i < temp.length; i++) {
                        var node = doc.createElement('p');
                        node.innerHTML = temp[i];
                        elems.push(node);
                    }

                    // 删除选中的节点
                    range.deleteContents();
                    // 将html对应的节点(即temp的所有子节点)逐个插入到range中，并从temp中删除
                    for (var j in elems.reverse()) {
                        temp.splice(j, 1);
                        range.insertNode(elems[j]);
                    }
                    return true;
                }
            }
        }
        return false;
    };
}

// 获取当前选中文本对应的SelectionRange对象
export function getSelectionRange (win) {
    var range = null;

    if (browser.msie) {
        range = win.document.selection.createRange();
        if (range.parentElement().document !== win.document) {
            range = null;
        }
    } else if (browser.firefox || browser.chrome) {
        var sel = win.getSelection();
        if (sel.rangeCount > 0) range = sel.getRangeAt(0); else range = null;
    }

    return new SelectionRange(win.document, range);
}

// 修改选中的HTML的样式
export function setNodeStyle (doc, node, name, value) {
    if (node.innerHTML === undefined) {
        return node;
    } else {
        node.style[name] = value;

        for (var i = 0; i < node.childNodes.length; i++) {
            var cn = node.childNodes[i];
            if (node.innerHTML !== undefined) {
                setNodeStyle(doc, cn, name, value);
            }
        }

        return node;
    }
}

export function setStyle (doc, html, name, value) {
    var dom = doc.createElement('div');
    dom.innerHTML = html;

    for (var i = 0; i < dom.childNodes.length; i++) {
        var node = dom.childNodes[i];
        if (node.innerHTML === undefined) {
            // 如果是文本节点，则转换转换成p
            var span = doc.createElement('p');
            span.style[name] = value;
            if (node.nodeValue !== undefined) span.innerHTML = node.nodeValue.replace(/\</ig, function () { return '<'; });
            else if (node.textContent !== undefined) span.innetHTML = node.textContent.replace(/\</ig, function () { return '<'; });
            // 替换掉文本节点
            dom.replaceChild(span, node);
        } else {
            setNodeStyle(doc, node, name, value);
        }
    }
    return dom.innerHTML;
}