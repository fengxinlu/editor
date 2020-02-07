(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.wangEditor = factory());
}(this, (function () { 'use strict';

/*
    poly-fill
*/

var polyfill = function () {

    // Object.assign
    if (typeof Object.assign != 'function') {
        Object.assign = function (target, varArgs) {
            // .length of function is 2
            if (target == null) {
                // TypeError if undefined or null
                throw new TypeError('Cannot convert undefined or null to object');
            }

            var to = Object(target);

            for (var index = 1; index < arguments.length; index++) {
                var nextSource = arguments[index];

                if (nextSource != null) {
                    // Skip over if undefined or null
                    for (var nextKey in nextSource) {
                        // Avoid bugs when hasOwnProperty is shadowed
                        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        };
    }

    // IE 中兼容 Element.prototype.matches
    if (!Element.prototype.matches) {
        Element.prototype.matches = Element.prototype.matchesSelector || Element.prototype.mozMatchesSelector || Element.prototype.msMatchesSelector || Element.prototype.oMatchesSelector || Element.prototype.webkitMatchesSelector || function (s) {
            var matches = (this.document || this.ownerDocument).querySelectorAll(s),
                i = matches.length;
            while (--i >= 0 && matches.item(i) !== this) {}
            return i > -1;
        };
    }
};

/*
    DOM 操作 API
*/

// 根据 html 代码片段创建 dom 对象
function createElemByHTML(html) {
    var div = void 0;
    div = document.createElement('div');
    div.innerHTML = html;
    return div.children;
}

// 是否是 DOM List
function isDOMList(selector) {
    if (!selector) {
        return false;
    }
    if (selector instanceof HTMLCollection || selector instanceof NodeList) {
        return true;
    }
    return false;
}

// 封装 document.querySelectorAll
function querySelectorAll(selector) {
    var result = document.querySelectorAll(selector);
    if (isDOMList(result)) {
        return result;
    } else {
        return [result];
    }
}

// 记录所有的事件绑定
var eventList = [];

// 创建构造函数
function DomElement(selector) {
    if (!selector) {
        return;
    }

    // selector 本来就是 DomElement 对象，直接返回
    if (selector instanceof DomElement) {
        return selector;
    }

    this.selector = selector;
    var nodeType = selector.nodeType;

    // 根据 selector 得出的结果（如 DOM，DOM List）
    var selectorResult = [];
    if (nodeType === 9) {
        // document 节点
        selectorResult = [selector];
    } else if (nodeType === 1) {
        // 单个 DOM 节点
        selectorResult = [selector];
    } else if (isDOMList(selector) || selector instanceof Array) {
        // DOM List 或者数组
        selectorResult = selector;
    } else if (typeof selector === 'string') {
        // 字符串
        selector = selector.replace('/\n/mg', '').trim();
        if (selector.indexOf('<') === 0) {
            // 如 <div>
            selectorResult = createElemByHTML(selector);
        } else {
            // 如 #id .class
            selectorResult = querySelectorAll(selector);
        }
    }

    var length = selectorResult.length;
    if (!length) {
        // 空数组
        return this;
    }

    // 加入 DOM 节点
    var i = void 0;
    for (i = 0; i < length; i++) {
        this[i] = selectorResult[i];
    }
    this.length = length;
}

// 修改原型
DomElement.prototype = {
    constructor: DomElement,

    // 类数组，forEach
    forEach: function forEach(fn) {
        var i = void 0;
        for (i = 0; i < this.length; i++) {
            var elem = this[i];
            var result = fn.call(elem, elem, i);
            if (result === false) {
                break;
            }
        }
        return this;
    },

    // clone
    clone: function clone(deep) {
        var cloneList = [];
        this.forEach(function (elem) {
            cloneList.push(elem.cloneNode(!!deep));
        });
        return $(cloneList);
    },

    // 获取第几个元素
    get: function get(index) {
        var length = this.length;
        if (index >= length) {
            index = index % length;
        }
        return $(this[index]);
    },

    // 第一个
    first: function first() {
        return this.get(0);
    },

    // 最后一个
    last: function last() {
        var length = this.length;
        return this.get(length - 1);
    },

    // 绑定事件
    on: function on(type, selector, fn) {
        // selector 不为空，证明绑定事件要加代理
        if (!fn) {
            fn = selector;
            selector = null;
        }

        // type 是否有多个
        var types = [];
        types = type.split(/\s+/);

        return this.forEach(function (elem) {
            types.forEach(function (type) {
                if (!type) {
                    return;
                }

                // 记录下，方便后面解绑
                eventList.push({
                    elem: elem,
                    type: type,
                    fn: fn
                });

                if (!selector) {
                    // 无代理
                    elem.addEventListener(type, fn);
                    return;
                }

                // 有代理
                elem.addEventListener(type, function (e) {
                    var target = e.target;
                    if (target.matches(selector)) {
                        fn.call(target, e);
                    }
                });
            });
        });
    },

    // 取消事件绑定
    off: function off(type, fn) {
        return this.forEach(function (elem) {
            elem.removeEventListener(type, fn);
        });
    },

    // 获取/设置 属性
    attr: function attr(key, val) {
        if (val == null) {
            // 获取值
            return this[0].getAttribute(key);
        } else {
            // 设置值
            return this.forEach(function (elem) {
                elem.setAttribute(key, val);
            });
        }
    },

    // 添加 class
    addClass: function addClass(className) {
        if (!className) {
            return this;
        }
        return this.forEach(function (elem) {
            var arr = void 0;
            if (elem.className) {
                // 解析当前 className 转换为数组
                arr = elem.className.split(/\s/);
                arr = arr.filter(function (item) {
                    return !!item.trim();
                });
                // 添加 class
                if (arr.indexOf(className) < 0) {
                    arr.push(className);
                }
                // 修改 elem.class
                elem.className = arr.join(' ');
            } else {
                elem.className = className;
            }
        });
    },

    // 删除 class
    removeClass: function removeClass(className) {
        if (!className) {
            return this;
        }
        return this.forEach(function (elem) {
            var arr = void 0;
            if (elem.className) {
                // 解析当前 className 转换为数组
                arr = elem.className.split(/\s/);
                arr = arr.filter(function (item) {
                    item = item.trim();
                    // 删除 class
                    if (!item || item === className) {
                        return false;
                    }
                    return true;
                });
                // 修改 elem.class
                elem.className = arr.join(' ');
            }
        });
    },

    // 修改 css
    css: function css(key, val) {
        var currentStyle = key + ':' + val + ';';
        return this.forEach(function (elem) {
            var style = (elem.getAttribute('style') || '').trim();
            var styleArr = void 0,
                resultArr = [];
            if (style) {
                // 将 style 按照 ; 拆分为数组
                styleArr = style.split(';');
                styleArr.forEach(function (item) {
                    // 对每项样式，按照 : 拆分为 key 和 value
                    var arr = item.split(':').map(function (i) {
                        return i.trim();
                    });
                    if (arr.length === 2) {
                        resultArr.push(arr[0] + ':' + arr[1]);
                    }
                });
                // 替换或者新增
                resultArr = resultArr.map(function (item) {
                    if (item.indexOf(key) === 0) {
                        return currentStyle;
                    } else {
                        return item;
                    }
                });
                if (resultArr.indexOf(currentStyle) < 0) {
                    resultArr.push(currentStyle);
                }
                // 结果
                elem.setAttribute('style', resultArr.join('; '));
            } else {
                // style 无值
                elem.setAttribute('style', currentStyle);
            }
        });
    },

    // 显示
    show: function show() {
        return this.css('display', 'block');
    },

    // 隐藏
    hide: function hide() {
        return this.css('display', 'none');
    },

    // 获取子节点
    children: function children() {
        var elem = this[0];
        if (!elem) {
            return null;
        }

        return $(elem.children);
    },

    // 获取子节点（包括文本节点）
    childNodes: function childNodes() {
        var elem = this[0];
        if (!elem) {
            return null;
        }

        return $(elem.childNodes);
    },

    // 增加子节点
    append: function append($children) {
        return this.forEach(function (elem) {
            $children.forEach(function (child) {
                elem.appendChild(child);
            });
        });
    },

    // 移除当前节点
    remove: function remove() {
        return this.forEach(function (elem) {
            if (elem.remove) {
                elem.remove();
            } else {
                var parent = elem.parentElement;
                parent && parent.removeChild(elem);
            }
        });
    },

    // 是否包含某个子节点
    isContain: function isContain($child) {
        var elem = this[0];
        var child = $child[0];
        return elem.contains(child);
    },

    // 尺寸数据
    getSizeData: function getSizeData() {
        var elem = this[0];
        return elem.getBoundingClientRect(); // 可得到 bottom height left right top width 的数据
    },

    // 封装 nodeName
    getNodeName: function getNodeName() {
        var elem = this[0];
        return elem.nodeName;
    },

    // 从当前元素查找
    find: function find(selector) {
        var elem = this[0];
        return $(elem.querySelectorAll(selector));
    },

    // 获取当前元素的 text
    text: function text(val) {
        if (!val) {
            // 获取 text
            var elem = this[0];
            return elem.innerHTML.replace(/<.*?>/g, function () {
                return '';
            });
        } else {
            // 设置 text
            return this.forEach(function (elem) {
                elem.innerHTML = val;
            });
        }
    },

    // 获取 html
    html: function html(value) {
        var elem = this[0];
        if (value == null) {
            return elem.innerHTML;
        } else {
            elem.innerHTML = value;
            return this;
        }
    },

    // 获取 value
    val: function val() {
        var elem = this[0];
        return elem.value.trim();
    },

    // focus
    focus: function focus() {
        return this.forEach(function (elem) {
            elem.focus();
        });
    },

    // parent
    parent: function parent() {
        var elem = this[0];
        return $(elem.parentElement);
    },

    // parentUntil 找到符合 selector 的父节点
    parentUntil: function parentUntil(selector, _currentElem) {
        var results = document.querySelectorAll(selector);
        var length = results.length;
        if (!length) {
            // 传入的 selector 无效
            return null;
        }

        var elem = _currentElem || this[0];
        if (elem.nodeName === 'BODY') {
            return null;
        }

        var parent = elem.parentElement;
        var i = void 0;
        for (i = 0; i < length; i++) {
            if (parent === results[i]) {
                // 找到，并返回
                return $(parent);
            }
        }

        // 继续查找
        return this.parentUntil(selector, parent);
    },

    // 判断两个 elem 是否相等
    equal: function equal($elem) {
        if ($elem.nodeType === 1) {
            return this[0] === $elem;
        } else {
            return this[0] === $elem[0];
        }
    },

    // 将该元素插入到某个元素前面
    insertBefore: function insertBefore(selector) {
        var $referenceNode = $(selector);
        var referenceNode = $referenceNode[0];
        if (!referenceNode) {
            return this;
        }
        return this.forEach(function (elem) {
            var parent = referenceNode.parentNode;
            parent.insertBefore(elem, referenceNode);
        });
    },

    // 将该元素插入到某个元素后面
    insertAfter: function insertAfter(selector) {
        var $referenceNode = $(selector);
        var referenceNode = $referenceNode[0];
        if (!referenceNode) {
            return this;
        }
        return this.forEach(function (elem) {
            var parent = referenceNode.parentNode;
            if (parent.lastChild === referenceNode) {
                // 最后一个元素
                parent.appendChild(elem);
            } else {
                // 不是最后一个元素
                parent.insertBefore(elem, referenceNode.nextSibling);
            }
        });
    }

    // new 一个对象
};function $(selector) {
    return new DomElement(selector);
}

// 解绑所有事件，用于销毁编辑器
$.offAll = function () {
    eventList.forEach(function (item) {
        var elem = item.elem;
        var type = item.type;
        var fn = item.fn;
        // 解绑
        elem.removeEventListener(type, fn);
    });
};

/*
    配置信息
*/

var config = {

    // 默认菜单配置
    menus: ['head', 'bold', 'fontSize', 'fontName', 'italic', 'underline', 'strikeThrough', 'foreColor', 'backColor', 'link', 'list', 'justify', 'quote', 'emoticon', 'image', 'table', 'video', 'code', 'undo', 'redo'],

    fontNames: ['宋体', '微软雅黑', 'Arial', 'Tahoma', 'Verdana'],

    colors: ['#000000', '#eeece0', '#1c487f', '#4d80bf', '#c24f4a', '#8baa4a', '#7b5ba1', '#46acc8', '#f9963b', '#ffffff'],

    // // 语言配置
    // lang: {
    //     '设置标题': 'title',
    //     '正文': 'p',
    //     '链接文字': 'link text',
    //     '链接': 'link',
    //     '插入': 'insert',
    //     '创建': 'init'
    // },

    // 表情
    emotions: [{
        // tab 的标题
        title: '默认',
        // type -> 'emoji' / 'image'
        type: 'image',
        // content -> 数组
        content: [{
            alt: '[坏笑]',
            src: 'http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/50/pcmoren_huaixiao_org.png'
        }, {
            alt: '[舔屏]',
            src: 'http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/40/pcmoren_tian_org.png'
        }, {
            alt: '[污]',
            src: 'http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/3c/pcmoren_wu_org.png'
        }]
    }, {
        // tab 的标题
        title: '新浪',
        // type -> 'emoji' / 'image'
        type: 'image',
        // content -> 数组
        content: [{
            src: 'http://img.t.sinajs.cn/t35/style/images/common/face/ext/normal/7a/shenshou_thumb.gif',
            alt: '[草泥马]'
        }, {
            src: 'http://img.t.sinajs.cn/t35/style/images/common/face/ext/normal/60/horse2_thumb.gif',
            alt: '[神马]'
        }, {
            src: 'http://img.t.sinajs.cn/t35/style/images/common/face/ext/normal/bc/fuyun_thumb.gif',
            alt: '[浮云]'
        }]
    }, {
        // tab 的标题
        title: 'emoji',
        // type -> 'emoji' / 'image'
        type: 'emoji',
        // content -> 数组
        content: '😀 😃 😄 😁 😆 😅 😂 😊 😇 🙂 🙃 😉 😓 😪 😴 🙄 🤔 😬 🤐'.split(/\s/)
    }],

    // 编辑区域的 z-index
    zIndex: 10000,

    // 是否开启 debug 模式（debug 模式下错误会 throw error 形式抛出）
    debug: false,

    // 插入链接时候的格式校验
    linkCheck: function linkCheck(text, link) {
        // text 是插入的文字
        // link 是插入的链接
        return true; // 返回 true 即表示成功
        // return '校验失败' // 返回字符串即表示失败的提示信息
    },

    // 插入网络图片的校验
    linkImgCheck: function linkImgCheck(src) {
        // src 即图片的地址
        return true; // 返回 true 即表示成功
        // return '校验失败'  // 返回字符串即表示失败的提示信息
    },

    // 粘贴过滤样式，默认开启
    pasteFilterStyle: true,

    // 粘贴内容时，忽略图片。默认关闭
    pasteIgnoreImg: false,

    // 对粘贴的文字进行自定义处理，返回处理后的结果。编辑器会将处理后的结果粘贴到编辑区域中。
    // IE 暂时不支持
    pasteTextHandle: function pasteTextHandle(content) {
        // content 即粘贴过来的内容（html 或 纯文本），可进行自定义处理然后返回
        return content;
    },

    // onchange 事件
    // onchange: function (html) {
    //     // html 即变化之后的内容
    //     console.log(html)
    // },

    // 是否显示添加网络图片的 tab
    showLinkImg: true,

    // 插入网络图片的回调
    linkImgCallback: function linkImgCallback(url) {
        // console.log(url)  // url 即插入图片的地址
    },

    // 默认上传图片 max size: 5M
    uploadImgMaxSize: 5 * 1024 * 1024,

    // 配置一次最多上传几个图片
    // uploadImgMaxLength: 5,

    // 上传图片，是否显示 base64 格式
    uploadImgShowBase64: false,

    // 上传图片，server 地址（如果有值，则 base64 格式的配置则失效）
    // uploadImgServer: '/upload',

    // 自定义配置 filename
    uploadFileName: '',

    // 上传图片的自定义参数
    uploadImgParams: {
        // token: 'abcdef12345'
    },

    // 上传图片的自定义header
    uploadImgHeaders: {
        // 'Accept': 'text/x-json'
    },

    // 配置 XHR withCredentials
    withCredentials: false,

    // 自定义上传图片超时时间 ms
    uploadImgTimeout: 10000,

    // 上传图片 hook 
    uploadImgHooks: {
        // customInsert: function (insertLinkImg, result, editor) {
        //     console.log('customInsert')
        //     // 图片上传并返回结果，自定义插入图片的事件，而不是编辑器自动插入图片
        //     const data = result.data1 || []
        //     data.forEach(link => {
        //         insertLinkImg(link)
        //     })
        // },
        before: function before(xhr, editor, files) {
            // 图片上传之前触发

            // 如果返回的结果是 {prevent: true, msg: 'xxxx'} 则表示用户放弃上传
            // return {
            //     prevent: true,
            //     msg: '放弃上传'
            // }
        },
        success: function success(xhr, editor, result) {
            // 图片上传并返回结果，图片插入成功之后触发
        },
        fail: function fail(xhr, editor, result) {
            // 图片上传并返回结果，但图片插入错误时触发
        },
        error: function error(xhr, editor) {
            // 图片上传出错时触发
        },
        timeout: function timeout(xhr, editor) {
            // 图片上传超时时触发
        }
    },

    // 是否上传七牛云，默认为 false
    qiniu: false

    // 上传图片自定义提示方法
    // customAlert: function (info) {
    //     // 自定义上传提示
    // },

    // // 自定义上传图片
    // customUploadImg: function (files, insert) {
    //     // files 是 input 中选中的文件列表
    //     // insert 是获取图片 url 后，插入到编辑器的方法
    //     insert(imgUrl)
    // }
};

/*
    工具
*/

// 和 UA 相关的属性
var UA = {
    _ua: navigator.userAgent,

    // 是否 webkit
    isWebkit: function isWebkit() {
        var reg = /webkit/i;
        return reg.test(this._ua);
    },

    // 是否 IE
    isIE: function isIE() {
        return 'ActiveXObject' in window;
    }

    // 遍历对象
};function objForEach(obj, fn) {
    var key = void 0,
        result = void 0;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            result = fn.call(obj, key, obj[key]);
            if (result === false) {
                break;
            }
        }
    }
}

// 遍历类数组
function arrForEach(fakeArr, fn) {
    var i = void 0,
        item = void 0,
        result = void 0;
    var length = fakeArr.length || 0;
    for (i = 0; i < length; i++) {
        item = fakeArr[i];
        result = fn.call(fakeArr, item, i);
        if (result === false) {
            break;
        }
    }
}

// 获取随机数
function getRandom(prefix) {
    return prefix + Math.random().toString().slice(2);
}

// 替换 html 特殊字符
function replaceHtmlSymbol(html) {
    if (html == null) {
        return '';
    }
    return html.replace(/</gm, '&lt;').replace(/>/gm, '&gt;').replace(/"/gm, '&quot;').replace(/(\r\n|\r|\n)/g, '<br/>');
}

// 返回百分比的格式


// 判断是不是 function
function isFunction(fn) {
    return typeof fn === 'function';
}

function hasClass(element, className) {
    if (!element) return;

    return element.classList.contains(className.trim());
}

function isComponent(element) {
    return element && (/se-component/.test(element.className) || /^(TABLE|HR)$/.test(element.nodeName));
}

function isWysiwygDiv(element) {
    if (element && element.nodeType === 1 && (hasClass(element, 'se-wrapper-wysiwyg') || /^BODY$/i.test(element.nodeName))) return true;
    return false;
}

function isFormatElement(element) {
    if (element && element.nodeType === 1 && /^(P|DIV|H[1-6]|LI|TH|TD|SECTION)$/i.test(element.nodeName) && !isComponent(element) && !isWysiwygDiv(element)) return true;
    return false;
}

function _HTMLConvertor(contents) {
    var ec = { '&': '&amp;', '\xA0': '&nbsp;', '\'': '&quot;', '<': '&lt;', '>': '&gt;' };
    return contents.replace(/&|\u00A0|'|<|>/g, function (m) {
        return typeof ec[m] === 'string' ? ec[m] : m;
    });
}

// 格式化节点
function convertHTMLForCodeView(html, indentSize) {
    var returnHTML = '';
    var reg = window.RegExp;
    var brReg = new reg('^(BLOCKQUOTE|PRE|TABLE|THEAD|TBODY|TR|TH|TD|OL|UL|IMG|IFRAME|VIDEO|AUDIO|FIGURE|FIGCAPTION|HR|BR)$', 'i');
    var wDoc = typeof html === 'string' ? document.createRange().createContextualFragment(html) : html;

    indentSize *= 1;
    indentSize = indentSize > 0 ? new window.Array(indentSize + 1).join(' ') : '';

    (function recursionFunc(element, indent, lineBR) {
        var children = element.childNodes;
        var elementRegTest = brReg.test(element.nodeName);
        var elementIndent = elementRegTest ? indent : '';

        for (var i = 0, len = children.length, node, br, nodeRegTest; i < len; i++) {
            node = children[i];
            nodeRegTest = brReg.test(node.nodeName);
            br = nodeRegTest ? '\n' : '';
            lineBR = isFormatElement(node) && !elementRegTest && !/^(TH|TD)$/i.test(element.nodeName) ? '\n' : '';

            if (node.nodeType === 3) {
                returnHTML += _HTMLConvertor(/^\n+$/.test(node.data) ? '' : node.data);
                continue;
            }

            if (node.childNodes.length === 0) {
                returnHTML += (/^(HR)$/i.test(node.nodeName) ? '\n' : '') + elementIndent + node.outerHTML + br;
                continue;
            }

            node.innerHTML = node.innerHTML;
            var tag = node.nodeName.toLowerCase();
            returnHTML += (lineBR || (elementRegTest ? '' : br)) + (elementIndent || nodeRegTest ? indent : '') + node.outerHTML.match(reg('<' + tag + '[^>]*>', 'i'))[0] + br;
            recursionFunc(node, indent + indentSize, '');
            returnHTML += (nodeRegTest ? indent : '') + '</' + tag + '>' + (lineBR || br || elementRegTest ? '\n' : '' || /^(TH|TD)$/i.test(node.nodeName) ? '\n' : '');
        }
    })(wDoc, '', '\n');

    return returnHTML.trim() + '\n';
}

/*
    bold-menu
*/
// 构造函数
function Bold(editor) {
    this.editor = editor;
    this.$elem = $('<div class="w-e-menu">\n            <i class="icon w-e-icon w-e-icon-bold"></i>\n        </div>');
    this.type = 'click';

    // 当前是否 active 状态
    this._active = false;
}

// 原型
Bold.prototype = {
    constructor: Bold,

    // 点击事件
    onClick: function onClick(e) {
        // 点击菜单将触发这里

        var editor = this.editor;
        var isSeleEmpty = editor.selection.isSelectionEmpty();

        if (isSeleEmpty) {
            // 选区是空的，插入并选中一个“空白”
            editor.selection.createEmptyRange();
        }

        // 执行 bold 命令
        editor.cmd.do('bold');

        if (isSeleEmpty) {
            // 需要将选取折叠起来
            editor.selection.collapseRange();
            editor.selection.restoreSelection();
        }
    },

    // 试图改变 active 状态
    tryChangeActive: function tryChangeActive(e) {
        var editor = this.editor;
        var $elem = this.$elem;
        if (editor.cmd.queryCommandState('bold')) {
            this._active = true;
            $elem.addClass('w-e-active');
        } else {
            this._active = false;
            $elem.removeClass('w-e-active');
        }
    }
};

/*
    替换多语言
 */

var replaceLang = function (editor, str) {
    var langArgs = editor.config.langArgs || [];
    var result = str;

    langArgs.forEach(function (item) {
        var reg = item.reg;
        var val = item.val;

        if (reg.test(result)) {
            result = result.replace(reg, function () {
                return val;
            });
        }
    });

    return result;
};

/*
    droplist
*/
var _emptyFn = function _emptyFn() {};

// 构造函数
function DropList(menu, opt) {
    var _this = this;

    // droplist 所依附的菜单
    var editor = menu.editor;
    this.menu = menu;
    this.opt = opt;
    // 容器
    var $container = $('<div class="w-e-droplist"></div>');

    // 标题
    var $title = opt.$title;
    var titleHtml = void 0;
    if ($title) {
        // 替换多语言
        titleHtml = $title.html();
        titleHtml = replaceLang(editor, titleHtml);
        $title.html(titleHtml);

        $title.addClass('w-e-dp-title');
        $container.append($title);
    }

    var list = opt.list || [];
    var type = opt.type || 'list'; // 'list' 列表形式（如“标题”菜单） / 'inline-block' 块状形式（如“颜色”菜单）
    var onClick = opt.onClick || _emptyFn;

    // 加入 DOM 并绑定事件
    var $list = $('<ul class="' + (type === 'list' ? 'w-e-list' : 'w-e-block') + '"></ul>');
    $container.append($list);
    list.forEach(function (item) {
        var $elem = item.$elem;

        // 替换多语言
        var elemHtml = $elem.html();
        elemHtml = replaceLang(editor, elemHtml);
        $elem.html(elemHtml);

        var value = item.value;
        var $li = $('<li class="w-e-item"></li>');
        if ($elem) {
            $li.append($elem);
            $list.append($li);
            $li.on('click', function (e) {
                onClick(value);

                // 隐藏
                _this.hideTimeoutId = setTimeout(function () {
                    _this.hide();
                }, 0);
            });
        }
    });

    // 绑定隐藏事件
    $container.on('mouseleave', function (e) {
        _this.hideTimeoutId = setTimeout(function () {
            _this.hide();
        }, 0);
    });

    // 记录属性
    this.$container = $container;

    // 基本属性
    this._rendered = false;
    this._show = false;
}

// 原型
DropList.prototype = {
    constructor: DropList,

    // 显示（插入DOM）
    show: function show() {
        if (this.hideTimeoutId) {
            // 清除之前的定时隐藏
            clearTimeout(this.hideTimeoutId);
        }

        var menu = this.menu;
        var $menuELem = menu.$elem;
        var $container = this.$container;
        if (this._show) {
            return;
        }
        if (this._rendered) {
            // 显示
            $container.show();
        } else {
            // 加入 DOM 之前先定位位置
            var menuHeight = $menuELem.getSizeData().height || 0;
            var width = this.opt.width || 100; // 默认为 100
            $container.css('margin-top', menuHeight + 'px').css('width', width + 'px');

            // 加入到 DOM
            $menuELem.append($container);
            this._rendered = true;
        }

        // 修改属性
        this._show = true;
    },

    // 隐藏（移除DOM）
    hide: function hide() {
        if (this.showTimeoutId) {
            // 清除之前的定时显示
            clearTimeout(this.showTimeoutId);
        }

        var $container = this.$container;
        if (!this._show) {
            return;
        }
        // 隐藏并需改属性
        $container.hide();
        this._show = false;
    }
};

/*
    menu - header
*/
// 构造函数
function Head(editor) {
    var _this = this;

    this.editor = editor;
    this.$elem = $('<div class="w-e-menu"><i class="icon w-e-icon w-e-icon-header"></i></div>');
    this.type = 'droplist';

    // 当前是否 active 状态
    this._active = false;

    // 初始化 droplist
    this.droplist = new DropList(this, {
        width: 100,
        $title: $('<p>设置标题</p>'),
        type: 'list', // droplist 以列表形式展示
        list: [{ $elem: $('<h1>H1</h1>'), value: '<h1>' }, { $elem: $('<h2>H2</h2>'), value: '<h2>' }, { $elem: $('<h3>H3</h3>'), value: '<h3>' }, { $elem: $('<h4>H4</h4>'), value: '<h4>' }, { $elem: $('<h5>H5</h5>'), value: '<h5>' }, { $elem: $('<p>正文</p>'), value: '<p>' }],
        onClick: function onClick(value) {
            // 注意 this 是指向当前的 Head 对象
            _this._command(value);
        }
    });
}

// 原型
Head.prototype = {
    constructor: Head,

    // 执行命令
    _command: function _command(value) {
        var editor = this.editor;

        var $selectionElem = editor.selection.getSelectionContainerElem();
        if (editor.$textElem.equal($selectionElem)) {
            // 不能选中多行来设置标题，否则会出现问题
            // 例如选中的是 <p>xxx</p><p>yyy</p> 来设置标题，设置之后会成为 <h1>xxx<br>yyy</h1> 不符合预期
            return;
        }

        editor.cmd.do('formatBlock', value);
    },

    // 试图改变 active 状态
    tryChangeActive: function tryChangeActive(e) {
        var editor = this.editor;
        var $elem = this.$elem;
        var reg = /^h/i;
        var cmdValue = editor.cmd.queryCommandValue('formatBlock');
        if (reg.test(cmdValue)) {
            this._active = true;
            $elem.addClass('w-e-active');
        } else {
            this._active = false;
            $elem.removeClass('w-e-active');
        }
    }
};

/*
    menu - fontSize
*/

// 构造函数
function FontSize(editor) {
    var _this = this;

    this.editor = editor;
    this.$elem = $('<div class="w-e-menu"><i class="icon w-e-icon w-e-icon-text-heigh"></i></div>');
    this.type = 'droplist';

    // 当前是否 active 状态
    this._active = false;

    // 初始化 droplist
    this.droplist = new DropList(this, {
        width: 160,
        $title: $('<p>字号</p>'),
        type: 'list', // droplist 以列表形式展示
        list: [{ $elem: $('<span style="font-size: x-small;">x-small</span>'), value: '1' }, { $elem: $('<span style="font-size: small;">small</span>'), value: '2' }, { $elem: $('<span>normal</span>'), value: '3' }, { $elem: $('<span style="font-size: large;">large</span>'), value: '4' }, { $elem: $('<span style="font-size: x-large;">x-large</span>'), value: '5' }, { $elem: $('<span style="font-size: xx-large;">xx-large</span>'), value: '6' }],
        onClick: function onClick(value) {
            // 注意 this 是指向当前的 FontSize 对象
            _this._command(value);
        }
    });
}

// 原型
FontSize.prototype = {
    constructor: FontSize,

    // 执行命令
    _command: function _command(value) {
        var editor = this.editor;
        editor.cmd.do('fontSize', value);
    }
};

/*
    menu - fontName
*/

// 构造函数
function FontName(editor) {
    var _this = this;

    this.editor = editor;
    this.$elem = $('<div class="w-e-menu"><i class="icon w-e-icon w-e-icon-font"></i></div>');
    this.type = 'droplist';

    // 当前是否 active 状态
    this._active = false;

    // 获取配置的字体
    var config = editor.config;
    var fontNames = config.fontNames || [];

    // 初始化 droplist
    this.droplist = new DropList(this, {
        width: 100,
        $title: $('<p>字体</p>'),
        type: 'list', // droplist 以列表形式展示
        list: fontNames.map(function (fontName) {
            return { $elem: $('<span style="font-family: ' + fontName + ';">' + fontName + '</span>'), value: fontName };
        }),
        onClick: function onClick(value) {
            // 注意 this 是指向当前的 FontName 对象
            _this._command(value);
        }
    });
}

// 原型
FontName.prototype = {
    constructor: FontName,

    _command: function _command(value) {
        var editor = this.editor;
        editor.cmd.do('fontName', value);
    }
};

/*
    panel
*/

var emptyFn = function emptyFn() {};

// 记录已经显示 panel 的菜单
var _isCreatedPanelMenus = [];

// 构造函数
function Panel(menu, opt) {
    this.menu = menu;
    this.opt = opt;
}

// 原型
Panel.prototype = {
    constructor: Panel,

    // 显示（插入DOM）
    show: function show() {
        var _this = this;

        var menu = this.menu;
        if (_isCreatedPanelMenus.indexOf(menu) >= 0) {
            // 该菜单已经创建了 panel 不能再创建
            return;
        }

        var editor = menu.editor;
        var $body = $('body');
        var $textContainerElem = editor.$textContainerElem;
        var opt = this.opt;

        // panel 的容器
        var $container = $('<div class="w-e-panel-container"></div>');
        var width = opt.width || 300; // 默认 300px
        $container.css('width', width + 'px').css('margin-left', (0 - width) / 2 + 'px');

        // 添加关闭按钮
        var $closeBtn = $('<i class="w-e-icon-close w-e-panel-close"></i>');
        $container.append($closeBtn);
        $closeBtn.on('click', function () {
            _this.hide();
        });

        // 准备 tabs 容器
        var $tabTitleContainer = $('<ul class="w-e-panel-tab-title"></ul>');
        var $tabContentContainer = $('<div class="w-e-panel-tab-content"></div>');
        $container.append($tabTitleContainer).append($tabContentContainer);

        // 设置高度
        var height = opt.height;
        if (height) {
            $tabContentContainer.css('height', height + 'px').css('overflow-y', 'auto');
        }

        // tabs
        var tabs = opt.tabs || [];
        var tabTitleArr = [];
        var tabContentArr = [];
        tabs.forEach(function (tab, tabIndex) {
            if (!tab) {
                return;
            }
            var title = tab.title || '';
            var tpl = tab.tpl || '';

            // 替换多语言
            title = replaceLang(editor, title);
            tpl = replaceLang(editor, tpl);

            // 添加到 DOM
            var $title = $('<li class="w-e-item">' + title + '</li>');
            $tabTitleContainer.append($title);
            var $content = $(tpl);
            $tabContentContainer.append($content);

            // 记录到内存
            $title._index = tabIndex;
            tabTitleArr.push($title);
            tabContentArr.push($content);

            // 设置 active 项
            if (tabIndex === 0) {
                $title._active = true;
                $title.addClass('w-e-active');
            } else {
                $content.hide();
            }

            // 绑定 tab 的事件
            $title.on('click', function (e) {
                if ($title._active) {
                    return;
                }
                // 隐藏所有的 tab
                tabTitleArr.forEach(function ($title) {
                    $title._active = false;
                    $title.removeClass('w-e-active');
                });
                tabContentArr.forEach(function ($content) {
                    $content.hide();
                });

                // 显示当前的 tab
                $title._active = true;
                $title.addClass('w-e-active');
                $content.show();
            });
        });

        // 绑定关闭事件
        $container.on('click', function (e) {
            // 点击时阻止冒泡
            e.stopPropagation();
        });
        $body.on('click', function (e) {
            _this.hide();
        });

        // 添加到 DOM
        $textContainerElem.append($container);

        // 绑定 opt 的事件，只有添加到 DOM 之后才能绑定成功
        tabs.forEach(function (tab, index) {
            if (!tab) {
                return;
            }
            var events = tab.events || [];
            events.forEach(function (event) {
                var selector = event.selector;
                var type = event.type;
                var fn = event.fn || emptyFn;
                var $content = tabContentArr[index];
                $content.find(selector).on(type, function (e) {
                    e.stopPropagation();
                    var needToHide = fn(e);
                    // 执行完事件之后，是否要关闭 panel
                    if (needToHide) {
                        _this.hide();
                    }
                });
            });
        });

        // focus 第一个 elem
        var $inputs = $container.find('input[type=text],textarea');
        if ($inputs.length) {
            $inputs.get(0).focus();
        }

        // 添加到属性
        this.$container = $container;

        // 隐藏其他 panel
        this._hideOtherPanels();
        // 记录该 menu 已经创建了 panel
        _isCreatedPanelMenus.push(menu);
    },

    // 隐藏（移除DOM）
    hide: function hide() {
        var menu = this.menu;
        var $container = this.$container;
        if ($container) {
            $container.remove();
        }

        // 将该 menu 记录中移除
        _isCreatedPanelMenus = _isCreatedPanelMenus.filter(function (item) {
            if (item === menu) {
                return false;
            } else {
                return true;
            }
        });
    },

    // 一个 panel 展示时，隐藏其他 panel
    _hideOtherPanels: function _hideOtherPanels() {
        if (!_isCreatedPanelMenus.length) {
            return;
        }
        _isCreatedPanelMenus.forEach(function (menu) {
            var panel = menu.panel || {};
            if (panel.hide) {
                panel.hide();
            }
        });
    }
};

/*
    menu - link
*/
// 构造函数
function Link(editor) {
    this.editor = editor;
    this.$elem = $('<div class="w-e-menu"><i class="icon w-e-icon w-e-icon-link"></i></div>');
    this.type = 'panel';

    // 当前是否 active 状态
    this._active = false;
}

// 原型
Link.prototype = {
    constructor: Link,

    // 点击事件
    onClick: function onClick(e) {
        var editor = this.editor;
        var $linkelem = void 0;

        if (this._active) {
            // 当前选区在链接里面
            $linkelem = editor.selection.getSelectionContainerElem();
            if (!$linkelem) {
                return;
            }
            // 将该元素都包含在选取之内，以便后面整体替换
            editor.selection.createRangeByElem($linkelem);
            editor.selection.restoreSelection();
            // 显示 panel
            this._createPanel($linkelem.text(), $linkelem.attr('href'));
        } else {
            // 当前选区不在链接里面
            if (editor.selection.isSelectionEmpty()) {
                // 选区是空的，未选中内容
                this._createPanel('', '');
            } else {
                // 选中内容了
                this._createPanel(editor.selection.getSelectionText(), '');
            }
        }
    },

    // 创建 panel
    _createPanel: function _createPanel(text, link) {
        var _this = this;

        // panel 中需要用到的id
        var inputLinkId = getRandom('input-link');
        var inputTextId = getRandom('input-text');
        var btnOkId = getRandom('btn-ok');
        var btnDelId = getRandom('btn-del');

        // 是否显示“删除链接”
        var delBtnDisplay = this._active ? 'inline-block' : 'none';

        // 初始化并显示 panel
        var panel = new Panel(this, {
            width: 300,
            // panel 中可包含多个 tab
            tabs: [{
                // tab 的标题
                title: '链接',
                // 模板
                tpl: '<div>\n                            <input id="' + inputTextId + '" type="text" class="block" value="' + text + '" placeholder="\u94FE\u63A5\u6587\u5B57"/></td>\n                            <input id="' + inputLinkId + '" type="text" class="block" value="' + link + '" placeholder="http://..."/></td>\n                            <div class="w-e-button-container">\n                                <button id="' + btnOkId + '" class="right">\u63D2\u5165</button>\n                                <button id="' + btnDelId + '" class="gray right" style="display:' + delBtnDisplay + '">\u5220\u9664\u94FE\u63A5</button>\n                            </div>\n                        </div>',
                // 事件绑定
                events: [
                // 插入链接
                {
                    selector: '#' + btnOkId,
                    type: 'click',
                    fn: function fn() {
                        // 执行插入链接
                        var $link = $('#' + inputLinkId);
                        var $text = $('#' + inputTextId);
                        var link = $link.val();
                        var text = $text.val();
                        _this._insertLink(text, link);

                        // 返回 true，表示该事件执行完之后，panel 要关闭。否则 panel 不会关闭
                        return true;
                    }
                },
                // 删除链接
                {
                    selector: '#' + btnDelId,
                    type: 'click',
                    fn: function fn() {
                        // 执行删除链接
                        _this._delLink();

                        // 返回 true，表示该事件执行完之后，panel 要关闭。否则 panel 不会关闭
                        return true;
                    }
                }] // tab end
            }] // tabs end
        });

        // 显示 panel
        panel.show();

        // 记录属性
        this.panel = panel;
    },

    // 删除当前链接
    _delLink: function _delLink() {
        if (!this._active) {
            return;
        }
        var editor = this.editor;
        var $selectionELem = editor.selection.getSelectionContainerElem();
        if (!$selectionELem) {
            return;
        }
        var selectionText = editor.selection.getSelectionText();
        editor.cmd.do('insertHTML', '<span>' + selectionText + '</span>');
    },

    // 插入链接
    _insertLink: function _insertLink(text, link) {
        var editor = this.editor;
        var config = editor.config;
        var linkCheck = config.linkCheck;
        var checkResult = true; // 默认为 true
        if (linkCheck && typeof linkCheck === 'function') {
            checkResult = linkCheck(text, link);
        }
        if (checkResult === true) {
            editor.cmd.do('insertHTML', '<a href="' + link + '" target="_blank">' + text + '</a>');
        } else {
            alert(checkResult);
        }
    },

    // 试图改变 active 状态
    tryChangeActive: function tryChangeActive(e) {
        var editor = this.editor;
        var $elem = this.$elem;
        var $selectionELem = editor.selection.getSelectionContainerElem();
        if (!$selectionELem) {
            return;
        }
        if ($selectionELem.getNodeName() === 'A') {
            this._active = true;
            $elem.addClass('w-e-active');
        } else {
            this._active = false;
            $elem.removeClass('w-e-active');
        }
    }
};

/*
    italic-menu
*/
// 构造函数
function Italic(editor) {
    this.editor = editor;
    this.$elem = $('<div class="w-e-menu">\n            <i class="icon w-e-icon w-e-icon-italic"></i>\n        </div>');
    this.type = 'click';

    // 当前是否 active 状态
    this._active = false;
}

// 原型
Italic.prototype = {
    constructor: Italic,

    // 点击事件
    onClick: function onClick(e) {
        // 点击菜单将触发这里

        var editor = this.editor;
        var isSeleEmpty = editor.selection.isSelectionEmpty();

        if (isSeleEmpty) {
            // 选区是空的，插入并选中一个“空白”
            editor.selection.createEmptyRange();
        }

        // 执行 italic 命令
        editor.cmd.do('italic');

        if (isSeleEmpty) {
            // 需要将选取折叠起来
            editor.selection.collapseRange();
            editor.selection.restoreSelection();
        }
    },

    // 试图改变 active 状态
    tryChangeActive: function tryChangeActive(e) {
        var editor = this.editor;
        var $elem = this.$elem;
        if (editor.cmd.queryCommandState('italic')) {
            this._active = true;
            $elem.addClass('w-e-active');
        } else {
            this._active = false;
            $elem.removeClass('w-e-active');
        }
    }
};

/*
    redo-menu
*/
// 构造函数
function Redo(editor) {
    this.editor = editor;
    this.$elem = $('<div class="w-e-menu">\n            <i class="icon w-e-icon w-e-icon-redo"></i>\n        </div>');
    this.type = 'click';

    // 当前是否 active 状态
    this._active = false;
}

// 原型
Redo.prototype = {
    constructor: Redo,

    // 点击事件
    onClick: function onClick(e) {
        // 点击菜单将触发这里

        var editor = this.editor;

        // 执行 redo 命令
        editor.cmd.do('redo');
    }
};

/*
    strikeThrough-menu
*/
// 构造函数
function StrikeThrough(editor) {
    this.editor = editor;
    this.$elem = $('<div class="w-e-menu">\n            <i class="icon w-e-icon w-e-icon-strikethrough"></i>\n        </div>');
    this.type = 'click';

    // 当前是否 active 状态
    this._active = false;
}

// 原型
StrikeThrough.prototype = {
    constructor: StrikeThrough,

    // 点击事件
    onClick: function onClick(e) {
        // 点击菜单将触发这里

        var editor = this.editor;
        var isSeleEmpty = editor.selection.isSelectionEmpty();

        if (isSeleEmpty) {
            // 选区是空的，插入并选中一个“空白”
            editor.selection.createEmptyRange();
        }

        // 执行 strikeThrough 命令
        editor.cmd.do('strikeThrough');

        if (isSeleEmpty) {
            // 需要将选取折叠起来
            editor.selection.collapseRange();
            editor.selection.restoreSelection();
        }
    },

    // 试图改变 active 状态
    tryChangeActive: function tryChangeActive(e) {
        var editor = this.editor;
        var $elem = this.$elem;
        if (editor.cmd.queryCommandState('strikeThrough')) {
            this._active = true;
            $elem.addClass('w-e-active');
        } else {
            this._active = false;
            $elem.removeClass('w-e-active');
        }
    }
};

/*
    underline-menu
*/
// 构造函数
function Underline(editor) {
    this.editor = editor;
    this.$elem = $('<div class="w-e-menu">\n            <i class="icon w-e-icon w-e-icon-underline"></i>\n        </div>');
    this.type = 'click';

    // 当前是否 active 状态
    this._active = false;
}

// 原型
Underline.prototype = {
    constructor: Underline,

    // 点击事件
    onClick: function onClick(e) {
        // 点击菜单将触发这里

        var editor = this.editor;
        var isSeleEmpty = editor.selection.isSelectionEmpty();

        if (isSeleEmpty) {
            // 选区是空的，插入并选中一个“空白”
            editor.selection.createEmptyRange();
        }

        // 执行 underline 命令
        editor.cmd.do('underline');

        if (isSeleEmpty) {
            // 需要将选取折叠起来
            editor.selection.collapseRange();
            editor.selection.restoreSelection();
        }
    },

    // 试图改变 active 状态
    tryChangeActive: function tryChangeActive(e) {
        var editor = this.editor;
        var $elem = this.$elem;
        if (editor.cmd.queryCommandState('underline')) {
            this._active = true;
            $elem.addClass('w-e-active');
        } else {
            this._active = false;
            $elem.removeClass('w-e-active');
        }
    }
};

/*
    undo-menu
*/
// 构造函数
function Undo(editor) {
    this.editor = editor;
    this.$elem = $('<div class="w-e-menu">\n            <i class="icon w-e-icon w-e-icon-undo"></i>\n        </div>');
    this.type = 'click';

    // 当前是否 active 状态
    this._active = false;
}

// 原型
Undo.prototype = {
    constructor: Undo,

    // 点击事件
    onClick: function onClick(e) {
        // 点击菜单将触发这里

        var editor = this.editor;

        // 执行 undo 命令
        editor.cmd.do('undo');
    }
};

/*
    menu - list
*/
// 构造函数
function List(editor) {
    var _this = this;

    this.editor = editor;
    this.$elem = $('<div class="w-e-menu"><i class="icon w-e-icon w-e-icon-list2"></i></div>');
    this.type = 'droplist';

    // 当前是否 active 状态
    this._active = false;

    // 初始化 droplist
    this.droplist = new DropList(this, {
        width: 120,
        $title: $('<p>设置列表</p>'),
        type: 'list', // droplist 以列表形式展示
        list: [{ $elem: $('<span><i class="w-e-icon-list-numbered"></i> 有序列表</span>'), value: 'insertOrderedList' }, { $elem: $('<span><i class="w-e-icon-list2"></i> 无序列表</span>'), value: 'insertUnorderedList' }],
        onClick: function onClick(value) {
            // 注意 this 是指向当前的 List 对象
            _this._command(value);
        }
    });
}

// 原型
List.prototype = {
    constructor: List,

    // 执行命令
    _command: function _command(value) {
        var editor = this.editor;
        var $textElem = editor.$textElem;
        editor.selection.restoreSelection();
        if (editor.cmd.queryCommandState(value)) {
            return;
        }
        editor.cmd.do(value);

        // 验证列表是否被包裹在 <p> 之内
        var $selectionElem = editor.selection.getSelectionContainerElem();
        if ($selectionElem.getNodeName() === 'LI') {
            $selectionElem = $selectionElem.parent();
        }
        if (/^ol|ul$/i.test($selectionElem.getNodeName()) === false) {
            return;
        }
        if ($selectionElem.equal($textElem)) {
            // 证明是顶级标签，没有被 <p> 包裹
            return;
        }
        var $parent = $selectionElem.parent();
        if ($parent.equal($textElem)) {
            // $parent 是顶级标签，不能删除
            return;
        }

        $selectionElem.insertAfter($parent);
        $parent.remove();
    },

    // 试图改变 active 状态
    tryChangeActive: function tryChangeActive(e) {
        var editor = this.editor;
        var $elem = this.$elem;
        if (editor.cmd.queryCommandState('insertUnOrderedList') || editor.cmd.queryCommandState('insertOrderedList')) {
            this._active = true;
            $elem.addClass('w-e-active');
        } else {
            this._active = false;
            $elem.removeClass('w-e-active');
        }
    }
};

/*
    menu - justify
*/
// 构造函数
function Justify(editor) {
    var _this = this;

    this.editor = editor;
    this.$elem = $('<div class="w-e-menu"><i class="icon w-e-icon w-e-icon-paragraph-left"></i></div>');
    this.type = 'droplist';

    // 当前是否 active 状态
    this._active = false;

    // 初始化 droplist
    this.droplist = new DropList(this, {
        width: 100,
        $title: $('<p>对齐方式</p>'),
        type: 'list', // droplist 以列表形式展示
        list: [{ $elem: $('<span><i class="icon w-e-icon w-e-icon-paragraph-left"></i> 靠左</span>'), value: 'justifyLeft' }, { $elem: $('<span><i class="icon w-e-icon w-e-icon-paragraph-center"></i> 居中</span>'), value: 'justifyCenter' }, { $elem: $('<span><i class="icon w-e-icon w-e-icon-paragraph-right"></i> 靠右</span>'), value: 'justifyRight' }],
        onClick: function onClick(value) {
            // 注意 this 是指向当前的 List 对象
            _this._command(value);
        }
    });
}

// 原型
Justify.prototype = {
    constructor: Justify,

    // 执行命令
    _command: function _command(value) {
        var editor = this.editor;
        editor.cmd.do(value);
    }
};

/*
    menu - Forecolor
*/
// 构造函数
function ForeColor(editor) {
    var _this = this;

    this.editor = editor;
    this.$elem = $('<div class="w-e-menu"><i class="icon w-e-icon w-e-icon-pencil2"></i></div>');
    this.type = 'droplist';

    // 获取配置的颜色
    var config = editor.config;
    var colors = config.colors || [];

    // 当前是否 active 状态
    this._active = false;

    // 初始化 droplist
    this.droplist = new DropList(this, {
        width: 100,
        $title: $('<p>文字颜色</p>'),
        type: 'inline-block', // droplist 内容以 block 形式展示
        list: colors.map(function (color) {
            return { $elem: $('<i style="color:' + color + ';" class="icon w-e-icon w-e-icon-pencil2"></i>'), value: color };
        }),
        onClick: function onClick(value) {
            // 注意 this 是指向当前的 ForeColor 对象
            _this._command(value);
        }
    });
}

// 原型
ForeColor.prototype = {
    constructor: ForeColor,

    // 执行命令
    _command: function _command(value) {
        var editor = this.editor;
        editor.cmd.do('foreColor', value);
    }
};

/*
    menu - BackColor
*/
// 构造函数
function BackColor(editor) {
    var _this = this;

    this.editor = editor;
    this.$elem = $('<div class="w-e-menu"><i class="icon w-e-icon w-e-icon-paint-brush"></i></div>');
    this.type = 'droplist';

    // 获取配置的颜色
    var config = editor.config;
    var colors = config.colors || [];

    // 当前是否 active 状态
    this._active = false;

    // 初始化 droplist
    this.droplist = new DropList(this, {
        width: 100,
        $title: $('<p>背景色</p>'),
        type: 'inline-block', // droplist 内容以 block 形式展示
        list: colors.map(function (color) {
            return { $elem: $('<i style="color:' + color + ';" class="icon w-e-icon w-e-icon-paint-brush"></i>'), value: color };
        }),
        onClick: function onClick(value) {
            // 注意 this 是指向当前的 BackColor 对象
            _this._command(value);
        }
    });
}

// 原型
BackColor.prototype = {
    constructor: BackColor,

    // 执行命令
    _command: function _command(value) {
        var editor = this.editor;
        editor.cmd.do('backColor', value);
    }
};

/*
    menu - quote
*/
// 构造函数
function Quote(editor) {
    this.editor = editor;
    this.$elem = $('<div class="w-e-menu">\n            <i class="w-e-icon-quotes-left"></i>\n        </div>');
    this.type = 'click';

    // 当前是否 active 状态
    this._active = false;
}

// 原型
Quote.prototype = {
    constructor: Quote,

    onClick: function onClick(e) {
        var editor = this.editor;
        var $selectionElem = editor.selection.getSelectionContainerElem();
        var nodeName = $selectionElem.getNodeName();

        if (!UA.isIE()) {
            if (nodeName === 'BLOCKQUOTE') {
                // 撤销 quote
                editor.cmd.do('formatBlock', '<P>');
            } else {
                // 转换为 quote
                editor.cmd.do('formatBlock', '<BLOCKQUOTE>');
            }
            return;
        }

        // IE 中不支持 formatBlock <BLOCKQUOTE> ，要用其他方式兼容
        var content = void 0,
            $targetELem = void 0;
        if (nodeName === 'P') {
            // 将 P 转换为 quote
            content = $selectionElem.text();
            $targetELem = $('<blockquote>' + content + '</blockquote>');
            $targetELem.insertAfter($selectionElem);
            $selectionElem.remove();
            return;
        }
        if (nodeName === 'BLOCKQUOTE') {
            // 撤销 quote
            content = $selectionElem.text();
            $targetELem = $('<p>' + content + '</p>');
            $targetELem.insertAfter($selectionElem);
            $selectionElem.remove();
        }
    },

    tryChangeActive: function tryChangeActive(e) {
        var editor = this.editor;
        var $elem = this.$elem;
        var reg = /^BLOCKQUOTE$/i;
        var cmdValue = editor.cmd.queryCommandValue('formatBlock');
        if (reg.test(cmdValue)) {
            this._active = true;
            $elem.addClass('w-e-active');
        } else {
            this._active = false;
            $elem.removeClass('w-e-active');
        }
    }
};

/*
    menu - code
*/
// 构造函数
function Code(editor) {
    this.editor = editor;
    this.$elem = $('<div class="w-e-menu">\n            <i class="icon w-e-icon w-e-icon-terminal"></i>\n        </div>');
    this.type = 'panel';

    // 当前是否 active 状态
    this._active = false;
}

// 原型
Code.prototype = {
    constructor: Code,

    onClick: function onClick(e) {
        var editor = this.editor;
        var $startElem = editor.selection.getSelectionStartElem();
        var $endElem = editor.selection.getSelectionEndElem();
        var isSeleEmpty = editor.selection.isSelectionEmpty();
        var selectionText = editor.selection.getSelectionText();
        var $code = void 0;

        if (!$startElem.equal($endElem)) {
            // 跨元素选择，不做处理
            editor.selection.restoreSelection();
            return;
        }
        if (!isSeleEmpty) {
            // 选取不是空，用 <code> 包裹即可
            $code = $('<code>' + selectionText + '</code>');
            editor.cmd.do('insertElem', $code);
            editor.selection.createRangeByElem($code, false);
            editor.selection.restoreSelection();
            return;
        }

        // 选取是空，且没有夸元素选择，则插入 <pre><code></code></prev>
        if (this._active) {
            // 选中状态，将编辑内容
            this._createPanel($startElem.html());
        } else {
            // 未选中状态，将创建内容
            this._createPanel();
        }
    },

    _createPanel: function _createPanel(value) {
        var _this = this;

        // value - 要编辑的内容
        value = value || '';
        var type = !value ? 'new' : 'edit';
        var textId = getRandom('texxt');
        var btnId = getRandom('btn');

        var panel = new Panel(this, {
            width: 500,
            // 一个 Panel 包含多个 tab
            tabs: [{
                // 标题
                title: '插入代码',
                // 模板
                tpl: '<div>\n                        <textarea id="' + textId + '" style="height:145px;;">' + value + '</textarea>\n                        <div class="w-e-button-container">\n                            <button id="' + btnId + '" class="right">\u63D2\u5165</button>\n                        </div>\n                    <div>',
                // 事件绑定
                events: [
                // 插入代码
                {
                    selector: '#' + btnId,
                    type: 'click',
                    fn: function fn() {
                        var $text = $('#' + textId);
                        var text = $text.val() || $text.html();
                        text = replaceHtmlSymbol(text);
                        if (type === 'new') {
                            // 新插入
                            _this._insertCode(text);
                        } else {
                            // 编辑更新
                            _this._updateCode(text);
                        }

                        // 返回 true，表示该事件执行完之后，panel 要关闭。否则 panel 不会关闭
                        return true;
                    }
                }] // first tab end
            }] // tabs end
        }); // new Panel end

        // 显示 panel
        panel.show();

        // 记录属性
        this.panel = panel;
    },

    // 插入代码
    _insertCode: function _insertCode(value) {
        var editor = this.editor;
        editor.cmd.do('insertHTML', '<pre><code>' + value + '</code></pre><p class="p"><br></p>');
    },

    // 更新代码
    _updateCode: function _updateCode(value) {
        var editor = this.editor;
        var $selectionELem = editor.selection.getSelectionContainerElem();
        if (!$selectionELem) {
            return;
        }
        $selectionELem.html(value);
        editor.selection.restoreSelection();
    },

    // 试图改变 active 状态
    tryChangeActive: function tryChangeActive(e) {
        var editor = this.editor;
        var $elem = this.$elem;
        var $selectionELem = editor.selection.getSelectionContainerElem();
        if (!$selectionELem) {
            return;
        }
        var $parentElem = $selectionELem.parent();
        if ($selectionELem.getNodeName() === 'CODE' && $parentElem.getNodeName() === 'PRE') {
            this._active = true;
            $elem.addClass('w-e-active');
        } else {
            this._active = false;
            $elem.removeClass('w-e-active');
        }
    }
};

/*
    menu - emoticon
*/
// 构造函数
function Emoticon(editor) {
    this.editor = editor;
    this.$elem = $('<div class="w-e-menu">\n            <i class="icon w-e-icon w-e-icon-happy"></i>\n        </div>');
    this.type = 'panel';

    // 当前是否 active 状态
    this._active = false;
}

// 原型
Emoticon.prototype = {
    constructor: Emoticon,

    onClick: function onClick() {
        this._createPanel();
    },

    _createPanel: function _createPanel() {
        var _this = this;

        var editor = this.editor;
        var config = editor.config;
        // 获取表情配置
        var emotions = config.emotions || [];

        // 创建表情 dropPanel 的配置
        var tabConfig = [];
        emotions.forEach(function (emotData) {
            var emotType = emotData.type;
            var content = emotData.content || [];

            // 这一组表情最终拼接出来的 html
            var faceHtml = '';

            // emoji 表情
            if (emotType === 'emoji') {
                content.forEach(function (item) {
                    if (item) {
                        faceHtml += '<span class="w-e-item">' + item + '</span>';
                    }
                });
            }
            // 图片表情
            if (emotType === 'image') {
                content.forEach(function (item) {
                    var src = item.src;
                    var alt = item.alt;
                    if (src) {
                        // 加一个 data-w-e 属性，点击图片的时候不再提示编辑图片
                        faceHtml += '<span class="w-e-item"><img src="' + src + '" alt="' + alt + '" data-w-e="1"/></span>';
                    }
                });
            }

            tabConfig.push({
                title: emotData.title,
                tpl: '<div class="w-e-emoticon-container">' + faceHtml + '</div>',
                events: [{
                    selector: 'span.w-e-item',
                    type: 'click',
                    fn: function fn(e) {
                        var target = e.target;
                        var $target = $(target);
                        var nodeName = $target.getNodeName();

                        var insertHtml = void 0;
                        if (nodeName === 'IMG') {
                            // 插入图片
                            insertHtml = $target.parent().html();
                        } else {
                            // 插入 emoji
                            insertHtml = '<span>' + $target.html() + '</span>';
                        }

                        _this._insert(insertHtml);
                        // 返回 true，表示该事件执行完之后，panel 要关闭。否则 panel 不会关闭
                        return true;
                    }
                }]
            });
        });

        var panel = new Panel(this, {
            width: 300,
            height: 200,
            // 一个 Panel 包含多个 tab
            tabs: tabConfig
        });

        // 显示 panel
        panel.show();

        // 记录属性
        this.panel = panel;
    },

    // 插入表情
    _insert: function _insert(emotHtml) {
        var editor = this.editor;
        editor.cmd.do('insertHTML', emotHtml);
    }
};

/*
    menu - table
*/
// 构造函数
function Table(editor) {
    this.editor = editor;
    this.$elem = $('<div class="w-e-menu"><i class="icon w-e-icon w-e-icon-table2"></i></div>');
    this.type = 'panel';

    // 当前是否 active 状态
    this._active = false;
}

// 原型
Table.prototype = {
    constructor: Table,

    onClick: function onClick() {
        if (this._active) {
            // 编辑现有表格
            this._createEditPanel();
        } else {
            // 插入新表格
            this._createInsertPanel();
        }
    },

    // 创建插入新表格的 panel
    _createInsertPanel: function _createInsertPanel() {
        var _this = this;

        // 用到的 id
        var btnInsertId = getRandom('btn');
        var textRowNum = getRandom('row');
        var textColNum = getRandom('col');

        var panel = new Panel(this, {
            width: 250,
            // panel 包含多个 tab
            tabs: [{
                // 标题
                title: '插入表格',
                // 模板
                tpl: '<div>\n                        <p style="text-align:left; padding:5px 0;">\n                            \u521B\u5EFA\n                            <input id="' + textRowNum + '" type="text" value="5" style="width:40px;text-align:center;"/>\n                            \u884C\n                            <input id="' + textColNum + '" type="text" value="5" style="width:40px;text-align:center;"/>\n                            \u5217\u7684\u8868\u683C\n                        </p>\n                        <div class="w-e-button-container">\n                            <button id="' + btnInsertId + '" class="right">\u63D2\u5165</button>\n                        </div>\n                    </div>',
                // 事件绑定
                events: [{
                    // 点击按钮，插入表格
                    selector: '#' + btnInsertId,
                    type: 'click',
                    fn: function fn() {
                        var rowNum = parseInt($('#' + textRowNum).val());
                        var colNum = parseInt($('#' + textColNum).val());

                        if (rowNum && colNum && rowNum > 0 && colNum > 0) {
                            // form 数据有效
                            _this._insert(rowNum, colNum);
                        }

                        // 返回 true，表示该事件执行完之后，panel 要关闭。否则 panel 不会关闭
                        return true;
                    }
                }] // first tab end
            }] // tabs end
        }); // panel end

        // 展示 panel
        panel.show();

        // 记录属性
        this.panel = panel;
    },

    // 插入表格
    _insert: function _insert(rowNum, colNum) {
        // 拼接 table 模板
        var r = void 0,
            c = void 0;
        var html = '<table border="0" width="100%" cellpadding="0" cellspacing="0">';
        for (r = 0; r < rowNum; r++) {
            html += '<tr>';
            if (r === 0) {
                for (c = 0; c < colNum; c++) {
                    html += '<th>&nbsp;</th>';
                }
            } else {
                for (c = 0; c < colNum; c++) {
                    html += '<td>&nbsp;</td>';
                }
            }
            html += '</tr>';
        }
        html += '</table><p><br></p>';

        // 执行命令
        var editor = this.editor;
        editor.cmd.do('insertHTML', html);

        // 防止 firefox 下出现 resize 的控制点
        editor.cmd.do('enableObjectResizing', false);
        editor.cmd.do('enableInlineTableEditing', false);
    },

    // 创建编辑表格的 panel
    _createEditPanel: function _createEditPanel() {
        var _this2 = this;

        // 可用的 id
        var addRowBtnId = getRandom('add-row');
        var addColBtnId = getRandom('add-col');
        var delRowBtnId = getRandom('del-row');
        var delColBtnId = getRandom('del-col');
        var delTableBtnId = getRandom('del-table');

        // 创建 panel 对象
        var panel = new Panel(this, {
            width: 320,
            // panel 包含多个 tab
            tabs: [{
                // 标题
                title: '编辑表格',
                // 模板
                tpl: '<div>\n                        <div class="w-e-button-container" style="border-bottom:1px solid #f1f1f1;padding-bottom:5px;margin-bottom:5px;">\n                            <button id="' + addRowBtnId + '" class="left">\u589E\u52A0\u884C</button>\n                            <button id="' + delRowBtnId + '" class="red left">\u5220\u9664\u884C</button>\n                            <button id="' + addColBtnId + '" class="left">\u589E\u52A0\u5217</button>\n                            <button id="' + delColBtnId + '" class="red left">\u5220\u9664\u5217</button>\n                        </div>\n                        <div class="w-e-button-container">\n                            <button id="' + delTableBtnId + '" class="gray left">\u5220\u9664\u8868\u683C</button>\n                        </dv>\n                    </div>',
                // 事件绑定
                events: [{
                    // 增加行
                    selector: '#' + addRowBtnId,
                    type: 'click',
                    fn: function fn() {
                        _this2._addRow();
                        // 返回 true，表示该事件执行完之后，panel 要关闭。否则 panel 不会关闭
                        return true;
                    }
                }, {
                    // 增加列
                    selector: '#' + addColBtnId,
                    type: 'click',
                    fn: function fn() {
                        _this2._addCol();
                        // 返回 true，表示该事件执行完之后，panel 要关闭。否则 panel 不会关闭
                        return true;
                    }
                }, {
                    // 删除行
                    selector: '#' + delRowBtnId,
                    type: 'click',
                    fn: function fn() {
                        _this2._delRow();
                        // 返回 true，表示该事件执行完之后，panel 要关闭。否则 panel 不会关闭
                        return true;
                    }
                }, {
                    // 删除列
                    selector: '#' + delColBtnId,
                    type: 'click',
                    fn: function fn() {
                        _this2._delCol();
                        // 返回 true，表示该事件执行完之后，panel 要关闭。否则 panel 不会关闭
                        return true;
                    }
                }, {
                    // 删除表格
                    selector: '#' + delTableBtnId,
                    type: 'click',
                    fn: function fn() {
                        _this2._delTable();
                        // 返回 true，表示该事件执行完之后，panel 要关闭。否则 panel 不会关闭
                        return true;
                    }
                }]
            }]
        });
        // 显示 panel
        panel.show();
    },

    // 获取选中的单元格的位置信息
    _getLocationData: function _getLocationData() {
        var result = {};
        var editor = this.editor;
        var $selectionELem = editor.selection.getSelectionContainerElem();
        if (!$selectionELem) {
            return;
        }
        var nodeName = $selectionELem.getNodeName();
        if (nodeName !== 'TD' && nodeName !== 'TH') {
            return;
        }

        // 获取 td index
        var $tr = $selectionELem.parent();
        var $tds = $tr.children();
        var tdLength = $tds.length;
        $tds.forEach(function (td, index) {
            if (td === $selectionELem[0]) {
                // 记录并跳出循环
                result.td = {
                    index: index,
                    elem: td,
                    length: tdLength
                };
                return false;
            }
        });

        // 获取 tr index
        var $tbody = $tr.parent();
        var $trs = $tbody.children();
        var trLength = $trs.length;
        $trs.forEach(function (tr, index) {
            if (tr === $tr[0]) {
                // 记录并跳出循环
                result.tr = {
                    index: index,
                    elem: tr,
                    length: trLength
                };
                return false;
            }
        });

        // 返回结果
        return result;
    },

    // 增加行
    _addRow: function _addRow() {
        // 获取当前单元格的位置信息
        var locationData = this._getLocationData();
        if (!locationData) {
            return;
        }
        var trData = locationData.tr;
        var $currentTr = $(trData.elem);
        var tdData = locationData.td;
        var tdLength = tdData.length;

        // 拼接即将插入的字符串
        var newTr = document.createElement('tr');
        var tpl = '',
            i = void 0;
        for (i = 0; i < tdLength; i++) {
            tpl += '<td>&nbsp;</td>';
        }
        newTr.innerHTML = tpl;
        // 插入
        $(newTr).insertAfter($currentTr);
    },

    // 增加列
    _addCol: function _addCol() {
        // 获取当前单元格的位置信息
        var locationData = this._getLocationData();
        if (!locationData) {
            return;
        }
        var trData = locationData.tr;
        var tdData = locationData.td;
        var tdIndex = tdData.index;
        var $currentTr = $(trData.elem);
        var $trParent = $currentTr.parent();
        var $trs = $trParent.children();

        // 遍历所有行
        $trs.forEach(function (tr) {
            var $tr = $(tr);
            var $tds = $tr.children();
            var $currentTd = $tds.get(tdIndex);
            var name = $currentTd.getNodeName().toLowerCase();

            // new 一个 td，并插入
            var newTd = document.createElement(name);
            $(newTd).insertAfter($currentTd);
        });
    },

    // 删除行
    _delRow: function _delRow() {
        // 获取当前单元格的位置信息
        var locationData = this._getLocationData();
        if (!locationData) {
            return;
        }
        var trData = locationData.tr;
        var $currentTr = $(trData.elem);
        $currentTr.remove();
    },

    // 删除列
    _delCol: function _delCol() {
        // 获取当前单元格的位置信息
        var locationData = this._getLocationData();
        if (!locationData) {
            return;
        }
        var trData = locationData.tr;
        var tdData = locationData.td;
        var tdIndex = tdData.index;
        var $currentTr = $(trData.elem);
        var $trParent = $currentTr.parent();
        var $trs = $trParent.children();

        // 遍历所有行
        $trs.forEach(function (tr) {
            var $tr = $(tr);
            var $tds = $tr.children();
            var $currentTd = $tds.get(tdIndex);
            // 删除
            $currentTd.remove();
        });
    },

    // 删除表格
    _delTable: function _delTable() {
        var editor = this.editor;
        var $selectionELem = editor.selection.getSelectionContainerElem();
        if (!$selectionELem) {
            return;
        }
        var $table = $selectionELem.parentUntil('table');
        if (!$table) {
            return;
        }
        $table.remove();
    },

    // 试图改变 active 状态
    tryChangeActive: function tryChangeActive(e) {
        var editor = this.editor;
        var $elem = this.$elem;
        var $selectionELem = editor.selection.getSelectionContainerElem();
        if (!$selectionELem) {
            return;
        }
        var nodeName = $selectionELem.getNodeName();
        if (nodeName === 'TD' || nodeName === 'TH') {
            this._active = true;
            $elem.addClass('w-e-active');
        } else {
            this._active = false;
            $elem.removeClass('w-e-active');
        }
    }
};

/*
    menu - video
*/
// 构造函数
function Video(editor) {
    this.editor = editor;
    this.$elem = $('<div class="w-e-menu"><i class="icon w-e-icon w-e-icon-play"></i></div>');
    this.type = 'panel';

    // 当前是否 active 状态
    this._active = false;
}

// 原型
Video.prototype = {
    constructor: Video,

    onClick: function onClick() {
        this._createPanel();
    },

    _createPanel: function _createPanel() {
        var _this = this;

        // 创建 id
        var textValId = getRandom('text-val');
        var btnId = getRandom('btn');

        // 创建 panel
        var panel = new Panel(this, {
            width: 350,
            // 一个 panel 多个 tab
            tabs: [{
                // 标题
                title: '插入视频',
                // 模板
                tpl: '<div>\n                        <input id="' + textValId + '" type="text" class="block" placeholder="\u683C\u5F0F\u5982\uFF1A<iframe src=... ></iframe>"/>\n                        <div class="w-e-button-container">\n                            <button id="' + btnId + '" class="right">\u63D2\u5165</button>\n                        </div>\n                    </div>',
                // 事件绑定
                events: [{
                    selector: '#' + btnId,
                    type: 'click',
                    fn: function fn() {
                        var $text = $('#' + textValId);
                        var val = $text.val().trim();

                        // 测试用视频地址
                        // <iframe height=498 width=510 src='http://player.youku.com/embed/XMjcwMzc3MzM3Mg==' frameborder=0 'allowfullscreen'></iframe>

                        if (val) {
                            // 插入视频
                            _this._insert(val);
                        }

                        // 返回 true，表示该事件执行完之后，panel 要关闭。否则 panel 不会关闭
                        return true;
                    }
                }] // first tab end
            }] // tabs end
        }); // panel end

        // 显示 panel
        panel.show();

        // 记录属性
        this.panel = panel;
    },

    // 插入视频
    _insert: function _insert(val) {
        var editor = this.editor;
        editor.cmd.do('insertHTML', val + '<p><br></p>');
    }
};

/*
    menu - img
*/
// 构造函数
function Image(editor) {
    this.editor = editor;
    var imgMenuId = getRandom('w-e-img');
    this.$elem = $('<div class="w-e-menu" id="' + imgMenuId + '"><i class="icon w-e-icon w-e-icon-image"></i></div>');
    editor.imgMenuId = imgMenuId;
    this.type = 'panel';

    // 当前是否 active 状态
    this._active = false;
}

// 原型
Image.prototype = {
    constructor: Image,

    onClick: function onClick() {
        var editor = this.editor;
        var config = editor.config;
        if (config.qiniu) {
            return;
        }
        if (this._active) {
            this._createEditPanel();
        } else {
            this._createInsertPanel();
        }
    },

    _createEditPanel: function _createEditPanel() {
        var editor = this.editor;

        // id
        var width30 = getRandom('width-30');
        var width50 = getRandom('width-50');
        var width100 = getRandom('width-100');
        var delBtn = getRandom('del-btn');

        // tab 配置
        var tabsConfig = [{
            title: '编辑图片',
            tpl: '<div>\n                    <div class="w-e-button-container" style="border-bottom:1px solid #f1f1f1;padding-bottom:5px;margin-bottom:5px;">\n                        <span style="float:left;font-size:14px;margin:4px 5px 0 5px;color:#333;">\u6700\u5927\u5BBD\u5EA6\uFF1A</span>\n                        <button id="' + width30 + '" class="left">30%</button>\n                        <button id="' + width50 + '" class="left">50%</button>\n                        <button id="' + width100 + '" class="left">100%</button>\n                    </div>\n                    <div class="w-e-button-container">\n                        <button id="' + delBtn + '" class="gray left">\u5220\u9664\u56FE\u7247</button>\n                    </dv>\n                </div>',
            events: [{
                selector: '#' + width30,
                type: 'click',
                fn: function fn() {
                    var $img = editor._selectedImg;
                    if ($img) {
                        $img.css('max-width', '30%');
                    }
                    // 返回 true，表示该事件执行完之后，panel 要关闭。否则 panel 不会关闭
                    return true;
                }
            }, {
                selector: '#' + width50,
                type: 'click',
                fn: function fn() {
                    var $img = editor._selectedImg;
                    if ($img) {
                        $img.css('max-width', '50%');
                    }
                    // 返回 true，表示该事件执行完之后，panel 要关闭。否则 panel 不会关闭
                    return true;
                }
            }, {
                selector: '#' + width100,
                type: 'click',
                fn: function fn() {
                    var $img = editor._selectedImg;
                    if ($img) {
                        $img.css('max-width', '100%');
                    }
                    // 返回 true，表示该事件执行完之后，panel 要关闭。否则 panel 不会关闭
                    return true;
                }
            }, {
                selector: '#' + delBtn,
                type: 'click',
                fn: function fn() {
                    var $img = editor._selectedImg;
                    if ($img) {
                        $img.remove();
                    }
                    // 返回 true，表示该事件执行完之后，panel 要关闭。否则 panel 不会关闭
                    return true;
                }
            }]
        }];

        // 创建 panel 并显示
        var panel = new Panel(this, {
            width: 300,
            tabs: tabsConfig
        });
        panel.show();

        // 记录属性
        this.panel = panel;
    },

    _createInsertPanel: function _createInsertPanel() {
        var editor = this.editor;
        var uploadImg = editor.uploadImg;
        var config = editor.config;

        // id
        var upTriggerId = getRandom('up-trigger');
        var upFileId = getRandom('up-file');
        var linkUrlId = getRandom('link-url');
        var linkBtnId = getRandom('link-btn');

        // tabs 的配置
        var tabsConfig = [{
            title: '上传图片',
            tpl: '<div class="w-e-up-img-container">\n                    <div id="' + upTriggerId + '" class="w-e-up-btn">\n                        <i class="w-e-icon-upload2"></i>\n                    </div>\n                    <div style="display:none;">\n                        <input id="' + upFileId + '" type="file" multiple="multiple" accept="image/jpg,image/jpeg,image/png,image/gif,image/bmp"/>\n                    </div>\n                </div>',
            events: [{
                // 触发选择图片
                selector: '#' + upTriggerId,
                type: 'click',
                fn: function fn() {
                    var $file = $('#' + upFileId);
                    var fileElem = $file[0];
                    if (fileElem) {
                        fileElem.click();
                    } else {
                        // 返回 true 可关闭 panel
                        return true;
                    }
                }
            }, {
                // 选择图片完毕
                selector: '#' + upFileId,
                type: 'change',
                fn: function fn() {
                    var $file = $('#' + upFileId);
                    var fileElem = $file[0];
                    if (!fileElem) {
                        // 返回 true 可关闭 panel
                        return true;
                    }

                    // 获取选中的 file 对象列表
                    var fileList = fileElem.files;
                    if (fileList.length) {
                        uploadImg.uploadImg(fileList);
                    }

                    // 返回 true 可关闭 panel
                    return true;
                }
            }]
        }, // first tab end
        {
            title: '网络图片',
            tpl: '<div>\n                    <input id="' + linkUrlId + '" type="text" class="block" placeholder="\u56FE\u7247\u94FE\u63A5"/></td>\n                    <div class="w-e-button-container">\n                        <button id="' + linkBtnId + '" class="right">\u63D2\u5165</button>\n                    </div>\n                </div>',
            events: [{
                selector: '#' + linkBtnId,
                type: 'click',
                fn: function fn() {
                    var $linkUrl = $('#' + linkUrlId);
                    var url = $linkUrl.val().trim();

                    if (url) {
                        uploadImg.insertLinkImg(url);
                    }

                    // 返回 true 表示函数执行结束之后关闭 panel
                    return true;
                }
            }] // second tab end
        }]; // tabs end

        // 判断 tabs 的显示
        var tabsConfigResult = [];
        if ((config.uploadImgShowBase64 || config.uploadImgServer || config.customUploadImg) && window.FileReader) {
            // 显示“上传图片”
            tabsConfigResult.push(tabsConfig[0]);
        }
        if (config.showLinkImg) {
            // 显示“网络图片”
            tabsConfigResult.push(tabsConfig[1]);
        }

        // 创建 panel 并显示
        var panel = new Panel(this, {
            width: 300,
            tabs: tabsConfigResult
        });
        panel.show();

        // 记录属性
        this.panel = panel;
    },

    // 试图改变 active 状态
    tryChangeActive: function tryChangeActive(e) {
        var editor = this.editor;
        var $elem = this.$elem;
        if (editor._selectedImg) {
            this._active = true;
            $elem.addClass('w-e-active');
        } else {
            this._active = false;
            $elem.removeClass('w-e-active');
        }
    }
};

/*
    menu - soundCode
*/
// 构造函数
function SoundCode(editor) {
    this.editor = editor;
    this.$elem = $('<div class="w-e-menu">\n            <i class="icon w-e-icon w-e-icon-sound-code"></i>\n        </div>');
    this.type = 'click';

    // 当前是否 active 状态
    this._active = false;
}

// 原型
SoundCode.prototype = {
    constructor: SoundCode,

    onClick: function onClick(e) {
        var editor = this.editor;
        var codeMirror = editor.codeMirror;
        var $textElem = editor.$textElem;
        var $soundCodeElem = document.querySelector('.CodeMirror'); // 获取源码编辑器
        var htmlEditFlag = $soundCodeElem.style.visibility; // 记录编辑器是否处于编辑状态
        var editorContent = convertHTMLForCodeView($textElem[0], 4); // 获取文本源码
        var editorValue = codeMirror.getValue(); // 获取源码容器内源码value(string)

        if (htmlEditFlag === 'hidden') {
            $soundCodeElem.setAttribute('style', 'visibility: visible');

            codeMirror.setValue(editorContent);
            $textElem.css('display', 'none');
            this._menusControl(false);
        } else {
            editor.txt.html(editorValue);
            $soundCodeElem.setAttribute('style', 'visibility: hidden');
            $textElem.css('display', 'block');
            this._menusControl(true);
        }
    },

    _menusControl: function _menusControl(disable) {
        // 控制menu显隐
        var editor = this.editor;
        var menus = editor.menus.menus;

        Object.keys(menus).map(function (item) {
            var menuItem = menus[item].$elem;
            item !== 'soundCode' && menuItem.css('visibility', !disable ? 'hidden' : 'visible');
        });
    }
};

/*
**设置选中文字样式
*/

// 用于记录浏览器的类型
var browser = {};
var ua = navigator.userAgent.toLowerCase();

browser.msie = /msie ([\d.]+)/.test(ua);
browser.firefox = /firefox\/([\d.]+)/.test(ua);
browser.chrome = /chrome\/([\d.]+)/.test(ua);

// 获取多个节点的HTML
function getInnerHtml(nodes) {
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
function SelectionRange(doc, range) {
    // 获取选中的内容的HTML
    this.getSelectedHtml = function () {
        if (range == null) return '';

        if (browser.msie) {
            if (range.htmlText !== undefined) return range.htmlText;else return '';
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
function getSelectionRange(win) {
    var range = null;

    if (browser.msie) {
        range = win.document.selection.createRange();
        if (range.parentElement().document !== win.document) {
            range = null;
        }
    } else if (browser.firefox || browser.chrome) {
        var sel = win.getSelection();
        if (sel.rangeCount > 0) range = sel.getRangeAt(0);else range = null;
    }

    return new SelectionRange(win.document, range);
}

// 修改选中的HTML的样式
function setNodeStyle(doc, node, name, value) {
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

function setStyle(doc, html, name, value) {
    var dom = doc.createElement('div');
    dom.innerHTML = html;

    for (var i = 0; i < dom.childNodes.length; i++) {
        var node = dom.childNodes[i];
        if (node.innerHTML === undefined) {
            // 如果是文本节点，则转换转换成p
            var span = doc.createElement('p');
            span.style[name] = value;
            if (node.nodeValue !== undefined) span.innerHTML = node.nodeValue.replace(/\</ig, function () {
                return '<';
            });else if (node.textContent !== undefined) span.innetHTML = node.textContent.replace(/\</ig, function () {
                return '<';
            });
            // 替换掉文本节点
            dom.replaceChild(span, node);
        } else {
            setNodeStyle(doc, node, name, value);
        }
    }
    return dom.innerHTML;
}

/*
    menu - lineHeight
*/
// 构造函数
function lineHeight(editor) {
    var _this = this;

    this.editor = editor;
    this.$elem = $('<div class="w-e-menu">\n            <i class="icon w-e-icon w-e-icon-line-height"></i>\n        </div>');
    this.type = 'droplist';

    // 当前是否 active 状态
    this._active = false;

    // 初始化 droplist
    this.droplist = new DropList(this, {
        width: 100,
        $title: $('<p>设置行高</p>'),
        type: 'list', // droplist 以列表形式展示
        list: [{ $elem: $('<p>1</p>'), value: '1' }, { $elem: $('<p>1.5</p>'), value: '1.5' }, { $elem: $('<p>1.75</p>'), value: '1.75' }, { $elem: $('<p>2</p>'), value: '2' }, { $elem: $('<p>3</p>'), value: '3' }, { $elem: $('<p>4</p>'), value: '4' }, { $elem: $('<p>5</p>'), value: '5' }],
        onClick: function onClick(value) {
            // 注意 this 是指向当前的 lineHeight 对象
            _this._command(value);
        }
    });
}

// 原型
lineHeight.prototype = {
    onstructor: lineHeight,

    // 执行命令
    _command: function _command(val) {
        var editor = this.editor;
        console.log(val, '111111');
        var isSeleEmpty = editor.selection.isSelectionEmpty();

        if (isSeleEmpty) {
            // 选区是空的，插入并选中一个“空白”
            // editor.selection.createEmptyRange()
        }
        editor.selection.restoreSelection();
        this._setLineHeight(val);
    },
    // 设置行高
    _setLineHeight: function _setLineHeight(val) {
        val = val == 1 ? 'unset' : val + 'em';
        var range = getSelectionRange(window);
        var selectNodes = range.getSelectedHtml();
        var targetNodes = [];
        for (var i = 0; i < selectNodes.length; i++) {
            var html = setStyle(document, selectNodes[i], 'lineHeight', val);
            targetNodes.push(html);
        }
        range.replace(targetNodes);
    }
};

/*
    clearFormat-menu
*/
// 构造函数
function ClearFormat(editor) {
    this.editor = editor;
    this.$elem = $('<div class="w-e-menu">\n            <i class="icon w-e-icon w-e-icon-format"></i>\n        </div>');
    this.type = 'click';

    // 当前是否 active 状态
    this._active = false;
}

// 原型
ClearFormat.prototype = {
    constructor: ClearFormat,

    onClick: function onClick(e) {
        var editor = this.editor;
        var editorContent = editor.txt.html(); // 获取文本源码
        var newContent = editorContent.replace(/style=\"(.*?)\"/g, '');
        editor.txt.html(newContent);
    }
};

/*
    menu - video
*/
// 构造函数
function Iframe(editor) {
    this.editor = editor;
    this.$elem = $('<div class="w-e-menu"><i class="icon w-e-icon w-e-icon-iframe"></i></div>');
    this.type = 'panel';

    // 当前是否 active 状态
    this._active = false;
}

// 原型
Iframe.prototype = {
    constructor: Iframe,

    onClick: function onClick() {
        this._createPanel();
    },

    _createPanel: function _createPanel() {
        var _this = this;

        // 创建 id
        var textValId = getRandom('text-val');
        var btnId = getRandom('btn');

        // 创建 panel
        var panel = new Panel(this, {
            width: 350,
            // 一个 panel 多个 tab
            tabs: [{
                // 标题
                title: '插入Iframe',
                // 模板
                tpl: '<div>\n                        <input id="' + textValId + '" type="text" class="block" placeholder="http://..."/>\n                        <div class="w-e-button-container">\n                            <button id="' + btnId + '" class="right">\u63D2\u5165</button>\n                        </div>\n                    </div>',
                // 事件绑定
                events: [{
                    selector: '#' + btnId,
                    type: 'click',
                    fn: function fn() {
                        var $text = $('#' + textValId);
                        var val = $text.val().trim();
                        if (val) {
                            _this._insert(val);
                        }
                        // 返回 true，表示该事件执行完之后，panel 要关闭。否则 panel 不会关闭
                        return true;
                    }
                }] // first tab end
            }] // tabs end
        }); // panel end

        // 显示 panel
        panel.show();

        // 记录属性
        this.panel = panel;
    },

    // 插入Iframe
    _insert: function _insert(flvSrc) {
        var editor = this.editor;
        editor.cmd.do('insertHTML', '<div class="flv-box"><iframe class="video_iframe" frameborder="0" src="' + flvSrc + '"></iframe></div>');
    }
};

/*
    所有菜单的汇总
*/

// 存储菜单的构造函数
var MenuConstructors = {};

MenuConstructors.bold = Bold;

MenuConstructors.head = Head;

MenuConstructors.fontSize = FontSize;

MenuConstructors.fontName = FontName;

MenuConstructors.link = Link;

MenuConstructors.italic = Italic;

MenuConstructors.redo = Redo;

MenuConstructors.strikeThrough = StrikeThrough;

MenuConstructors.underline = Underline;

MenuConstructors.undo = Undo;

MenuConstructors.list = List;

MenuConstructors.justify = Justify;

MenuConstructors.foreColor = ForeColor;

MenuConstructors.backColor = BackColor;

MenuConstructors.quote = Quote;

MenuConstructors.code = Code;

MenuConstructors.emoticon = Emoticon;

MenuConstructors.table = Table;

MenuConstructors.video = Video;

MenuConstructors.image = Image;

MenuConstructors.soundCode = SoundCode;

MenuConstructors.lineHeight = lineHeight;

MenuConstructors.clearFormat = ClearFormat;

MenuConstructors.iframe = Iframe;

/*
    菜单集合
*/
// 构造函数
function Menus(editor) {
    this.editor = editor;
    this.menus = {};
}

// 修改原型
Menus.prototype = {
    constructor: Menus,

    // 初始化菜单
    init: function init() {
        var _this = this;

        var editor = this.editor;
        var config = editor.config || {};
        var configMenus = config.menus || []; // 获取配置中的菜单

        // 根据配置信息，创建菜单
        configMenus.forEach(function (menuKey) {
            var MenuConstructor = MenuConstructors[menuKey];
            if (MenuConstructor && typeof MenuConstructor === 'function') {
                // 创建单个菜单
                _this.menus[menuKey] = new MenuConstructor(editor);
            }
        });

        // 添加到菜单栏
        this._addToToolbar();

        // 绑定事件
        this._bindEvent();
    },

    // 添加到菜单栏
    _addToToolbar: function _addToToolbar() {
        var editor = this.editor;
        var $toolbarElem = editor.$toolbarElem;
        var menus = this.menus;
        var config = editor.config;
        // config.zIndex 是配置的编辑区域的 z-index，菜单的 z-index 得在其基础上 +1
        var zIndex = config.zIndex + 1;
        objForEach(menus, function (key, menu) {
            var $elem = menu.$elem;
            if ($elem) {
                // 设置 z-index
                $elem.css('z-index', zIndex);
                $toolbarElem.append($elem);
            }
        });
    },

    // 绑定菜单 click mouseenter 事件
    _bindEvent: function _bindEvent() {
        var menus = this.menus;
        var editor = this.editor;
        objForEach(menus, function (key, menu) {
            var type = menu.type;
            if (!type) {
                return;
            }
            var $elem = menu.$elem;
            var droplist = menu.droplist;
            var panel = menu.panel;

            // 点击类型，例如 bold
            if (type === 'click' && menu.onClick) {
                $elem.on('click', function (e) {
                    if (editor.selection.getRange() == null) {
                        return;
                    }
                    menu.onClick(e);
                });
            }

            // 下拉框，例如 head
            if (type === 'droplist' && droplist) {
                $elem.on('mouseenter', function (e) {
                    if (editor.selection.getRange() == null) {
                        return;
                    }
                    // 显示
                    droplist.showTimeoutId = setTimeout(function () {
                        droplist.show();
                    }, 200);
                }).on('mouseleave', function (e) {
                    // 隐藏
                    droplist.hideTimeoutId = setTimeout(function () {
                        droplist.hide();
                    }, 0);
                });
            }

            // 弹框类型，例如 link
            if (type === 'panel' && menu.onClick) {
                $elem.on('click', function (e) {
                    e.stopPropagation();
                    if (editor.selection.getRange() == null) {
                        return;
                    }
                    // 在自定义事件中显示 panel
                    menu.onClick(e);
                });
            }
        });
    },

    // 尝试修改菜单状态
    changeActive: function changeActive() {
        var menus = this.menus;
        objForEach(menus, function (key, menu) {
            if (menu.tryChangeActive) {
                setTimeout(function () {
                    menu.tryChangeActive();
                }, 100);
            }
        });
    }
};

// 过滤word冗余代码及无用属性
function filterWord(html) {
    //是否是word过来的内容
    function isWordDocument(str) {
        return (/(class="?Mso|style="[^"]*\bmso\-|w:WordDocument|<(v|o):|lang=)/ig.test(str)
        );
    }
    //去掉小数
    function transUnit(v) {
        v = v.replace(/[\d.]+\w+/g, function (m) {
            return transUnitToPx(m);
        });
        return v;
    }

    function filterPasteWord(str) {
        return str.replace(/[\t\r\n]+/g, ' ').replace(/<!--[\s\S]*?-->/ig, '')
        //转换图片
        .replace(/<v:shape [^>]*>[\s\S]*?.<\/v:shape>/gi, function (str) {
            //opera能自己解析出image所这里直接返回空
            // if(browser.opera){
            //     return ''
            // }
            try {
                //有可能是bitmap占为图，无用，直接过滤掉，主要体现在粘贴excel表格中
                if (/Bitmap/i.test(str)) {
                    return '';
                }
                var width = str.match(/width:([ \d.]*p[tx])/i)[1],
                    height = str.match(/height:([ \d.]*p[tx])/i)[1],
                    src = str.match(/src=\s*"([^"]*)"/i)[1];
                return '<img width="' + transUnit(width) + '" height="' + transUnit(height) + '" src="' + src + '" />';
            } catch (e) {
                return '';
            }
        })
        //针对wps添加的多余标签处理
        .replace(/<\/?div[^>]*>/g, '')
        //去掉多余的属性
        .replace(/v:\w+=(["']?)[^'"]+\1/g, '').replace(/<(!|script[^>]*>.*?<\/script(?=[>\s])|\/?(\?xml(:\w+)?|xml|meta|link|style|\w+:\w+)(?=[\s\/>]))[^>]*>/gi, '').replace(/<p [^>]*class="?MsoHeading"?[^>]*>(.*?)<\/p>/gi, '<p><strong>$1</strong></p>')
        //去掉多余的属性
        .replace(/\s+(class|lang|align)\s*=\s*(['"]?)([\w-]+)\2/ig, function (str, name, marks, val) {
            //保留list的标示
            return name == 'class' && val == 'MsoListParagraph' ? str : '';
        })
        //清除多余的font/span不能匹配&nbsp;有可能是空格
        .replace(/<(font|span)[^>]*>(\s*)<\/\1>/gi, function (a, b, c) {
            return c.replace(/[\t\r\n ]+/g, ' ');
        })
        //处理style的问题
        .replace(/(<[a-z][^>]*)\sstyle=(["'])([^\2]*?)\2/gi, function (str, tag, tmp, style) {
            var n = [],
                s = style.replace(/^\s+|\s+$/, '').replace(/&#39;/g, '\'').replace(/&quot;/gi, "'").replace(/[\d.]+(cm|pt)/g, function (str) {
                return transUnitToPx(str);
            }).split(/;\s*/g);

            for (var i = 0, v; v = s[i]; i++) {

                var name,
                    value,
                    parts = v.split(":");

                if (parts.length == 2) {
                    name = parts[0].toLowerCase();
                    value = parts[1].toLowerCase();
                    if (/^(background)\w*/.test(name) && value.replace(/(initial|\s)/g, '').length == 0 || /^(margin)\w*/.test(name) && /^0\w+$/.test(value)) {
                        continue;
                    }

                    switch (name) {
                        case "mso-padding-alt":
                        case "mso-padding-top-alt":
                        case "mso-padding-right-alt":
                        case "mso-padding-bottom-alt":
                        case "mso-padding-left-alt":
                        case "mso-margin-alt":
                        case "mso-margin-top-alt":
                        case "mso-margin-right-alt":
                        case "mso-margin-bottom-alt":
                        case "mso-margin-left-alt":
                        case "mso-height":
                        case "mso-width":
                        case "mso-vertical-align-alt":
                            //trace:1819 ff下会解析出padding在table上
                            if (!/<table/.test(tag)) n[i] = name.replace(/^mso-|-alt$/g, "") + ":" + transUnit(value);
                            continue;
                        case "horiz-align":
                            n[i] = "text-align:" + value;
                            continue;

                        case "vert-align":
                            n[i] = "vertical-align:" + value;
                            continue;

                        case "font-color":
                        case "mso-foreground":
                            n[i] = "color:" + value;
                            continue;

                        case "mso-background":
                        case "mso-highlight":
                            n[i] = "background:" + value;
                            continue;

                        case "mso-default-height":
                            n[i] = "min-height:" + transUnit(value);
                            continue;

                        case "mso-default-width":
                            n[i] = "min-width:" + transUnit(value);
                            continue;

                        case "mso-padding-between-alt":
                            n[i] = "border-collapse:separate;border-spacing:" + transUnit(value);
                            continue;

                        case "text-line-through":
                            if (value == "single" || value == "double") {
                                n[i] = "text-decoration:line-through";
                            }
                            continue;
                        case "mso-zero-height":
                            if (value == "yes") {
                                n[i] = "display:none";
                            }
                            continue;
                        //                                case 'background':
                        //                                    break;
                        case 'margin':
                            if (!/[1-9]/.test(value)) {
                                continue;
                            }

                    }

                    if (/^(mso|column|font-emph|lang|layout|line-break|list-image|nav|panose|punct|row|ruby|sep|size|src|tab-|table-border|text-(?:decor|trans)|top-bar|version|vnd|word-break)/.test(name) || /text\-indent|padding|margin/.test(name) && /\-[\d.]+/.test(value)) {
                        continue;
                    }

                    n[i] = name + ":" + parts[1];
                }
            }
            return tag + (n.length ? ' style="' + n.join(';').replace(/;{2,}/g, ';') + '"' : '');
        });
    }
    return isWordDocument(html) ? filterPasteWord(html) : html;
}

/**
 * 把cm／pt为单位的值转换为px为单位的值
 * @method transUnitToPx
 * @param { String } 待转换的带单位的字符串
 * @return { String } 转换为px为计量单位的值的字符串
 * @example
 * ```javascript
 *
 * //output: 500px
 * console.log( UE.utils.transUnitToPx( '20cm' ) );
 *
 * //output: 27px
 * console.log( UE.utils.transUnitToPx( '20pt' ) );
 *
 * ```
 */
function transUnitToPx(val) {
    if (!/(pt|cm)/.test(val)) {
        return val;
    }
    var unit;
    val.replace(/([\d.]+)(\w+)/, function (str, v, u) {
        val = v;
        unit = u;
    });
    switch (unit) {
        case 'cm':
            val = parseFloat(val) * 25;
            break;
        case 'pt':
            val = Math.round(parseFloat(val) * 96 / 72);
    }
    return val + (val ? 'px' : '');
}

/*
    粘贴信息的处理
*/

// 获取粘贴的纯文本
function getPasteText(e) {
    var clipboardData = e.clipboardData || e.originalEvent && e.originalEvent.clipboardData;
    var pasteText = void 0;
    if (clipboardData == null) {
        pasteText = window.clipboardData && window.clipboardData.getData('text');
    } else {
        pasteText = clipboardData.getData('text/plain');
    }

    return replaceHtmlSymbol(pasteText);
}

// 获取粘贴的html
function getPasteHtml(e, filterStyle, ignoreImg) {
    var clipboardData = e.clipboardData || e.originalEvent && e.originalEvent.clipboardData;
    var pasteText = void 0,
        pasteHtml = void 0;
    if (clipboardData == null) {
        pasteText = window.clipboardData && window.clipboardData.getData('text');
    } else {
        pasteText = clipboardData.getData('text/plain');
        pasteHtml = clipboardData.getData('text/html');
    }
    if (!pasteHtml && pasteText) {
        pasteHtml = '<p class="p">' + replaceHtmlSymbol(pasteText) + '</p>';
    }
    if (!pasteHtml) {
        return;
    }

    // 过滤word中状态过来的无用字符
    pasteHtml = filterWord(pasteHtml);
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
    pasteHtml = pasteHtml.replace(/<p>/g, '<p class="p">');
    return pasteHtml;
}

// 获取粘贴的图片文件
function getPasteImgs(e) {
    var result = [];
    var txt = getPasteText(e);
    if (txt) {
        // 有文字，就忽略图片
        return result;
    }

    var clipboardData = e.clipboardData || e.originalEvent && e.originalEvent.clipboardData || {};
    var items = clipboardData.items;
    if (!items) {
        return result;
    }

    objForEach(items, function (key, value) {
        var type = value.type;
        if (/image/i.test(type)) {
            result.push(value.getAsFile());
        }
    });

    return result;
}

/*
    编辑区域
*/

// 获取一个 elem.childNodes 的 JSON 数据
function getChildrenJSON($elem) {
    var result = [];
    var $children = $elem.childNodes() || []; // 注意 childNodes() 可以获取文本节点
    $children.forEach(function (curElem) {
        var elemResult = void 0;
        var nodeType = curElem.nodeType;

        // 文本节点
        if (nodeType === 3) {
            elemResult = curElem.textContent;
            elemResult = replaceHtmlSymbol(elemResult);
        }

        // 普通 DOM 节点
        if (nodeType === 1) {
            elemResult = {};

            // tag
            elemResult.tag = curElem.nodeName.toLowerCase();
            // attr
            var attrData = [];
            var attrList = curElem.attributes || {};
            var attrListLength = attrList.length || 0;
            for (var i = 0; i < attrListLength; i++) {
                var attr = attrList[i];
                attrData.push({
                    name: attr.name,
                    value: attr.value
                });
            }
            elemResult.attrs = attrData;
            // children（递归）
            elemResult.children = getChildrenJSON($(curElem));
        }

        result.push(elemResult);
    });
    return result;
}

// 构造函数
function Text(editor) {
    this.editor = editor;
}

// 修改原型
Text.prototype = {
    constructor: Text,

    // 初始化
    init: function init() {
        // 绑定事件
        this._bindEvent();
    },

    // 清空内容
    clear: function clear() {
        this.html('<p class="p"><br></p>');
    },

    // 获取 设置 html
    html: function html(val) {
        var editor = this.editor;
        var $textElem = editor.$textElem;
        var html = void 0;
        if (val == null) {
            html = $textElem.html();
            // 未选中任何内容的时候点击“加粗”或者“斜体”等按钮，就得需要一个空的占位符 &#8203 ，这里替换掉
            html = html.replace(/\u200b/gm, '');
            return html;
        } else {
            $textElem.html(val);

            // 初始化选取，将光标定位到内容尾部
            editor.initSelection();
        }
    },

    // 获取 JSON
    getJSON: function getJSON() {
        var editor = this.editor;
        var $textElem = editor.$textElem;
        return getChildrenJSON($textElem);
    },

    // 获取 设置 text
    text: function text(val) {
        var editor = this.editor;
        var $textElem = editor.$textElem;
        var text = void 0;
        if (val == null) {
            text = $textElem.text();
            // 未选中任何内容的时候点击“加粗”或者“斜体”等按钮，就得需要一个空的占位符 &#8203 ，这里替换掉
            text = text.replace(/\u200b/gm, '');
            return text;
        } else {
            $textElem.text('<p class="p">' + val + '</p>');

            // 初始化选取，将光标定位到内容尾部
            editor.initSelection();
        }
    },

    // 追加内容
    append: function append(html) {
        var editor = this.editor;
        var $textElem = editor.$textElem;
        $textElem.append($(html));

        // 初始化选取，将光标定位到内容尾部
        editor.initSelection();
    },

    // 绑定事件
    _bindEvent: function _bindEvent() {
        // 实时保存选取
        this._saveRangeRealTime();

        // 按回车建时的特殊处理
        this._enterKeyHandle();

        // 清空时保留 <p><br></p>
        this._clearHandle();

        // 粘贴事件（粘贴文字，粘贴图片）
        this._pasteHandle();

        // tab 特殊处理
        this._tabHandle();

        // img 点击
        this._imgHandle();

        // 拖拽事件
        this._dragHandle();
    },

    // 实时保存选取
    _saveRangeRealTime: function _saveRangeRealTime() {
        var editor = this.editor;
        var $textElem = editor.$textElem;

        // 保存当前的选区
        function saveRange(e) {
            // 随时保存选区
            editor.selection.saveRange();
            // 更新按钮 ative 状态
            editor.menus.changeActive();
        }
        // 按键后保存
        $textElem.on('keyup', saveRange);
        $textElem.on('mousedown', function (e) {
            // mousedown 状态下，鼠标滑动到编辑区域外面，也需要保存选区
            $textElem.on('mouseleave', saveRange);
        });
        $textElem.on('mouseup', function (e) {
            saveRange();
            // 在编辑器区域之内完成点击，取消鼠标滑动到编辑区外面的事件
            $textElem.off('mouseleave', saveRange);
        });
    },

    // 按回车键时的特殊处理
    _enterKeyHandle: function _enterKeyHandle() {
        var editor = this.editor;
        var $textElem = editor.$textElem;

        function insertEmptyP($selectionElem) {
            var $p = $('<p class="p"><br></p>');
            $p.insertBefore($selectionElem);
            editor.selection.createRangeByElem($p, true);
            editor.selection.restoreSelection();
            $selectionElem.remove();
        }

        // 将回车之后生成的非 <p> 的顶级标签，改为 <p>
        function pHandle(e) {
            var $selectionElem = editor.selection.getSelectionContainerElem();
            var $parentElem = $selectionElem.parent();

            if ($parentElem.html() === '<code><br></code>') {
                // 回车之前光标所在一个 <p><code>.....</code></p> ，忽然回车生成一个空的 <p><code><br></code></p>
                // 而且继续回车跳不出去，因此只能特殊处理
                insertEmptyP($selectionElem);
                return;
            }

            if (!$parentElem.equal($textElem)) {
                // 不是顶级标签
                return;
            }

            var nodeName = $selectionElem.getNodeName();
            if (nodeName === 'P') {
                // 当前的标签是 P ，不用做处理
                return;
            }

            if ($selectionElem.text()) {
                // 有内容，不做处理
                return;
            }

            // 插入 <p> ，并将选取定位到 <p>，删除当前标签
            insertEmptyP($selectionElem);
        }

        $textElem.on('keyup', function (e) {
            if (e.keyCode !== 13) {
                // 不是回车键
                return;
            }
            // 将回车之后生成的非 <p> 的顶级标签，改为 <p>
            pHandle(e);
        });

        // <pre><code></code></pre> 回车时 特殊处理
        function codeHandle(e) {
            var $selectionElem = editor.selection.getSelectionContainerElem();
            if (!$selectionElem) {
                return;
            }
            var $parentElem = $selectionElem.parent();
            var selectionNodeName = $selectionElem.getNodeName();
            var parentNodeName = $parentElem.getNodeName();

            if (selectionNodeName !== 'CODE' || parentNodeName !== 'PRE') {
                // 不符合要求 忽略
                return;
            }

            if (!editor.cmd.queryCommandSupported('insertHTML')) {
                // 必须原生支持 insertHTML 命令
                return;
            }

            // 处理：光标定位到代码末尾，联系点击两次回车，即跳出代码块
            if (editor._willBreakCode === true) {
                // 此时可以跳出代码块
                // 插入 <p> ，并将选取定位到 <p>
                var $p = $('<p class="p"><br></p>');
                $p.insertAfter($parentElem);
                editor.selection.createRangeByElem($p, true);
                editor.selection.restoreSelection();

                // 修改状态
                editor._willBreakCode = false;

                e.preventDefault();
                return;
            }

            var _startOffset = editor.selection.getRange().startOffset;

            // 处理：回车时，不能插入 <br> 而是插入 \n ，因为是在 pre 标签里面
            editor.cmd.do('insertHTML', '\n');
            editor.selection.saveRange();
            if (editor.selection.getRange().startOffset === _startOffset) {
                // 没起作用，再来一遍
                editor.cmd.do('insertHTML', '\n');
            }

            var codeLength = $selectionElem.html().length;
            if (editor.selection.getRange().startOffset + 1 === codeLength) {
                // 说明光标在代码最后的位置，执行了回车操作
                // 记录下来，以便下次回车时候跳出 code
                editor._willBreakCode = true;
            }

            // 阻止默认行为
            e.preventDefault();
        }

        $textElem.on('keydown', function (e) {
            if (e.keyCode !== 13) {
                // 不是回车键
                // 取消即将跳转代码块的记录
                editor._willBreakCode = false;
                return;
            }
            // <pre><code></code></pre> 回车时 特殊处理
            codeHandle(e);
        });
    },

    // 清空时保留 <p><br></p>
    _clearHandle: function _clearHandle() {
        var editor = this.editor;
        var $textElem = editor.$textElem;

        $textElem.on('keydown', function (e) {
            if (e.keyCode !== 8) {
                return;
            }
            var txtHtml = $textElem.html().toLowerCase().trim();
            if (txtHtml === '<p class="p"><br></p>') {
                // 最后剩下一个空行，就不再删除了
                e.preventDefault();
                return;
            }
        });

        $textElem.on('keyup', function (e) {
            if (e.keyCode !== 8) {
                return;
            }
            var $p = void 0;
            var txtHtml = $textElem.html().toLowerCase().trim();

            // firefox 时用 txtHtml === '<br>' 判断，其他用 !txtHtml 判断
            if (!txtHtml || txtHtml === '<br>') {
                // 内容空了
                $p = $('<p class="p"><br/></p>');
                $textElem.html(''); // 一定要先清空，否则在 firefox 下有问题
                $textElem.append($p);
                editor.selection.createRangeByElem($p, false, true);
                editor.selection.restoreSelection();
            }
        });
    },

    // 粘贴事件（粘贴文字 粘贴图片）
    _pasteHandle: function _pasteHandle() {
        var editor = this.editor;
        var config = editor.config;
        var pasteFilterStyle = config.pasteFilterStyle;
        var pasteTextHandle = config.pasteTextHandle;
        var ignoreImg = config.pasteIgnoreImg;
        var $textElem = editor.$textElem;

        // 粘贴图片、文本的事件，每次只能执行一个
        // 判断该次粘贴事件是否可以执行
        var pasteTime = 0;
        function canDo() {
            var now = Date.now();
            var flag = false;
            if (now - pasteTime >= 100) {
                // 间隔大于 100 ms ，可以执行
                flag = true;
            }
            pasteTime = now;
            return flag;
        }
        function resetTime() {
            pasteTime = 0;
        }

        // 粘贴文字
        $textElem.on('paste', function (e) {
            if (UA.isIE()) {
                return;
            } else {
                // 阻止默认行为，使用 execCommand 的粘贴命令
                e.preventDefault();
            }

            // 粘贴图片和文本，只能同时使用一个
            if (!canDo()) {
                return;
            }

            // 获取粘贴的文字
            var pasteHtml = getPasteHtml(e, pasteFilterStyle, ignoreImg);
            var pasteText = getPasteText(e);
            pasteText = pasteText.replace(/\n/gm, '<br>');

            var $selectionElem = editor.selection.getSelectionContainerElem();
            if (!$selectionElem) {
                return;
            }
            var nodeName = $selectionElem.getNodeName();

            // code 中只能粘贴纯文本
            if (nodeName === 'CODE' || nodeName === 'PRE') {
                if (pasteTextHandle && isFunction(pasteTextHandle)) {
                    // 用户自定义过滤处理粘贴内容
                    pasteText = '' + (pasteTextHandle(pasteText) || '');
                }
                editor.cmd.do('insertHTML', '<p class="p">' + pasteText + '</p>');
                return;
            }

            // 先放开注释，有问题再追查 ————
            // // 表格中忽略，可能会出现异常问题
            // if (nodeName === 'TD' || nodeName === 'TH') {
            //     return
            // }

            if (!pasteHtml) {
                // 没有内容，可继续执行下面的图片粘贴
                resetTime();
                return;
            }
            try {
                // firefox 中，获取的 pasteHtml 可能是没有 <ul> 包裹的 <li>
                // 因此执行 insertHTML 会报错
                if (pasteTextHandle && isFunction(pasteTextHandle)) {
                    // 用户自定义过滤处理粘贴内容
                    pasteHtml = '' + (pasteTextHandle(pasteHtml) || '');
                }
                editor.cmd.do('insertHTML', pasteHtml);
            } catch (ex) {
                // 此时使用 pasteText 来兼容一下
                if (pasteTextHandle && isFunction(pasteTextHandle)) {
                    // 用户自定义过滤处理粘贴内容
                    pasteText = '' + (pasteTextHandle(pasteText) || '');
                }
                editor.cmd.do('insertHTML', '<p class="p">' + pasteText + '</p>');
            }
        });

        // 粘贴图片
        $textElem.on('paste', function (e) {
            if (UA.isIE()) {
                return;
            } else {
                e.preventDefault();
            }

            // 粘贴图片和文本，只能同时使用一个
            if (!canDo()) {
                return;
            }

            // 获取粘贴的图片
            var pasteFiles = getPasteImgs(e);
            if (!pasteFiles || !pasteFiles.length) {
                return;
            }

            // 获取当前的元素
            var $selectionElem = editor.selection.getSelectionContainerElem();
            if (!$selectionElem) {
                return;
            }
            var nodeName = $selectionElem.getNodeName();

            // code 中粘贴忽略
            if (nodeName === 'CODE' || nodeName === 'PRE') {
                return;
            }

            // 上传图片
            var uploadImg = editor.uploadImg;
            uploadImg.uploadImg(pasteFiles);
        });
    },

    // tab 特殊处理
    _tabHandle: function _tabHandle() {
        var editor = this.editor;
        var $textElem = editor.$textElem;

        $textElem.on('keydown', function (e) {
            if (e.keyCode !== 9) {
                return;
            }
            if (!editor.cmd.queryCommandSupported('insertHTML')) {
                // 必须原生支持 insertHTML 命令
                return;
            }
            var $selectionElem = editor.selection.getSelectionContainerElem();
            if (!$selectionElem) {
                return;
            }
            var $parentElem = $selectionElem.parent();
            var selectionNodeName = $selectionElem.getNodeName();
            var parentNodeName = $parentElem.getNodeName();

            if (selectionNodeName === 'CODE' && parentNodeName === 'PRE') {
                // <pre><code> 里面
                editor.cmd.do('insertHTML', '    ');
            } else {
                // 普通文字
                editor.cmd.do('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;');
            }

            e.preventDefault();
        });
    },

    // img 点击
    _imgHandle: function _imgHandle() {
        var editor = this.editor;
        var $textElem = editor.$textElem;

        // 为图片增加 selected 样式
        $textElem.on('click', 'img', function (e) {
            var img = this;
            var $img = $(img);

            if ($img.attr('data-w-e') === '1') {
                // 是表情图片，忽略
                return;
            }

            // 记录当前点击过的图片
            editor._selectedImg = $img;

            // 修改选区并 restore ，防止用户此时点击退格键，会删除其他内容
            editor.selection.createRangeByElem($img);
            editor.selection.restoreSelection();
        });

        // 去掉图片的 selected 样式
        $textElem.on('click  keyup', function (e) {
            if (e.target.matches('img')) {
                // 点击的是图片，忽略
                return;
            }
            // 删除记录
            editor._selectedImg = null;
        });
    },

    // 拖拽事件
    _dragHandle: function _dragHandle() {
        var editor = this.editor;

        // 禁用 document 拖拽事件
        var $document = $(document);
        $document.on('dragleave drop dragenter dragover', function (e) {
            e.preventDefault();
        });

        // 添加编辑区域拖拽事件
        var $textElem = editor.$textElem;
        $textElem.on('drop', function (e) {
            e.preventDefault();
            var files = e.dataTransfer && e.dataTransfer.files;
            if (!files || !files.length) {
                return;
            }

            // 上传图片
            var uploadImg = editor.uploadImg;
            uploadImg.uploadImg(files);
        });
    }
};

/*
    命令，封装 document.execCommand
*/

// 构造函数
function Command(editor) {
    this.editor = editor;
}

// 修改原型
Command.prototype = {
    constructor: Command,

    // 执行命令
    do: function _do(name, value) {
        var editor = this.editor;

        // 使用 styleWithCSS
        if (!editor._useStyleWithCSS) {
            document.execCommand('styleWithCSS', null, true);
            editor._useStyleWithCSS = true;
        }

        // 如果无选区，忽略
        if (!editor.selection.getRange()) {
            return;
        }

        // 恢复选取
        editor.selection.restoreSelection();

        // 执行
        var _name = '_' + name;
        if (this[_name]) {
            // 有自定义事件
            this[_name](value);
        } else {
            // 默认 command
            this._execCommand(name, value);
        }

        // 修改菜单状态
        editor.menus.changeActive();

        // 最后，恢复选取保证光标在原来的位置闪烁
        editor.selection.saveRange();
        editor.selection.restoreSelection();

        // 触发 onchange
        editor.change && editor.change();
    },

    // 自定义 insertHTML 事件
    _insertHTML: function _insertHTML(html) {
        var editor = this.editor;
        var range = editor.selection.getRange();

        if (this.queryCommandSupported('insertHTML')) {
            // W3C
            this._execCommand('insertHTML', html);
        } else if (range.insertNode) {
            // IE
            range.deleteContents();
            range.insertNode($(html)[0]);
        } else if (range.pasteHTML) {
            // IE <= 10
            range.pasteHTML(html);
        }
    },

    // 插入 elem
    _insertElem: function _insertElem($elem) {
        var editor = this.editor;
        var range = editor.selection.getRange();

        if (range.insertNode) {
            range.deleteContents();
            range.insertNode($elem[0]);
        }
    },

    // 封装 execCommand
    _execCommand: function _execCommand(name, value) {
        document.execCommand(name, false, value);
    },

    // 封装 document.queryCommandValue
    queryCommandValue: function queryCommandValue(name) {
        return document.queryCommandValue(name);
    },

    // 封装 document.queryCommandState
    queryCommandState: function queryCommandState(name) {
        return document.queryCommandState(name);
    },

    // 封装 document.queryCommandSupported
    queryCommandSupported: function queryCommandSupported(name) {
        return document.queryCommandSupported(name);
    }
};

/*
    selection range API
*/

// 构造函数
function API(editor) {
    this.editor = editor;
    this._currentRange = null;
}

// 修改原型
API.prototype = {
    constructor: API,

    // 获取 range 对象
    getRange: function getRange() {
        return this._currentRange;
    },

    // 保存选区
    saveRange: function saveRange(_range) {
        if (_range) {
            // 保存已有选区
            this._currentRange = _range;
            return;
        }

        // 获取当前的选区
        var selection = window.getSelection();
        if (selection.rangeCount === 0) {
            return;
        }
        var range = selection.getRangeAt(0);

        // 判断选区内容是否在编辑内容之内
        var $containerElem = this.getSelectionContainerElem(range);
        if (!$containerElem) {
            return;
        }

        // 判断选区内容是否在不可编辑区域之内
        if ($containerElem.attr('contenteditable') === 'false' || $containerElem.parentUntil('[contenteditable=false]')) {
            return;
        }

        var editor = this.editor;
        var $textElem = editor.$textElem;
        if ($textElem.isContain($containerElem)) {
            // 是编辑内容之内的
            this._currentRange = range;
        }
    },

    // 折叠选区
    collapseRange: function collapseRange(toStart) {
        if (toStart == null) {
            // 默认为 false
            toStart = false;
        }
        var range = this._currentRange;
        if (range) {
            range.collapse(toStart);
        }
    },

    // 选中区域的文字
    getSelectionText: function getSelectionText() {
        var range = this._currentRange;
        if (range) {
            return this._currentRange.toString();
        } else {
            return '';
        }
    },

    // 选区的 $Elem
    getSelectionContainerElem: function getSelectionContainerElem(range) {
        range = range || this._currentRange;
        var elem = void 0;
        if (range) {
            elem = range.commonAncestorContainer;
            return $(elem.nodeType === 1 ? elem : elem.parentNode);
        }
    },
    getSelectionStartElem: function getSelectionStartElem(range) {
        range = range || this._currentRange;
        var elem = void 0;
        if (range) {
            elem = range.startContainer;
            return $(elem.nodeType === 1 ? elem : elem.parentNode);
        }
    },
    getSelectionEndElem: function getSelectionEndElem(range) {
        range = range || this._currentRange;
        var elem = void 0;
        if (range) {
            elem = range.endContainer;
            return $(elem.nodeType === 1 ? elem : elem.parentNode);
        }
    },

    // 选区是否为空
    isSelectionEmpty: function isSelectionEmpty() {
        var range = this._currentRange;
        if (range && range.startContainer) {
            if (range.startContainer === range.endContainer) {
                if (range.startOffset === range.endOffset) {
                    return true;
                }
            }
        }
        return false;
    },

    // 恢复选区
    restoreSelection: function restoreSelection() {
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(this._currentRange);
    },

    // 创建一个空白（即 &#8203 字符）选区
    createEmptyRange: function createEmptyRange() {
        var editor = this.editor;
        var range = this.getRange();
        var $elem = void 0;

        if (!range) {
            // 当前无 range
            return;
        }
        if (!this.isSelectionEmpty()) {
            // 当前选区必须没有内容才可以
            return;
        }

        try {
            // 目前只支持 webkit 内核
            if (UA.isWebkit()) {
                // 插入 &#8203
                editor.cmd.do('insertHTML', '&#8203;');
                // 修改 offset 位置
                range.setEnd(range.endContainer, range.endOffset + 1);
                // 存储
                this.saveRange(range);
            } else {
                $elem = $('<strong>&#8203;</strong>');
                editor.cmd.do('insertElem', $elem);
                this.createRangeByElem($elem, true);
            }
        } catch (ex) {
            // 部分情况下会报错，兼容一下
        }
    },

    // 根据 $Elem 设置选区
    createRangeByElem: function createRangeByElem($elem, toStart, isContent) {
        // $elem - 经过封装的 elem
        // toStart - true 开始位置，false 结束位置
        // isContent - 是否选中Elem的内容
        if (!$elem.length) {
            return;
        }

        var elem = $elem[0];
        var range = document.createRange();

        if (isContent) {
            range.selectNodeContents(elem);
        } else {
            range.selectNode(elem);
        }

        if (typeof toStart === 'boolean') {
            range.collapse(toStart);
        }

        // 存储 range
        this.saveRange(range);
    }
};

/*
    上传进度条
*/

function Progress(editor) {
    this.editor = editor;
    this._time = 0;
    this._isShow = false;
    this._isRender = false;
    this._timeoutId = 0;
    this.$textContainer = editor.$textContainerElem;
    this.$bar = $('<div class="w-e-progress"></div>');
}

Progress.prototype = {
    constructor: Progress,

    show: function show(progress) {
        var _this = this;

        // 状态处理
        if (this._isShow) {
            return;
        }
        this._isShow = true;

        // 渲染
        var $bar = this.$bar;
        if (!this._isRender) {
            var $textContainer = this.$textContainer;
            $textContainer.append($bar);
        } else {
            this._isRender = true;
        }

        // 改变进度（节流，100ms 渲染一次）
        if (Date.now() - this._time > 100) {
            if (progress <= 1) {
                $bar.css('width', progress * 100 + '%');
                this._time = Date.now();
            }
        }

        // 隐藏
        var timeoutId = this._timeoutId;
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(function () {
            _this._hide();
        }, 500);
    },

    _hide: function _hide() {
        var $bar = this.$bar;
        $bar.remove();

        // 修改状态
        this._time = 0;
        this._isShow = false;
        this._isRender = false;
    }
};

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

/*
    上传图片
*/

// 构造函数
function UploadImg(editor) {
    this.editor = editor;
}

// 原型
UploadImg.prototype = {
    constructor: UploadImg,

    // 根据 debug 弹出不同的信息
    _alert: function _alert(alertInfo, debugInfo) {
        var editor = this.editor;
        var debug = editor.config.debug;
        var customAlert = editor.config.customAlert;

        if (debug) {
            throw new Error('wangEditor: ' + (debugInfo || alertInfo));
        } else {
            if (customAlert && typeof customAlert === 'function') {
                customAlert(alertInfo);
            } else {
                alert(alertInfo);
            }
        }
    },

    // 根据链接插入图片
    insertLinkImg: function insertLinkImg(link) {
        var _this2 = this;

        if (!link) {
            return;
        }
        var editor = this.editor;
        var config = editor.config;

        // 校验格式
        var linkImgCheck = config.linkImgCheck;
        var checkResult = void 0;
        if (linkImgCheck && typeof linkImgCheck === 'function') {
            checkResult = linkImgCheck(link);
            if (typeof checkResult === 'string') {
                // 校验失败，提示信息
                alert(checkResult);
                return;
            }
        }

        editor.cmd.do('insertHTML', '<div class="img"><img src="' + link + '" style="max-width:100%;"/></div>');

        // 验证图片 url 是否有效，无效的话给出提示
        var img = document.createElement('img');
        img.onload = function () {
            var callback = config.linkImgCallback;
            if (callback && typeof callback === 'function') {
                callback(link);
            }

            img = null;
        };
        img.onerror = function () {
            img = null;
            // 无法成功下载图片
            _this2._alert('插入图片错误', 'wangEditor: \u63D2\u5165\u56FE\u7247\u51FA\u9519\uFF0C\u56FE\u7247\u94FE\u63A5\u662F "' + link + '"\uFF0C\u4E0B\u8F7D\u8BE5\u94FE\u63A5\u5931\u8D25');
            return;
        };
        img.onabort = function () {
            img = null;
        };
        img.src = link;
    },

    // 上传图片
    uploadImg: function uploadImg(files) {
        var _this3 = this;

        if (!files || !files.length) {
            return;
        }

        // ------------------------------ 获取配置信息 ------------------------------
        var editor = this.editor;
        var config = editor.config;
        var uploadImgServer = config.uploadImgServer;
        var uploadImgShowBase64 = config.uploadImgShowBase64;

        var maxSize = config.uploadImgMaxSize;
        var maxSizeM = maxSize / 1024 / 1024;
        var maxLength = config.uploadImgMaxLength || 10000;
        var uploadFileName = config.uploadFileName || '';
        var uploadImgParams = config.uploadImgParams || {};
        var uploadImgParamsWithUrl = config.uploadImgParamsWithUrl;
        var uploadImgHeaders = config.uploadImgHeaders || {};
        var hooks = config.uploadImgHooks || {};
        var timeout = config.uploadImgTimeout || 3000;
        var withCredentials = config.withCredentials;
        if (withCredentials == null) {
            withCredentials = false;
        }
        var customUploadImg = config.customUploadImg;

        if (!customUploadImg) {
            // 没有 customUploadImg 的情况下，需要如下两个配置才能继续进行图片上传
            if (!uploadImgServer && !uploadImgShowBase64) {
                return;
            }
        }

        // ------------------------------ 验证文件信息 ------------------------------
        var resultFiles = [];
        var errInfo = [];
        arrForEach(files, function (file) {
            var name = file.name;
            var size = file.size;

            // chrome 低版本 name === undefined
            if (!name || !size) {
                return;
            }

            if (/\.(jpg|jpeg|png|bmp|gif|webp)$/i.test(name) === false) {
                // 后缀名不合法，不是图片
                errInfo.push('\u3010' + name + '\u3011\u4E0D\u662F\u56FE\u7247');
                return;
            }
            if (maxSize < size) {
                // 上传图片过大
                errInfo.push('\u3010' + name + '\u3011\u5927\u4E8E ' + maxSizeM + 'M');
                return;
            }

            // 验证通过的加入结果列表
            resultFiles.push(file);
        });
        // 抛出验证信息
        if (errInfo.length) {
            this._alert('图片验证未通过: \n' + errInfo.join('\n'));
            return;
        }
        if (resultFiles.length > maxLength) {
            this._alert('一次最多上传' + maxLength + '张图片');
            return;
        }

        // ------------------------------ 自定义上传 ------------------------------
        if (customUploadImg && typeof customUploadImg === 'function') {
            customUploadImg(resultFiles, this.insertLinkImg.bind(this));

            // 阻止以下代码执行
            return;
        }

        // 添加图片数据
        var formdata = new FormData();
        arrForEach(resultFiles, function (file) {
            var name = uploadFileName || file.name;
            formdata.append(name, file);
        });

        // ------------------------------ 上传图片 ------------------------------
        if (uploadImgServer && typeof uploadImgServer === 'string') {
            // 添加参数
            var uploadImgServerArr = uploadImgServer.split('#');
            uploadImgServer = uploadImgServerArr[0];
            var uploadImgServerHash = uploadImgServerArr[1] || '';
            objForEach(uploadImgParams, function (key, val) {
                // 因使用者反应，自定义参数不能默认 encode ，由 v3.1.1 版本开始注释掉
                // val = encodeURIComponent(val)

                // 第一，将参数拼接到 url 中
                if (uploadImgParamsWithUrl) {
                    if (uploadImgServer.indexOf('?') > 0) {
                        uploadImgServer += '&';
                    } else {
                        uploadImgServer += '?';
                    }
                    uploadImgServer = uploadImgServer + key + '=' + val;
                }

                // 第二，将参数添加到 formdata 中
                formdata.append(key, val);
            });
            if (uploadImgServerHash) {
                uploadImgServer += '#' + uploadImgServerHash;
            }

            // 定义 xhr
            var xhr = new XMLHttpRequest();
            xhr.open('POST', uploadImgServer);

            // 设置超时
            xhr.timeout = timeout;
            xhr.ontimeout = function () {
                // hook - timeout
                if (hooks.timeout && typeof hooks.timeout === 'function') {
                    hooks.timeout(xhr, editor);
                }

                _this3._alert('上传图片超时');
            };

            // 监控 progress
            if (xhr.upload) {
                xhr.upload.onprogress = function (e) {
                    var percent = void 0;
                    // 进度条
                    var progressBar = new Progress(editor);
                    if (e.lengthComputable) {
                        percent = e.loaded / e.total;
                        progressBar.show(percent);
                    }
                };
            }

            // 返回数据
            xhr.onreadystatechange = function () {
                var result = void 0;
                if (xhr.readyState === 4) {
                    if (xhr.status < 200 || xhr.status >= 300) {
                        // hook - error
                        if (hooks.error && typeof hooks.error === 'function') {
                            hooks.error(xhr, editor);
                        }

                        // xhr 返回状态错误
                        _this3._alert('上传图片发生错误', '\u4E0A\u4F20\u56FE\u7247\u53D1\u751F\u9519\u8BEF\uFF0C\u670D\u52A1\u5668\u8FD4\u56DE\u72B6\u6001\u662F ' + xhr.status);
                        return;
                    }

                    result = xhr.responseText;
                    if ((typeof result === 'undefined' ? 'undefined' : _typeof(result)) !== 'object') {
                        try {
                            result = JSON.parse(result);
                        } catch (ex) {
                            // hook - fail
                            if (hooks.fail && typeof hooks.fail === 'function') {
                                hooks.fail(xhr, editor, result);
                            }

                            _this3._alert('上传图片失败', '上传图片返回结果错误，返回结果是: ' + result);
                            return;
                        }
                    }
                    if (!hooks.customInsert && result.errno != '0') {
                        // hook - fail
                        if (hooks.fail && typeof hooks.fail === 'function') {
                            hooks.fail(xhr, editor, result);
                        }

                        // 数据错误
                        _this3._alert('上传图片失败', '上传图片返回结果错误，返回结果 errno=' + result.errno);
                    } else {
                        if (hooks.customInsert && typeof hooks.customInsert === 'function') {
                            // 使用者自定义插入方法
                            hooks.customInsert(_this3.insertLinkImg.bind(_this3), result, editor);
                        } else {
                            // 将图片插入编辑器
                            var data = result.data || [];
                            data.forEach(function (link) {
                                _this3.insertLinkImg(link);
                            });
                        }

                        // hook - success
                        if (hooks.success && typeof hooks.success === 'function') {
                            hooks.success(xhr, editor, result);
                        }
                    }
                }
            };

            // hook - before
            if (hooks.before && typeof hooks.before === 'function') {
                var beforeResult = hooks.before(xhr, editor, resultFiles);
                if (beforeResult && (typeof beforeResult === 'undefined' ? 'undefined' : _typeof(beforeResult)) === 'object') {
                    if (beforeResult.prevent) {
                        // 如果返回的结果是 {prevent: true, msg: 'xxxx'} 则表示用户放弃上传
                        this._alert(beforeResult.msg);
                        return;
                    }
                }
            }

            // 自定义 headers
            objForEach(uploadImgHeaders, function (key, val) {
                xhr.setRequestHeader(key, val);
            });

            // 跨域传 cookie
            xhr.withCredentials = withCredentials;

            // 发送请求
            xhr.send(formdata);

            // 注意，要 return 。不去操作接下来的 base64 显示方式
            return;
        }

        // ------------------------------ 显示 base64 格式 ------------------------------
        if (uploadImgShowBase64) {
            arrForEach(files, function (file) {
                var _this = _this3;
                var reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = function () {
                    _this.insertLinkImg(this.result);
                };
            });
        }
    }
};

function codemirror() {
    var userAgent = navigator.userAgent;
    var platform = navigator.platform;

    var gecko = /gecko\/\d/i.test(userAgent);
    var ie_upto10 = /MSIE \d/.test(userAgent);
    var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(userAgent);
    var edge = /Edge\/(\d+)/.exec(userAgent);
    var ie = ie_upto10 || ie_11up || edge;
    var ie_version = ie && (ie_upto10 ? document.documentMode || 6 : +(edge || ie_11up)[1]);
    var webkit = !edge && /WebKit\//.test(userAgent);
    var qtwebkit = webkit && /Qt\/\d+\.\d+/.test(userAgent);
    var chrome = !edge && /Chrome\//.test(userAgent);
    var presto = /Opera\//.test(userAgent);
    var safari = /Apple Computer/.test(navigator.vendor);
    var mac_geMountainLion = /Mac OS X 1\d\D([8-9]|\d\d)\D/.test(userAgent);
    var phantom = /PhantomJS/.test(userAgent);

    var ios = !edge && /AppleWebKit/.test(userAgent) && /Mobile\/\w+/.test(userAgent);
    var android = /Android/.test(userAgent);
    // This is woefully incomplete. Suggestions for alternative methods welcome.
    var mobile = ios || android || /webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(userAgent);
    var mac = ios || /Mac/.test(platform);
    var chromeOS = /\bCrOS\b/.test(userAgent);
    var windows = /win/i.test(platform);

    var presto_version = presto && userAgent.match(/Version\/(\d*\.\d*)/);
    if (presto_version) {
        presto_version = Number(presto_version[1]);
    }
    if (presto_version && presto_version >= 15) {
        presto = false;webkit = true;
    }
    // Some browsers use the wrong event properties to signal cmd/ctrl on OS X
    var flipCtrlCmd = mac && (qtwebkit || presto && (presto_version == null || presto_version < 12.11));
    var captureRightClick = gecko || ie && ie_version >= 9;

    function classTest(cls) {
        return new RegExp("(^|\\s)" + cls + "(?:$|\\s)\\s*");
    }

    var rmClass = function rmClass(node, cls) {
        var current = node.className;
        var match = classTest(cls).exec(current);
        if (match) {
            var after = current.slice(match.index + match[0].length);
            node.className = current.slice(0, match.index) + (after ? match[1] + after : "");
        }
    };

    function removeChildren(e) {
        for (var count = e.childNodes.length; count > 0; --count) {
            e.removeChild(e.firstChild);
        }
        return e;
    }

    function removeChildrenAndAdd(parent, e) {
        return removeChildren(parent).appendChild(e);
    }

    function elt(tag, content, className, style) {
        var e = document.createElement(tag);
        if (className) {
            e.className = className;
        }
        if (style) {
            e.style.cssText = style;
        }
        if (typeof content == "string") {
            e.appendChild(document.createTextNode(content));
        } else if (content) {
            for (var i = 0; i < content.length; ++i) {
                e.appendChild(content[i]);
            }
        }
        return e;
    }
    // wrapper for elt, which removes the elt from the accessibility tree
    function eltP(tag, content, className, style) {
        var e = elt(tag, content, className, style);
        e.setAttribute("role", "presentation");
        return e;
    }

    var range;
    if (document.createRange) {
        range = function range(node, start, end, endNode) {
            var r = document.createRange();
            r.setEnd(endNode || node, end);
            r.setStart(node, start);
            return r;
        };
    } else {
        range = function range(node, start, end) {
            var r = document.body.createTextRange();
            try {
                r.moveToElementText(node.parentNode);
            } catch (e) {
                return r;
            }
            r.collapse(true);
            r.moveEnd("character", end);
            r.moveStart("character", start);
            return r;
        };
    }

    function contains(parent, child) {
        if (child.nodeType == 3) // Android browser always returns false when child is a textnode
            {
                child = child.parentNode;
            }
        if (parent.contains) {
            return parent.contains(child);
        }
        do {
            if (child.nodeType == 11) {
                child = child.host;
            }
            if (child == parent) {
                return true;
            }
        } while (child = child.parentNode);
    }

    function activeElt() {
        // IE and Edge may throw an "Unspecified Error" when accessing document.activeElement.
        // IE < 10 will throw when accessed while the page is loading or in an iframe.
        // IE > 9 and Edge will throw when accessed in an iframe if document.body is unavailable.
        var activeElement;
        try {
            activeElement = document.activeElement;
        } catch (e) {
            activeElement = document.body || null;
        }
        while (activeElement && activeElement.shadowRoot && activeElement.shadowRoot.activeElement) {
            activeElement = activeElement.shadowRoot.activeElement;
        }
        return activeElement;
    }

    function addClass(node, cls) {
        var current = node.className;
        if (!classTest(cls).test(current)) {
            node.className += (current ? " " : "") + cls;
        }
    }
    function joinClasses(a, b) {
        var as = a.split(" ");
        for (var i = 0; i < as.length; i++) {
            if (as[i] && !classTest(as[i]).test(b)) {
                b += " " + as[i];
            }
        }
        return b;
    }

    var selectInput = function selectInput(node) {
        node.select();
    };
    if (ios) // Mobile Safari apparently has a bug where select() is broken.
        {
            selectInput = function selectInput(node) {
                node.selectionStart = 0;node.selectionEnd = node.value.length;
            };
        } else if (ie) // Suppress mysterious IE10 errors
        {
            selectInput = function selectInput(node) {
                try {
                    node.select();
                } catch (_e) {}
            };
        }

    function bind(f) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return f.apply(null, args);
        };
    }

    function copyObj(obj, target, overwrite) {
        if (!target) {
            target = {};
        }
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop) && (overwrite !== false || !target.hasOwnProperty(prop))) {
                target[prop] = obj[prop];
            }
        }
        return target;
    }

    // Counts the column offset in a string, taking tabs into account.
    // Used mostly to find indentation.
    function countColumn(string, end, tabSize, startIndex, startValue) {
        if (end == null) {
            end = string.search(/[^\s\u00a0]/);
            if (end == -1) {
                end = string.length;
            }
        }
        for (var i = startIndex || 0, n = startValue || 0;;) {
            var nextTab = string.indexOf("\t", i);
            if (nextTab < 0 || nextTab >= end) {
                return n + (end - i);
            }
            n += nextTab - i;
            n += tabSize - n % tabSize;
            i = nextTab + 1;
        }
    }

    var Delayed = function Delayed() {
        this.id = null;
        this.f = null;
        this.time = 0;
        this.handler = bind(this.onTimeout, this);
    };
    Delayed.prototype.onTimeout = function (self) {
        self.id = 0;
        if (self.time <= +new Date()) {
            self.f();
        } else {
            setTimeout(self.handler, self.time - +new Date());
        }
    };
    Delayed.prototype.set = function (ms, f) {
        this.f = f;
        var time = +new Date() + ms;
        if (!this.id || time < this.time) {
            clearTimeout(this.id);
            this.id = setTimeout(this.handler, ms);
            this.time = time;
        }
    };

    function indexOf(array, elt) {
        for (var i = 0; i < array.length; ++i) {
            if (array[i] == elt) {
                return i;
            }
        }
        return -1;
    }

    // Number of pixels added to scroller and sizer to hide scrollbar
    var scrollerGap = 30;

    // Returned or thrown by various protocols to signal 'I'm not
    // handling this'.
    var Pass = { toString: function toString() {
            return "CodeMirror.Pass";
        } };

    // Reused option objects for setSelection & friends
    var sel_dontScroll = { scroll: false },
        sel_mouse = { origin: "*mouse" },
        sel_move = { origin: "+move" };

    // The inverse of countColumn -- find the offset that corresponds to
    // a particular column.
    function findColumn(string, goal, tabSize) {
        for (var pos = 0, col = 0;;) {
            var nextTab = string.indexOf("\t", pos);
            if (nextTab == -1) {
                nextTab = string.length;
            }
            var skipped = nextTab - pos;
            if (nextTab == string.length || col + skipped >= goal) {
                return pos + Math.min(skipped, goal - col);
            }
            col += nextTab - pos;
            col += tabSize - col % tabSize;
            pos = nextTab + 1;
            if (col >= goal) {
                return pos;
            }
        }
    }

    var spaceStrs = [""];
    function spaceStr(n) {
        while (spaceStrs.length <= n) {
            spaceStrs.push(lst(spaceStrs) + " ");
        }
        return spaceStrs[n];
    }

    function lst(arr) {
        return arr[arr.length - 1];
    }

    function map(array, f) {
        var out = [];
        for (var i = 0; i < array.length; i++) {
            out[i] = f(array[i], i);
        }
        return out;
    }

    function insertSorted(array, value, score) {
        var pos = 0,
            priority = score(value);
        while (pos < array.length && score(array[pos]) <= priority) {
            pos++;
        }
        array.splice(pos, 0, value);
    }

    function nothing() {}

    function createObj(base, props) {
        var inst;
        if (Object.create) {
            inst = Object.create(base);
        } else {
            nothing.prototype = base;
            inst = new nothing();
        }
        if (props) {
            copyObj(props, inst);
        }
        return inst;
    }

    var nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;
    function isWordCharBasic(ch) {
        return (/\w/.test(ch) || ch > "\x80" && (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch))
        );
    }
    function isWordChar(ch, helper) {
        if (!helper) {
            return isWordCharBasic(ch);
        }
        if (helper.source.indexOf("\\w") > -1 && isWordCharBasic(ch)) {
            return true;
        }
        return helper.test(ch);
    }

    function isEmpty(obj) {
        for (var n in obj) {
            if (obj.hasOwnProperty(n) && obj[n]) {
                return false;
            }
        }
        return true;
    }

    // Extending unicode characters. A series of a non-extending char +
    // any number of extending chars is treated as a single unit as far
    // as editing and measuring is concerned. This is not fully correct,
    // since some scripts/fonts/browsers also treat other configurations
    // of code points as a group.
    var extendingChars = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u065e\u0670\u06d6-\u06dc\u06de-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u07a6-\u07b0\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0900-\u0902\u093c\u0941-\u0948\u094d\u0951-\u0955\u0962\u0963\u0981\u09bc\u09be\u09c1-\u09c4\u09cd\u09d7\u09e2\u09e3\u0a01\u0a02\u0a3c\u0a41\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a70\u0a71\u0a75\u0a81\u0a82\u0abc\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3\u0b01\u0b3c\u0b3e\u0b3f\u0b41-\u0b44\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b82\u0bbe\u0bc0\u0bcd\u0bd7\u0c3e-\u0c40\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0cbc\u0cbf\u0cc2\u0cc6\u0ccc\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0d3e\u0d41-\u0d44\u0d4d\u0d57\u0d62\u0d63\u0dca\u0dcf\u0dd2-\u0dd4\u0dd6\u0ddf\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0f18\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f7e\u0f80-\u0f84\u0f86\u0f87\u0f90-\u0f97\u0f99-\u0fbc\u0fc6\u102d-\u1030\u1032-\u1037\u1039\u103a\u103d\u103e\u1058\u1059\u105e-\u1060\u1071-\u1074\u1082\u1085\u1086\u108d\u109d\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b7-\u17bd\u17c6\u17c9-\u17d3\u17dd\u180b-\u180d\u18a9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193b\u1a17\u1a18\u1a56\u1a58-\u1a5e\u1a60\u1a62\u1a65-\u1a6c\u1a73-\u1a7c\u1a7f\u1b00-\u1b03\u1b34\u1b36-\u1b3a\u1b3c\u1b42\u1b6b-\u1b73\u1b80\u1b81\u1ba2-\u1ba5\u1ba8\u1ba9\u1c2c-\u1c33\u1c36\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce0\u1ce2-\u1ce8\u1ced\u1dc0-\u1de6\u1dfd-\u1dff\u200c\u200d\u20d0-\u20f0\u2cef-\u2cf1\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua66f-\ua672\ua67c\ua67d\ua6f0\ua6f1\ua802\ua806\ua80b\ua825\ua826\ua8c4\ua8e0-\ua8f1\ua926-\ua92d\ua947-\ua951\ua980-\ua982\ua9b3\ua9b6-\ua9b9\ua9bc\uaa29-\uaa2e\uaa31\uaa32\uaa35\uaa36\uaa43\uaa4c\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uabe5\uabe8\uabed\udc00-\udfff\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\uff9e\uff9f]/;
    function isExtendingChar(ch) {
        return ch.charCodeAt(0) >= 768 && extendingChars.test(ch);
    }

    // Returns a number from the range [`0`; `str.length`] unless `pos` is outside that range.
    function skipExtendingChars(str, pos, dir) {
        while ((dir < 0 ? pos > 0 : pos < str.length) && isExtendingChar(str.charAt(pos))) {
            pos += dir;
        }
        return pos;
    }

    // Returns the value from the range [`from`; `to`] that satisfies
    // `pred` and is closest to `from`. Assumes that at least `to`
    // satisfies `pred`. Supports `from` being greater than `to`.
    function findFirst(pred, from, to) {
        // At any point we are certain `to` satisfies `pred`, don't know
        // whether `from` does.
        var dir = from > to ? -1 : 1;
        for (;;) {
            if (from == to) {
                return from;
            }
            var midF = (from + to) / 2,
                mid = dir < 0 ? Math.ceil(midF) : Math.floor(midF);
            if (mid == from) {
                return pred(mid) ? from : to;
            }
            if (pred(mid)) {
                to = mid;
            } else {
                from = mid + dir;
            }
        }
    }

    // BIDI HELPERS

    function iterateBidiSections(order, from, to, f) {
        if (!order) {
            return f(from, to, "ltr", 0);
        }
        var found = false;
        for (var i = 0; i < order.length; ++i) {
            var part = order[i];
            if (part.from < to && part.to > from || from == to && part.to == from) {
                f(Math.max(part.from, from), Math.min(part.to, to), part.level == 1 ? "rtl" : "ltr", i);
                found = true;
            }
        }
        if (!found) {
            f(from, to, "ltr");
        }
    }

    var bidiOther = null;
    function getBidiPartAt(order, ch, sticky) {
        var found;
        bidiOther = null;
        for (var i = 0; i < order.length; ++i) {
            var cur = order[i];
            if (cur.from < ch && cur.to > ch) {
                return i;
            }
            if (cur.to == ch) {
                if (cur.from != cur.to && sticky == "before") {
                    found = i;
                } else {
                    bidiOther = i;
                }
            }
            if (cur.from == ch) {
                if (cur.from != cur.to && sticky != "before") {
                    found = i;
                } else {
                    bidiOther = i;
                }
            }
        }
        return found != null ? found : bidiOther;
    }

    // Bidirectional ordering algorithm
    // See http://unicode.org/reports/tr9/tr9-13.html for the algorithm
    // that this (partially) implements.

    // One-char codes used for character types:
    // L (L):   Left-to-Right
    // R (R):   Right-to-Left
    // r (AL):  Right-to-Left Arabic
    // 1 (EN):  European Number
    // + (ES):  European Number Separator
    // % (ET):  European Number Terminator
    // n (AN):  Arabic Number
    // , (CS):  Common Number Separator
    // m (NSM): Non-Spacing Mark
    // b (BN):  Boundary Neutral
    // s (B):   Paragraph Separator
    // t (S):   Segment Separator
    // w (WS):  Whitespace
    // N (ON):  Other Neutrals

    // Returns null if characters are ordered as they appear
    // (left-to-right), or an array of sections ({from, to, level}
    // objects) in the order in which they occur visually.
    var bidiOrdering = function () {
        // Character types for codepoints 0 to 0xff
        var lowTypes = "bbbbbbbbbtstwsbbbbbbbbbbbbbbssstwNN%%%NNNNNN,N,N1111111111NNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNbbbbbbsbbbbbbbbbbbbbbbbbbbbbbbbbb,N%%%%NNNNLNNNNN%%11NLNNN1LNNNNNLLLLLLLLLLLLLLLLLLLLLLLNLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLN";
        // Character types for codepoints 0x600 to 0x6f9
        var arabicTypes = "nnnnnnNNr%%r,rNNmmmmmmmmmmmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmmmmmmmmnnnnnnnnnn%nnrrrmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmnNmmmmmmrrmmNmmmmrr1111111111";
        function charType(code) {
            if (code <= 0xf7) {
                return lowTypes.charAt(code);
            } else if (0x590 <= code && code <= 0x5f4) {
                return "R";
            } else if (0x600 <= code && code <= 0x6f9) {
                return arabicTypes.charAt(code - 0x600);
            } else if (0x6ee <= code && code <= 0x8ac) {
                return "r";
            } else if (0x2000 <= code && code <= 0x200b) {
                return "w";
            } else if (code == 0x200c) {
                return "b";
            } else {
                return "L";
            }
        }

        var bidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
        var isNeutral = /[stwN]/,
            isStrong = /[LRr]/,
            countsAsLeft = /[Lb1n]/,
            countsAsNum = /[1n]/;

        function BidiSpan(level, from, to) {
            this.level = level;
            this.from = from;this.to = to;
        }

        return function (str, direction) {
            var outerType = direction == "ltr" ? "L" : "R";

            if (str.length == 0 || direction == "ltr" && !bidiRE.test(str)) {
                return false;
            }
            var len = str.length,
                types = [];
            for (var i = 0; i < len; ++i) {
                types.push(charType(str.charCodeAt(i)));
            }

            // W1. Examine each non-spacing mark (NSM) in the level run, and
            // change the type of the NSM to the type of the previous
            // character. If the NSM is at the start of the level run, it will
            // get the type of sor.
            for (var i$1 = 0, prev = outerType; i$1 < len; ++i$1) {
                var type = types[i$1];
                if (type == "m") {
                    types[i$1] = prev;
                } else {
                    prev = type;
                }
            }

            // W2. Search backwards from each instance of a European number
            // until the first strong type (R, L, AL, or sor) is found. If an
            // AL is found, change the type of the European number to Arabic
            // number.
            // W3. Change all ALs to R.
            for (var i$2 = 0, cur = outerType; i$2 < len; ++i$2) {
                var type$1 = types[i$2];
                if (type$1 == "1" && cur == "r") {
                    types[i$2] = "n";
                } else if (isStrong.test(type$1)) {
                    cur = type$1;if (type$1 == "r") {
                        types[i$2] = "R";
                    }
                }
            }

            // W4. A single European separator between two European numbers
            // changes to a European number. A single common separator between
            // two numbers of the same type changes to that type.
            for (var i$3 = 1, prev$1 = types[0]; i$3 < len - 1; ++i$3) {
                var type$2 = types[i$3];
                if (type$2 == "+" && prev$1 == "1" && types[i$3 + 1] == "1") {
                    types[i$3] = "1";
                } else if (type$2 == "," && prev$1 == types[i$3 + 1] && (prev$1 == "1" || prev$1 == "n")) {
                    types[i$3] = prev$1;
                }
                prev$1 = type$2;
            }

            // W5. A sequence of European terminators adjacent to European
            // numbers changes to all European numbers.
            // W6. Otherwise, separators and terminators change to Other
            // Neutral.
            for (var i$4 = 0; i$4 < len; ++i$4) {
                var type$3 = types[i$4];
                if (type$3 == ",") {
                    types[i$4] = "N";
                } else if (type$3 == "%") {
                    var end = void 0;
                    for (end = i$4 + 1; end < len && types[end] == "%"; ++end) {}
                    var replace = i$4 && types[i$4 - 1] == "!" || end < len && types[end] == "1" ? "1" : "N";
                    for (var j = i$4; j < end; ++j) {
                        types[j] = replace;
                    }
                    i$4 = end - 1;
                }
            }

            // W7. Search backwards from each instance of a European number
            // until the first strong type (R, L, or sor) is found. If an L is
            // found, then change the type of the European number to L.
            for (var i$5 = 0, cur$1 = outerType; i$5 < len; ++i$5) {
                var type$4 = types[i$5];
                if (cur$1 == "L" && type$4 == "1") {
                    types[i$5] = "L";
                } else if (isStrong.test(type$4)) {
                    cur$1 = type$4;
                }
            }

            // N1. A sequence of neutrals takes the direction of the
            // surrounding strong text if the text on both sides has the same
            // direction. European and Arabic numbers act as if they were R in
            // terms of their influence on neutrals. Start-of-level-run (sor)
            // and end-of-level-run (eor) are used at level run boundaries.
            // N2. Any remaining neutrals take the embedding direction.
            for (var i$6 = 0; i$6 < len; ++i$6) {
                if (isNeutral.test(types[i$6])) {
                    var end$1 = void 0;
                    for (end$1 = i$6 + 1; end$1 < len && isNeutral.test(types[end$1]); ++end$1) {}
                    var before = (i$6 ? types[i$6 - 1] : outerType) == "L";
                    var after = (end$1 < len ? types[end$1] : outerType) == "L";
                    var replace$1 = before == after ? before ? "L" : "R" : outerType;
                    for (var j$1 = i$6; j$1 < end$1; ++j$1) {
                        types[j$1] = replace$1;
                    }
                    i$6 = end$1 - 1;
                }
            }

            // Here we depart from the documented algorithm, in order to avoid
            // building up an actual levels array. Since there are only three
            // levels (0, 1, 2) in an implementation that doesn't take
            // explicit embedding into account, we can build up the order on
            // the fly, without following the level-based algorithm.
            var order = [],
                m;
            for (var i$7 = 0; i$7 < len;) {
                if (countsAsLeft.test(types[i$7])) {
                    var start = i$7;
                    for (++i$7; i$7 < len && countsAsLeft.test(types[i$7]); ++i$7) {}
                    order.push(new BidiSpan(0, start, i$7));
                } else {
                    var pos = i$7,
                        at = order.length;
                    for (++i$7; i$7 < len && types[i$7] != "L"; ++i$7) {}
                    for (var j$2 = pos; j$2 < i$7;) {
                        if (countsAsNum.test(types[j$2])) {
                            if (pos < j$2) {
                                order.splice(at, 0, new BidiSpan(1, pos, j$2));
                            }
                            var nstart = j$2;
                            for (++j$2; j$2 < i$7 && countsAsNum.test(types[j$2]); ++j$2) {}
                            order.splice(at, 0, new BidiSpan(2, nstart, j$2));
                            pos = j$2;
                        } else {
                            ++j$2;
                        }
                    }
                    if (pos < i$7) {
                        order.splice(at, 0, new BidiSpan(1, pos, i$7));
                    }
                }
            }
            if (direction == "ltr") {
                if (order[0].level == 1 && (m = str.match(/^\s+/))) {
                    order[0].from = m[0].length;
                    order.unshift(new BidiSpan(0, 0, m[0].length));
                }
                if (lst(order).level == 1 && (m = str.match(/\s+$/))) {
                    lst(order).to -= m[0].length;
                    order.push(new BidiSpan(0, len - m[0].length, len));
                }
            }

            return direction == "rtl" ? order.reverse() : order;
        };
    }();

    // Get the bidi ordering for the given line (and cache it). Returns
    // false for lines that are fully left-to-right, and an array of
    // BidiSpan objects otherwise.
    function getOrder(line, direction) {
        var order = line.order;
        if (order == null) {
            order = line.order = bidiOrdering(line.text, direction);
        }
        return order;
    }

    // EVENT HANDLING

    // Lightweight event framework. on/off also work on DOM nodes,
    // registering native DOM handlers.

    var noHandlers = [];

    var on = function on(emitter, type, f) {
        if (emitter.addEventListener) {
            emitter.addEventListener(type, f, false);
        } else if (emitter.attachEvent) {
            emitter.attachEvent("on" + type, f);
        } else {
            var map = emitter._handlers || (emitter._handlers = {});
            map[type] = (map[type] || noHandlers).concat(f);
        }
    };

    function getHandlers(emitter, type) {
        return emitter._handlers && emitter._handlers[type] || noHandlers;
    }

    function off(emitter, type, f) {
        if (emitter.removeEventListener) {
            emitter.removeEventListener(type, f, false);
        } else if (emitter.detachEvent) {
            emitter.detachEvent("on" + type, f);
        } else {
            var map = emitter._handlers,
                arr = map && map[type];
            if (arr) {
                var index = indexOf(arr, f);
                if (index > -1) {
                    map[type] = arr.slice(0, index).concat(arr.slice(index + 1));
                }
            }
        }
    }

    function signal(emitter, type /*, values...*/) {
        var handlers = getHandlers(emitter, type);
        if (!handlers.length) {
            return;
        }
        var args = Array.prototype.slice.call(arguments, 2);
        for (var i = 0; i < handlers.length; ++i) {
            handlers[i].apply(null, args);
        }
    }

    // The DOM events that CodeMirror handles can be overridden by
    // registering a (non-DOM) handler on the editor for the event name,
    // and preventDefault-ing the event in that handler.
    function signalDOMEvent(cm, e, override) {
        if (typeof e == "string") {
            e = { type: e, preventDefault: function preventDefault() {
                    this.defaultPrevented = true;
                } };
        }
        signal(cm, override || e.type, cm, e);
        return e_defaultPrevented(e) || e.codemirrorIgnore;
    }

    function signalCursorActivity(cm) {
        var arr = cm._handlers && cm._handlers.cursorActivity;
        if (!arr) {
            return;
        }
        var set$$1 = cm.curOp.cursorActivityHandlers || (cm.curOp.cursorActivityHandlers = []);
        for (var i = 0; i < arr.length; ++i) {
            if (indexOf(set$$1, arr[i]) == -1) {
                set$$1.push(arr[i]);
            }
        }
    }

    function hasHandler(emitter, type) {
        return getHandlers(emitter, type).length > 0;
    }

    // Add on and off methods to a constructor's prototype, to make
    // registering events on such objects more convenient.
    function eventMixin(ctor) {
        ctor.prototype.on = function (type, f) {
            on(this, type, f);
        };
        ctor.prototype.off = function (type, f) {
            off(this, type, f);
        };
    }

    // Due to the fact that we still support jurassic IE versions, some
    // compatibility wrappers are needed.

    function e_preventDefault(e) {
        if (e.preventDefault) {
            e.preventDefault();
        } else {
            e.returnValue = false;
        }
    }
    function e_stopPropagation(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        } else {
            e.cancelBubble = true;
        }
    }
    function e_defaultPrevented(e) {
        return e.defaultPrevented != null ? e.defaultPrevented : e.returnValue == false;
    }
    function e_stop(e) {
        e_preventDefault(e);e_stopPropagation(e);
    }

    function e_target(e) {
        return e.target || e.srcElement;
    }
    function e_button(e) {
        var b = e.which;
        if (b == null) {
            if (e.button & 1) {
                b = 1;
            } else if (e.button & 2) {
                b = 3;
            } else if (e.button & 4) {
                b = 2;
            }
        }
        if (mac && e.ctrlKey && b == 1) {
            b = 3;
        }
        return b;
    }

    // Detect drag-and-drop
    var dragAndDrop = function () {
        // There is *some* kind of drag-and-drop support in IE6-8, but I
        // couldn't get it to work yet.
        if (ie && ie_version < 9) {
            return false;
        }
        var div = elt('div');
        return "draggable" in div || "dragDrop" in div;
    }();

    var zwspSupported;
    function zeroWidthElement(measure) {
        if (zwspSupported == null) {
            var test = elt("span", "\u200B");
            removeChildrenAndAdd(measure, elt("span", [test, document.createTextNode("x")]));
            if (measure.firstChild.offsetHeight != 0) {
                zwspSupported = test.offsetWidth <= 1 && test.offsetHeight > 2 && !(ie && ie_version < 8);
            }
        }
        var node = zwspSupported ? elt("span", "\u200B") : elt("span", "\xA0", null, "display: inline-block; width: 1px; margin-right: -1px");
        node.setAttribute("cm-text", "");
        return node;
    }

    // Feature-detect IE's crummy client rect reporting for bidi text
    var badBidiRects;
    function hasBadBidiRects(measure) {
        if (badBidiRects != null) {
            return badBidiRects;
        }
        var txt = removeChildrenAndAdd(measure, document.createTextNode("A\u062EA"));
        var r0 = range(txt, 0, 1).getBoundingClientRect();
        var r1 = range(txt, 1, 2).getBoundingClientRect();
        removeChildren(measure);
        if (!r0 || r0.left == r0.right) {
            return false;
        } // Safari returns null in some cases (#2780)
        return badBidiRects = r1.right - r0.right < 3;
    }

    // See if "".split is the broken IE version, if so, provide an
    // alternative way to split lines.
    var splitLinesAuto = "\n\nb".split(/\n/).length != 3 ? function (string) {
        var pos = 0,
            result = [],
            l = string.length;
        while (pos <= l) {
            var nl = string.indexOf("\n", pos);
            if (nl == -1) {
                nl = string.length;
            }
            var line = string.slice(pos, string.charAt(nl - 1) == "\r" ? nl - 1 : nl);
            var rt = line.indexOf("\r");
            if (rt != -1) {
                result.push(line.slice(0, rt));
                pos += rt + 1;
            } else {
                result.push(line);
                pos = nl + 1;
            }
        }
        return result;
    } : function (string) {
        return string.split(/\r\n?|\n/);
    };

    var hasSelection = window.getSelection ? function (te) {
        try {
            return te.selectionStart != te.selectionEnd;
        } catch (e) {
            return false;
        }
    } : function (te) {
        var range;
        try {
            range = te.ownerDocument.selection.createRange();
        } catch (e) {}
        if (!range || range.parentElement() != te) {
            return false;
        }
        return range.compareEndPoints("StartToEnd", range) != 0;
    };

    var hasCopyEvent = function () {
        var e = elt("div");
        if ("oncopy" in e) {
            return true;
        }
        e.setAttribute("oncopy", "return;");
        return typeof e.oncopy == "function";
    }();

    var badZoomedRects = null;
    function hasBadZoomedRects(measure) {
        if (badZoomedRects != null) {
            return badZoomedRects;
        }
        var node = removeChildrenAndAdd(measure, elt("span", "x"));
        var normal = node.getBoundingClientRect();
        var fromRange = range(node, 0, 1).getBoundingClientRect();
        return badZoomedRects = Math.abs(normal.left - fromRange.left) > 1;
    }

    // Known modes, by name and by MIME
    var modes = {},
        mimeModes = {};

    // Extra arguments are stored as the mode's dependencies, which is
    // used by (legacy) mechanisms like loadmode.js to automatically
    // load a mode. (Preferred mechanism is the require/define calls.)
    function defineMode(name, mode) {
        if (arguments.length > 2) {
            mode.dependencies = Array.prototype.slice.call(arguments, 2);
        }
        modes[name] = mode;
    }

    function defineMIME(mime, spec) {
        mimeModes[mime] = spec;
    }

    // Given a MIME type, a {name, ...options} config object, or a name
    // string, return a mode config object.
    function resolveMode(spec) {
        if (typeof spec == "string" && mimeModes.hasOwnProperty(spec)) {
            spec = mimeModes[spec];
        } else if (spec && typeof spec.name == "string" && mimeModes.hasOwnProperty(spec.name)) {
            var found = mimeModes[spec.name];
            if (typeof found == "string") {
                found = { name: found };
            }
            spec = createObj(found, spec);
            spec.name = found.name;
        } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+xml$/.test(spec)) {
            return resolveMode("application/xml");
        } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+json$/.test(spec)) {
            return resolveMode("application/json");
        }
        if (typeof spec == "string") {
            return { name: spec };
        } else {
            return spec || { name: "null" };
        }
    }

    // Given a mode spec (anything that resolveMode accepts), find and
    // initialize an actual mode object.
    function getMode(options, spec) {
        spec = resolveMode(spec);
        var mfactory = modes[spec.name];
        if (!mfactory) {
            return getMode(options, "text/plain");
        }
        var modeObj = mfactory(options, spec);
        if (modeExtensions.hasOwnProperty(spec.name)) {
            var exts = modeExtensions[spec.name];
            for (var prop in exts) {
                if (!exts.hasOwnProperty(prop)) {
                    continue;
                }
                if (modeObj.hasOwnProperty(prop)) {
                    modeObj["_" + prop] = modeObj[prop];
                }
                modeObj[prop] = exts[prop];
            }
        }
        modeObj.name = spec.name;
        if (spec.helperType) {
            modeObj.helperType = spec.helperType;
        }
        if (spec.modeProps) {
            for (var prop$1 in spec.modeProps) {
                modeObj[prop$1] = spec.modeProps[prop$1];
            }
        }

        return modeObj;
    }

    // This can be used to attach properties to mode objects from
    // outside the actual mode definition.
    var modeExtensions = {};
    function extendMode(mode, properties) {
        var exts = modeExtensions.hasOwnProperty(mode) ? modeExtensions[mode] : modeExtensions[mode] = {};
        copyObj(properties, exts);
    }

    function copyState(mode, state) {
        if (state === true) {
            return state;
        }
        if (mode.copyState) {
            return mode.copyState(state);
        }
        var nstate = {};
        for (var n in state) {
            var val = state[n];
            if (val instanceof Array) {
                val = val.concat([]);
            }
            nstate[n] = val;
        }
        return nstate;
    }

    // Given a mode and a state (for that mode), find the inner mode and
    // state at the position that the state refers to.
    function innerMode(mode, state) {
        var info;
        while (mode.innerMode) {
            info = mode.innerMode(state);
            if (!info || info.mode == mode) {
                break;
            }
            state = info.state;
            mode = info.mode;
        }
        return info || { mode: mode, state: state };
    }

    function startState(mode, a1, a2) {
        return mode.startState ? mode.startState(a1, a2) : true;
    }

    // STRING STREAM

    // Fed to the mode parsers, provides helper functions to make
    // parsers more succinct.

    var StringStream = function StringStream(string, tabSize, lineOracle) {
        this.pos = this.start = 0;
        this.string = string;
        this.tabSize = tabSize || 8;
        this.lastColumnPos = this.lastColumnValue = 0;
        this.lineStart = 0;
        this.lineOracle = lineOracle;
    };

    StringStream.prototype.eol = function () {
        return this.pos >= this.string.length;
    };
    StringStream.prototype.sol = function () {
        return this.pos == this.lineStart;
    };
    StringStream.prototype.peek = function () {
        return this.string.charAt(this.pos) || undefined;
    };
    StringStream.prototype.next = function () {
        if (this.pos < this.string.length) {
            return this.string.charAt(this.pos++);
        }
    };
    StringStream.prototype.eat = function (match) {
        var ch = this.string.charAt(this.pos);
        var ok;
        if (typeof match == "string") {
            ok = ch == match;
        } else {
            ok = ch && (match.test ? match.test(ch) : match(ch));
        }
        if (ok) {
            ++this.pos;return ch;
        }
    };
    StringStream.prototype.eatWhile = function (match) {
        var start = this.pos;
        while (this.eat(match)) {}
        return this.pos > start;
    };
    StringStream.prototype.eatSpace = function () {
        var start = this.pos;
        while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) {
            ++this.pos;
        }
        return this.pos > start;
    };
    StringStream.prototype.skipToEnd = function () {
        this.pos = this.string.length;
    };
    StringStream.prototype.skipTo = function (ch) {
        var found = this.string.indexOf(ch, this.pos);
        if (found > -1) {
            this.pos = found;return true;
        }
    };
    StringStream.prototype.backUp = function (n) {
        this.pos -= n;
    };
    StringStream.prototype.column = function () {
        if (this.lastColumnPos < this.start) {
            this.lastColumnValue = countColumn(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue);
            this.lastColumnPos = this.start;
        }
        return this.lastColumnValue - (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0);
    };
    StringStream.prototype.indentation = function () {
        return countColumn(this.string, null, this.tabSize) - (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0);
    };
    StringStream.prototype.match = function (pattern, consume, caseInsensitive) {
        if (typeof pattern == "string") {
            var cased = function cased(str) {
                return caseInsensitive ? str.toLowerCase() : str;
            };
            var substr = this.string.substr(this.pos, pattern.length);
            if (cased(substr) == cased(pattern)) {
                if (consume !== false) {
                    this.pos += pattern.length;
                }
                return true;
            }
        } else {
            var match = this.string.slice(this.pos).match(pattern);
            if (match && match.index > 0) {
                return null;
            }
            if (match && consume !== false) {
                this.pos += match[0].length;
            }
            return match;
        }
    };
    StringStream.prototype.current = function () {
        return this.string.slice(this.start, this.pos);
    };
    StringStream.prototype.hideFirstChars = function (n, inner) {
        this.lineStart += n;
        try {
            return inner();
        } finally {
            this.lineStart -= n;
        }
    };
    StringStream.prototype.lookAhead = function (n) {
        var oracle = this.lineOracle;
        return oracle && oracle.lookAhead(n);
    };
    StringStream.prototype.baseToken = function () {
        var oracle = this.lineOracle;
        return oracle && oracle.baseToken(this.pos);
    };

    // Find the line object corresponding to the given line number.
    function getLine(doc, n) {
        n -= doc.first;
        if (n < 0 || n >= doc.size) {
            throw new Error("There is no line " + (n + doc.first) + " in the document.");
        }
        var chunk = doc;
        while (!chunk.lines) {
            for (var i = 0;; ++i) {
                var child = chunk.children[i],
                    sz = child.chunkSize();
                if (n < sz) {
                    chunk = child;break;
                }
                n -= sz;
            }
        }
        return chunk.lines[n];
    }

    // Get the part of a document between two positions, as an array of
    // strings.
    function getBetween(doc, start, end) {
        var out = [],
            n = start.line;
        doc.iter(start.line, end.line + 1, function (line) {
            var text = line.text;
            if (n == end.line) {
                text = text.slice(0, end.ch);
            }
            if (n == start.line) {
                text = text.slice(start.ch);
            }
            out.push(text);
            ++n;
        });
        return out;
    }
    // Get the lines between from and to, as array of strings.
    function getLines(doc, from, to) {
        var out = [];
        doc.iter(from, to, function (line) {
            out.push(line.text);
        }); // iter aborts when callback returns truthy value
        return out;
    }

    // Update the height of a line, propagating the height change
    // upwards to parent nodes.
    function updateLineHeight(line, height) {
        var diff = height - line.height;
        if (diff) {
            for (var n = line; n; n = n.parent) {
                n.height += diff;
            }
        }
    }

    // Given a line object, find its line number by walking up through
    // its parent links.
    function lineNo(line) {
        if (line.parent == null) {
            return null;
        }
        var cur = line.parent,
            no = indexOf(cur.lines, line);
        for (var chunk = cur.parent; chunk; cur = chunk, chunk = chunk.parent) {
            for (var i = 0;; ++i) {
                if (chunk.children[i] == cur) {
                    break;
                }
                no += chunk.children[i].chunkSize();
            }
        }
        return no + cur.first;
    }

    // Find the line at the given vertical position, using the height
    // information in the document tree.
    function _lineAtHeight(chunk, h) {
        var n = chunk.first;
        outer: do {
            for (var i$1 = 0; i$1 < chunk.children.length; ++i$1) {
                var child = chunk.children[i$1],
                    ch = child.height;
                if (h < ch) {
                    chunk = child;continue outer;
                }
                h -= ch;
                n += child.chunkSize();
            }
            return n;
        } while (!chunk.lines);
        var i = 0;
        for (; i < chunk.lines.length; ++i) {
            var line = chunk.lines[i],
                lh = line.height;
            if (h < lh) {
                break;
            }
            h -= lh;
        }
        return n + i;
    }

    function isLine(doc, l) {
        return l >= doc.first && l < doc.first + doc.size;
    }

    function lineNumberFor(options, i) {
        return String(options.lineNumberFormatter(i + options.firstLineNumber));
    }

    // A Pos instance represents a position within the text.
    function Pos(line, ch, sticky) {
        if (sticky === void 0) sticky = null;

        if (!(this instanceof Pos)) {
            return new Pos(line, ch, sticky);
        }
        this.line = line;
        this.ch = ch;
        this.sticky = sticky;
    }

    // Compare two positions, return 0 if they are the same, a negative
    // number when a is less, and a positive number otherwise.
    function cmp(a, b) {
        return a.line - b.line || a.ch - b.ch;
    }

    function equalCursorPos(a, b) {
        return a.sticky == b.sticky && cmp(a, b) == 0;
    }

    function copyPos(x) {
        return Pos(x.line, x.ch);
    }
    function maxPos(a, b) {
        return cmp(a, b) < 0 ? b : a;
    }
    function minPos(a, b) {
        return cmp(a, b) < 0 ? a : b;
    }

    // Most of the external API clips given positions to make sure they
    // actually exist within the document.
    function clipLine(doc, n) {
        return Math.max(doc.first, Math.min(n, doc.first + doc.size - 1));
    }
    function _clipPos(doc, pos) {
        if (pos.line < doc.first) {
            return Pos(doc.first, 0);
        }
        var last = doc.first + doc.size - 1;
        if (pos.line > last) {
            return Pos(last, getLine(doc, last).text.length);
        }
        return clipToLen(pos, getLine(doc, pos.line).text.length);
    }
    function clipToLen(pos, linelen) {
        var ch = pos.ch;
        if (ch == null || ch > linelen) {
            return Pos(pos.line, linelen);
        } else if (ch < 0) {
            return Pos(pos.line, 0);
        } else {
            return pos;
        }
    }
    function clipPosArray(doc, array) {
        var out = [];
        for (var i = 0; i < array.length; i++) {
            out[i] = _clipPos(doc, array[i]);
        }
        return out;
    }

    var SavedContext = function SavedContext(state, lookAhead) {
        this.state = state;
        this.lookAhead = lookAhead;
    };

    var Context = function Context(doc, state, line, lookAhead) {
        this.state = state;
        this.doc = doc;
        this.line = line;
        this.maxLookAhead = lookAhead || 0;
        this.baseTokens = null;
        this.baseTokenPos = 1;
    };

    Context.prototype.lookAhead = function (n) {
        var line = this.doc.getLine(this.line + n);
        if (line != null && n > this.maxLookAhead) {
            this.maxLookAhead = n;
        }
        return line;
    };

    Context.prototype.baseToken = function (n) {
        if (!this.baseTokens) {
            return null;
        }
        while (this.baseTokens[this.baseTokenPos] <= n) {
            this.baseTokenPos += 2;
        }
        var type = this.baseTokens[this.baseTokenPos + 1];
        return { type: type && type.replace(/( |^)overlay .*/, ""),
            size: this.baseTokens[this.baseTokenPos] - n };
    };

    Context.prototype.nextLine = function () {
        this.line++;
        if (this.maxLookAhead > 0) {
            this.maxLookAhead--;
        }
    };

    Context.fromSaved = function (doc, saved, line) {
        if (saved instanceof SavedContext) {
            return new Context(doc, copyState(doc.mode, saved.state), line, saved.lookAhead);
        } else {
            return new Context(doc, copyState(doc.mode, saved), line);
        }
    };

    Context.prototype.save = function (copy) {
        var state = copy !== false ? copyState(this.doc.mode, this.state) : this.state;
        return this.maxLookAhead > 0 ? new SavedContext(state, this.maxLookAhead) : state;
    };

    // Compute a style array (an array starting with a mode generation
    // -- for invalidation -- followed by pairs of end positions and
    // style strings), which is used to highlight the tokens on the
    // line.
    function highlightLine(cm, line, context, forceToEnd) {
        // A styles array always starts with a number identifying the
        // mode/overlays that it is based on (for easy invalidation).
        var st = [cm.state.modeGen],
            lineClasses = {};
        // Compute the base array of styles
        runMode(cm, line.text, cm.doc.mode, context, function (end, style) {
            return st.push(end, style);
        }, lineClasses, forceToEnd);
        var state = context.state;

        // Run overlays, adjust style array.
        var loop = function loop(o) {
            context.baseTokens = st;
            var overlay = cm.state.overlays[o],
                i = 1,
                at = 0;
            context.state = true;
            runMode(cm, line.text, overlay.mode, context, function (end, style) {
                var start = i;
                // Ensure there's a token end at the current position, and that i points at it
                while (at < end) {
                    var i_end = st[i];
                    if (i_end > end) {
                        st.splice(i, 1, end, st[i + 1], i_end);
                    }
                    i += 2;
                    at = Math.min(end, i_end);
                }
                if (!style) {
                    return;
                }
                if (overlay.opaque) {
                    st.splice(start, i - start, end, "overlay " + style);
                    i = start + 2;
                } else {
                    for (; start < i; start += 2) {
                        var cur = st[start + 1];
                        st[start + 1] = (cur ? cur + " " : "") + "overlay " + style;
                    }
                }
            }, lineClasses);
            context.state = state;
            context.baseTokens = null;
            context.baseTokenPos = 1;
        };

        for (var o = 0; o < cm.state.overlays.length; ++o) {
            loop(o);
        }return { styles: st, classes: lineClasses.bgClass || lineClasses.textClass ? lineClasses : null };
    }

    function getLineStyles(cm, line, updateFrontier) {
        if (!line.styles || line.styles[0] != cm.state.modeGen) {
            var context = getContextBefore(cm, lineNo(line));
            var resetState = line.text.length > cm.options.maxHighlightLength && copyState(cm.doc.mode, context.state);
            var result = highlightLine(cm, line, context);
            if (resetState) {
                context.state = resetState;
            }
            line.stateAfter = context.save(!resetState);
            line.styles = result.styles;
            if (result.classes) {
                line.styleClasses = result.classes;
            } else if (line.styleClasses) {
                line.styleClasses = null;
            }
            if (updateFrontier === cm.doc.highlightFrontier) {
                cm.doc.modeFrontier = Math.max(cm.doc.modeFrontier, ++cm.doc.highlightFrontier);
            }
        }
        return line.styles;
    }

    function getContextBefore(cm, n, precise) {
        var doc = cm.doc,
            display = cm.display;
        if (!doc.mode.startState) {
            return new Context(doc, true, n);
        }
        var start = findStartLine(cm, n, precise);
        var saved = start > doc.first && getLine(doc, start - 1).stateAfter;
        var context = saved ? Context.fromSaved(doc, saved, start) : new Context(doc, startState(doc.mode), start);

        doc.iter(start, n, function (line) {
            processLine(cm, line.text, context);
            var pos = context.line;
            line.stateAfter = pos == n - 1 || pos % 5 == 0 || pos >= display.viewFrom && pos < display.viewTo ? context.save() : null;
            context.nextLine();
        });
        if (precise) {
            doc.modeFrontier = context.line;
        }
        return context;
    }

    // Lightweight form of highlight -- proceed over this line and
    // update state, but don't save a style array. Used for lines that
    // aren't currently visible.
    function processLine(cm, text, context, startAt) {
        var mode = cm.doc.mode;
        var stream = new StringStream(text, cm.options.tabSize, context);
        stream.start = stream.pos = startAt || 0;
        if (text == "") {
            callBlankLine(mode, context.state);
        }
        while (!stream.eol()) {
            readToken(mode, stream, context.state);
            stream.start = stream.pos;
        }
    }

    function callBlankLine(mode, state) {
        if (mode.blankLine) {
            return mode.blankLine(state);
        }
        if (!mode.innerMode) {
            return;
        }
        var inner = innerMode(mode, state);
        if (inner.mode.blankLine) {
            return inner.mode.blankLine(inner.state);
        }
    }

    function readToken(mode, stream, state, inner) {
        for (var i = 0; i < 10; i++) {
            if (inner) {
                inner[0] = innerMode(mode, state).mode;
            }
            var style = mode.token(stream, state);
            if (stream.pos > stream.start) {
                return style;
            }
        }
        throw new Error("Mode " + mode.name + " failed to advance stream.");
    }

    var Token = function Token(stream, type, state) {
        this.start = stream.start;this.end = stream.pos;
        this.string = stream.current();
        this.type = type || null;
        this.state = state;
    };

    // Utility for getTokenAt and getLineTokens
    function takeToken(cm, pos, precise, asArray) {
        var doc = cm.doc,
            mode = doc.mode,
            style;
        pos = _clipPos(doc, pos);
        var line = getLine(doc, pos.line),
            context = getContextBefore(cm, pos.line, precise);
        var stream = new StringStream(line.text, cm.options.tabSize, context),
            tokens;
        if (asArray) {
            tokens = [];
        }
        while ((asArray || stream.pos < pos.ch) && !stream.eol()) {
            stream.start = stream.pos;
            style = readToken(mode, stream, context.state);
            if (asArray) {
                tokens.push(new Token(stream, style, copyState(doc.mode, context.state)));
            }
        }
        return asArray ? tokens : new Token(stream, style, context.state);
    }

    function extractLineClasses(type, output) {
        if (type) {
            for (;;) {
                var lineClass = type.match(/(?:^|\s+)line-(background-)?(\S+)/);
                if (!lineClass) {
                    break;
                }
                type = type.slice(0, lineClass.index) + type.slice(lineClass.index + lineClass[0].length);
                var prop = lineClass[1] ? "bgClass" : "textClass";
                if (output[prop] == null) {
                    output[prop] = lineClass[2];
                } else if (!new RegExp("(?:^|\s)" + lineClass[2] + "(?:$|\s)").test(output[prop])) {
                    output[prop] += " " + lineClass[2];
                }
            }
        }
        return type;
    }

    // Run the given mode's parser over a line, calling f for each token.
    function runMode(cm, text, mode, context, f, lineClasses, forceToEnd) {
        var flattenSpans = mode.flattenSpans;
        if (flattenSpans == null) {
            flattenSpans = cm.options.flattenSpans;
        }
        var curStart = 0,
            curStyle = null;
        var stream = new StringStream(text, cm.options.tabSize, context),
            style;
        var inner = cm.options.addModeClass && [null];
        if (text == "") {
            extractLineClasses(callBlankLine(mode, context.state), lineClasses);
        }
        while (!stream.eol()) {
            if (stream.pos > cm.options.maxHighlightLength) {
                flattenSpans = false;
                if (forceToEnd) {
                    processLine(cm, text, context, stream.pos);
                }
                stream.pos = text.length;
                style = null;
            } else {
                style = extractLineClasses(readToken(mode, stream, context.state, inner), lineClasses);
            }
            if (inner) {
                var mName = inner[0].name;
                if (mName) {
                    style = "m-" + (style ? mName + " " + style : mName);
                }
            }
            if (!flattenSpans || curStyle != style) {
                while (curStart < stream.start) {
                    curStart = Math.min(stream.start, curStart + 5000);
                    f(curStart, curStyle);
                }
                curStyle = style;
            }
            stream.start = stream.pos;
        }
        while (curStart < stream.pos) {
            // Webkit seems to refuse to render text nodes longer than 57444
            // characters, and returns inaccurate measurements in nodes
            // starting around 5000 chars.
            var pos = Math.min(stream.pos, curStart + 5000);
            f(pos, curStyle);
            curStart = pos;
        }
    }

    // Finds the line to start with when starting a parse. Tries to
    // find a line with a stateAfter, so that it can start with a
    // valid state. If that fails, it returns the line with the
    // smallest indentation, which tends to need the least context to
    // parse correctly.
    function findStartLine(cm, n, precise) {
        var minindent,
            minline,
            doc = cm.doc;
        var lim = precise ? -1 : n - (cm.doc.mode.innerMode ? 1000 : 100);
        for (var search = n; search > lim; --search) {
            if (search <= doc.first) {
                return doc.first;
            }
            var line = getLine(doc, search - 1),
                after = line.stateAfter;
            if (after && (!precise || search + (after instanceof SavedContext ? after.lookAhead : 0) <= doc.modeFrontier)) {
                return search;
            }
            var indented = countColumn(line.text, null, cm.options.tabSize);
            if (minline == null || minindent > indented) {
                minline = search - 1;
                minindent = indented;
            }
        }
        return minline;
    }

    function retreatFrontier(doc, n) {
        doc.modeFrontier = Math.min(doc.modeFrontier, n);
        if (doc.highlightFrontier < n - 10) {
            return;
        }
        var start = doc.first;
        for (var line = n - 1; line > start; line--) {
            var saved = getLine(doc, line).stateAfter;
            // change is on 3
            // state on line 1 looked ahead 2 -- so saw 3
            // test 1 + 2 < 3 should cover this
            if (saved && (!(saved instanceof SavedContext) || line + saved.lookAhead < n)) {
                start = line + 1;
                break;
            }
        }
        doc.highlightFrontier = Math.min(doc.highlightFrontier, start);
    }

    // Optimize some code when these features are not used.
    var sawReadOnlySpans = false,
        sawCollapsedSpans = false;

    function seeReadOnlySpans() {
        sawReadOnlySpans = true;
    }

    function seeCollapsedSpans() {
        sawCollapsedSpans = true;
    }

    // TEXTMARKER SPANS

    function MarkedSpan(marker, from, to) {
        this.marker = marker;
        this.from = from;this.to = to;
    }

    // Search an array of spans for a span matching the given marker.
    function getMarkedSpanFor(spans, marker) {
        if (spans) {
            for (var i = 0; i < spans.length; ++i) {
                var span = spans[i];
                if (span.marker == marker) {
                    return span;
                }
            }
        }
    }
    // Remove a span from an array, returning undefined if no spans are
    // left (we don't store arrays for lines without spans).
    function removeMarkedSpan(spans, span) {
        var r;
        for (var i = 0; i < spans.length; ++i) {
            if (spans[i] != span) {
                (r || (r = [])).push(spans[i]);
            }
        }
        return r;
    }
    // Add a span to a line.
    function addMarkedSpan(line, span) {
        line.markedSpans = line.markedSpans ? line.markedSpans.concat([span]) : [span];
        span.marker.attachLine(line);
    }

    // Used for the algorithm that adjusts markers for a change in the
    // document. These functions cut an array of spans at a given
    // character position, returning an array of remaining chunks (or
    // undefined if nothing remains).
    function markedSpansBefore(old, startCh, isInsert) {
        var nw;
        if (old) {
            for (var i = 0; i < old.length; ++i) {
                var span = old[i],
                    marker = span.marker;
                var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= startCh : span.from < startCh);
                if (startsBefore || span.from == startCh && marker.type == "bookmark" && (!isInsert || !span.marker.insertLeft)) {
                    var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= startCh : span.to > startCh);(nw || (nw = [])).push(new MarkedSpan(marker, span.from, endsAfter ? null : span.to));
                }
            }
        }
        return nw;
    }
    function markedSpansAfter(old, endCh, isInsert) {
        var nw;
        if (old) {
            for (var i = 0; i < old.length; ++i) {
                var span = old[i],
                    marker = span.marker;
                var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= endCh : span.to > endCh);
                if (endsAfter || span.from == endCh && marker.type == "bookmark" && (!isInsert || span.marker.insertLeft)) {
                    var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= endCh : span.from < endCh);(nw || (nw = [])).push(new MarkedSpan(marker, startsBefore ? null : span.from - endCh, span.to == null ? null : span.to - endCh));
                }
            }
        }
        return nw;
    }

    // Given a change object, compute the new set of marker spans that
    // cover the line in which the change took place. Removes spans
    // entirely within the change, reconnects spans belonging to the
    // same marker that appear on both sides of the change, and cuts off
    // spans partially within the change. Returns an array of span
    // arrays with one element for each line in (after) the change.
    function stretchSpansOverChange(doc, change) {
        if (change.full) {
            return null;
        }
        var oldFirst = isLine(doc, change.from.line) && getLine(doc, change.from.line).markedSpans;
        var oldLast = isLine(doc, change.to.line) && getLine(doc, change.to.line).markedSpans;
        if (!oldFirst && !oldLast) {
            return null;
        }

        var startCh = change.from.ch,
            endCh = change.to.ch,
            isInsert = cmp(change.from, change.to) == 0;
        // Get the spans that 'stick out' on both sides
        var first = markedSpansBefore(oldFirst, startCh, isInsert);
        var last = markedSpansAfter(oldLast, endCh, isInsert);

        // Next, merge those two ends
        var sameLine = change.text.length == 1,
            offset = lst(change.text).length + (sameLine ? startCh : 0);
        if (first) {
            // Fix up .to properties of first
            for (var i = 0; i < first.length; ++i) {
                var span = first[i];
                if (span.to == null) {
                    var found = getMarkedSpanFor(last, span.marker);
                    if (!found) {
                        span.to = startCh;
                    } else if (sameLine) {
                        span.to = found.to == null ? null : found.to + offset;
                    }
                }
            }
        }
        if (last) {
            // Fix up .from in last (or move them into first in case of sameLine)
            for (var i$1 = 0; i$1 < last.length; ++i$1) {
                var span$1 = last[i$1];
                if (span$1.to != null) {
                    span$1.to += offset;
                }
                if (span$1.from == null) {
                    var found$1 = getMarkedSpanFor(first, span$1.marker);
                    if (!found$1) {
                        span$1.from = offset;
                        if (sameLine) {
                            (first || (first = [])).push(span$1);
                        }
                    }
                } else {
                    span$1.from += offset;
                    if (sameLine) {
                        (first || (first = [])).push(span$1);
                    }
                }
            }
        }
        // Make sure we didn't create any zero-length spans
        if (first) {
            first = clearEmptySpans(first);
        }
        if (last && last != first) {
            last = clearEmptySpans(last);
        }

        var newMarkers = [first];
        if (!sameLine) {
            // Fill gap with whole-line-spans
            var gap = change.text.length - 2,
                gapMarkers;
            if (gap > 0 && first) {
                for (var i$2 = 0; i$2 < first.length; ++i$2) {
                    if (first[i$2].to == null) {
                        (gapMarkers || (gapMarkers = [])).push(new MarkedSpan(first[i$2].marker, null, null));
                    }
                }
            }
            for (var i$3 = 0; i$3 < gap; ++i$3) {
                newMarkers.push(gapMarkers);
            }
            newMarkers.push(last);
        }
        return newMarkers;
    }

    // Remove spans that are empty and don't have a clearWhenEmpty
    // option of false.
    function clearEmptySpans(spans) {
        for (var i = 0; i < spans.length; ++i) {
            var span = spans[i];
            if (span.from != null && span.from == span.to && span.marker.clearWhenEmpty !== false) {
                spans.splice(i--, 1);
            }
        }
        if (!spans.length) {
            return null;
        }
        return spans;
    }

    // Used to 'clip' out readOnly ranges when making a change.
    function removeReadOnlyRanges(doc, from, to) {
        var markers = null;
        doc.iter(from.line, to.line + 1, function (line) {
            if (line.markedSpans) {
                for (var i = 0; i < line.markedSpans.length; ++i) {
                    var mark = line.markedSpans[i].marker;
                    if (mark.readOnly && (!markers || indexOf(markers, mark) == -1)) {
                        (markers || (markers = [])).push(mark);
                    }
                }
            }
        });
        if (!markers) {
            return null;
        }
        var parts = [{ from: from, to: to }];
        for (var i = 0; i < markers.length; ++i) {
            var mk = markers[i],
                m = mk.find(0);
            for (var j = 0; j < parts.length; ++j) {
                var p = parts[j];
                if (cmp(p.to, m.from) < 0 || cmp(p.from, m.to) > 0) {
                    continue;
                }
                var newParts = [j, 1],
                    dfrom = cmp(p.from, m.from),
                    dto = cmp(p.to, m.to);
                if (dfrom < 0 || !mk.inclusiveLeft && !dfrom) {
                    newParts.push({ from: p.from, to: m.from });
                }
                if (dto > 0 || !mk.inclusiveRight && !dto) {
                    newParts.push({ from: m.to, to: p.to });
                }
                parts.splice.apply(parts, newParts);
                j += newParts.length - 3;
            }
        }
        return parts;
    }

    // Connect or disconnect spans from a line.
    function detachMarkedSpans(line) {
        var spans = line.markedSpans;
        if (!spans) {
            return;
        }
        for (var i = 0; i < spans.length; ++i) {
            spans[i].marker.detachLine(line);
        }
        line.markedSpans = null;
    }
    function attachMarkedSpans(line, spans) {
        if (!spans) {
            return;
        }
        for (var i = 0; i < spans.length; ++i) {
            spans[i].marker.attachLine(line);
        }
        line.markedSpans = spans;
    }

    // Helpers used when computing which overlapping collapsed span
    // counts as the larger one.
    function extraLeft(marker) {
        return marker.inclusiveLeft ? -1 : 0;
    }
    function extraRight(marker) {
        return marker.inclusiveRight ? 1 : 0;
    }

    // Returns a number indicating which of two overlapping collapsed
    // spans is larger (and thus includes the other). Falls back to
    // comparing ids when the spans cover exactly the same range.
    function compareCollapsedMarkers(a, b) {
        var lenDiff = a.lines.length - b.lines.length;
        if (lenDiff != 0) {
            return lenDiff;
        }
        var aPos = a.find(),
            bPos = b.find();
        var fromCmp = cmp(aPos.from, bPos.from) || extraLeft(a) - extraLeft(b);
        if (fromCmp) {
            return -fromCmp;
        }
        var toCmp = cmp(aPos.to, bPos.to) || extraRight(a) - extraRight(b);
        if (toCmp) {
            return toCmp;
        }
        return b.id - a.id;
    }

    // Find out whether a line ends or starts in a collapsed span. If
    // so, return the marker for that span.
    function collapsedSpanAtSide(line, start) {
        var sps = sawCollapsedSpans && line.markedSpans,
            found;
        if (sps) {
            for (var sp = void 0, i = 0; i < sps.length; ++i) {
                sp = sps[i];
                if (sp.marker.collapsed && (start ? sp.from : sp.to) == null && (!found || compareCollapsedMarkers(found, sp.marker) < 0)) {
                    found = sp.marker;
                }
            }
        }
        return found;
    }
    function collapsedSpanAtStart(line) {
        return collapsedSpanAtSide(line, true);
    }
    function collapsedSpanAtEnd(line) {
        return collapsedSpanAtSide(line, false);
    }

    function collapsedSpanAround(line, ch) {
        var sps = sawCollapsedSpans && line.markedSpans,
            found;
        if (sps) {
            for (var i = 0; i < sps.length; ++i) {
                var sp = sps[i];
                if (sp.marker.collapsed && (sp.from == null || sp.from < ch) && (sp.to == null || sp.to > ch) && (!found || compareCollapsedMarkers(found, sp.marker) < 0)) {
                    found = sp.marker;
                }
            }
        }
        return found;
    }

    // Test whether there exists a collapsed span that partially
    // overlaps (covers the start or end, but not both) of a new span.
    // Such overlap is not allowed.
    function conflictingCollapsedRange(doc, lineNo, from, to, marker) {
        var line = getLine(doc, lineNo);
        var sps = sawCollapsedSpans && line.markedSpans;
        if (sps) {
            for (var i = 0; i < sps.length; ++i) {
                var sp = sps[i];
                if (!sp.marker.collapsed) {
                    continue;
                }
                var found = sp.marker.find(0);
                var fromCmp = cmp(found.from, from) || extraLeft(sp.marker) - extraLeft(marker);
                var toCmp = cmp(found.to, to) || extraRight(sp.marker) - extraRight(marker);
                if (fromCmp >= 0 && toCmp <= 0 || fromCmp <= 0 && toCmp >= 0) {
                    continue;
                }
                if (fromCmp <= 0 && (sp.marker.inclusiveRight && marker.inclusiveLeft ? cmp(found.to, from) >= 0 : cmp(found.to, from) > 0) || fromCmp >= 0 && (sp.marker.inclusiveRight && marker.inclusiveLeft ? cmp(found.from, to) <= 0 : cmp(found.from, to) < 0)) {
                    return true;
                }
            }
        }
    }

    // A visual line is a line as drawn on the screen. Folding, for
    // example, can cause multiple logical lines to appear on the same
    // visual line. This finds the start of the visual line that the
    // given line is part of (usually that is the line itself).
    function visualLine(line) {
        var merged;
        while (merged = collapsedSpanAtStart(line)) {
            line = merged.find(-1, true).line;
        }
        return line;
    }

    function visualLineEnd(line) {
        var merged;
        while (merged = collapsedSpanAtEnd(line)) {
            line = merged.find(1, true).line;
        }
        return line;
    }

    // Returns an array of logical lines that continue the visual line
    // started by the argument, or undefined if there are no such lines.
    function visualLineContinued(line) {
        var merged, lines;
        while (merged = collapsedSpanAtEnd(line)) {
            line = merged.find(1, true).line;(lines || (lines = [])).push(line);
        }
        return lines;
    }

    // Get the line number of the start of the visual line that the
    // given line number is part of.
    function visualLineNo(doc, lineN) {
        var line = getLine(doc, lineN),
            vis = visualLine(line);
        if (line == vis) {
            return lineN;
        }
        return lineNo(vis);
    }

    // Get the line number of the start of the next visual line after
    // the given line.
    function visualLineEndNo(doc, lineN) {
        if (lineN > doc.lastLine()) {
            return lineN;
        }
        var line = getLine(doc, lineN),
            merged;
        if (!lineIsHidden(doc, line)) {
            return lineN;
        }
        while (merged = collapsedSpanAtEnd(line)) {
            line = merged.find(1, true).line;
        }
        return lineNo(line) + 1;
    }

    // Compute whether a line is hidden. Lines count as hidden when they
    // are part of a visual line that starts with another line, or when
    // they are entirely covered by collapsed, non-widget span.
    function lineIsHidden(doc, line) {
        var sps = sawCollapsedSpans && line.markedSpans;
        if (sps) {
            for (var sp = void 0, i = 0; i < sps.length; ++i) {
                sp = sps[i];
                if (!sp.marker.collapsed) {
                    continue;
                }
                if (sp.from == null) {
                    return true;
                }
                if (sp.marker.widgetNode) {
                    continue;
                }
                if (sp.from == 0 && sp.marker.inclusiveLeft && lineIsHiddenInner(doc, line, sp)) {
                    return true;
                }
            }
        }
    }
    function lineIsHiddenInner(doc, line, span) {
        if (span.to == null) {
            var end = span.marker.find(1, true);
            return lineIsHiddenInner(doc, end.line, getMarkedSpanFor(end.line.markedSpans, span.marker));
        }
        if (span.marker.inclusiveRight && span.to == line.text.length) {
            return true;
        }
        for (var sp = void 0, i = 0; i < line.markedSpans.length; ++i) {
            sp = line.markedSpans[i];
            if (sp.marker.collapsed && !sp.marker.widgetNode && sp.from == span.to && (sp.to == null || sp.to != span.from) && (sp.marker.inclusiveLeft || span.marker.inclusiveRight) && lineIsHiddenInner(doc, line, sp)) {
                return true;
            }
        }
    }

    // Find the height above the given line.
    function _heightAtLine(lineObj) {
        lineObj = visualLine(lineObj);

        var h = 0,
            chunk = lineObj.parent;
        for (var i = 0; i < chunk.lines.length; ++i) {
            var line = chunk.lines[i];
            if (line == lineObj) {
                break;
            } else {
                h += line.height;
            }
        }
        for (var p = chunk.parent; p; chunk = p, p = chunk.parent) {
            for (var i$1 = 0; i$1 < p.children.length; ++i$1) {
                var cur = p.children[i$1];
                if (cur == chunk) {
                    break;
                } else {
                    h += cur.height;
                }
            }
        }
        return h;
    }

    // Compute the character length of a line, taking into account
    // collapsed ranges (see markText) that might hide parts, and join
    // other lines onto it.
    function lineLength(line) {
        if (line.height == 0) {
            return 0;
        }
        var len = line.text.length,
            merged,
            cur = line;
        while (merged = collapsedSpanAtStart(cur)) {
            var found = merged.find(0, true);
            cur = found.from.line;
            len += found.from.ch - found.to.ch;
        }
        cur = line;
        while (merged = collapsedSpanAtEnd(cur)) {
            var found$1 = merged.find(0, true);
            len -= cur.text.length - found$1.from.ch;
            cur = found$1.to.line;
            len += cur.text.length - found$1.to.ch;
        }
        return len;
    }

    // Find the longest line in the document.
    function findMaxLine(cm) {
        var d = cm.display,
            doc = cm.doc;
        d.maxLine = getLine(doc, doc.first);
        d.maxLineLength = lineLength(d.maxLine);
        d.maxLineChanged = true;
        doc.iter(function (line) {
            var len = lineLength(line);
            if (len > d.maxLineLength) {
                d.maxLineLength = len;
                d.maxLine = line;
            }
        });
    }

    // LINE DATA STRUCTURE

    // Line objects. These hold state related to a line, including
    // highlighting info (the styles array).
    var Line = function Line(text, markedSpans, estimateHeight) {
        this.text = text;
        attachMarkedSpans(this, markedSpans);
        this.height = estimateHeight ? estimateHeight(this) : 1;
    };

    Line.prototype.lineNo = function () {
        return lineNo(this);
    };
    eventMixin(Line);

    // Change the content (text, markers) of a line. Automatically
    // invalidates cached information and tries to re-estimate the
    // line's height.
    function updateLine(line, text, markedSpans, estimateHeight) {
        line.text = text;
        if (line.stateAfter) {
            line.stateAfter = null;
        }
        if (line.styles) {
            line.styles = null;
        }
        if (line.order != null) {
            line.order = null;
        }
        detachMarkedSpans(line);
        attachMarkedSpans(line, markedSpans);
        var estHeight = estimateHeight ? estimateHeight(line) : 1;
        if (estHeight != line.height) {
            updateLineHeight(line, estHeight);
        }
    }

    // Detach a line from the document tree and its markers.
    function cleanUpLine(line) {
        line.parent = null;
        detachMarkedSpans(line);
    }

    // Convert a style as returned by a mode (either null, or a string
    // containing one or more styles) to a CSS style. This is cached,
    // and also looks for line-wide styles.
    var styleToClassCache = {},
        styleToClassCacheWithMode = {};
    function interpretTokenStyle(style, options) {
        if (!style || /^\s*$/.test(style)) {
            return null;
        }
        var cache = options.addModeClass ? styleToClassCacheWithMode : styleToClassCache;
        return cache[style] || (cache[style] = style.replace(/\S+/g, "cm-$&"));
    }

    // Render the DOM representation of the text of a line. Also builds
    // up a 'line map', which points at the DOM nodes that represent
    // specific stretches of text, and is used by the measuring code.
    // The returned object contains the DOM node, this map, and
    // information about line-wide styles that were set by the mode.
    function buildLineContent(cm, lineView) {
        // The padding-right forces the element to have a 'border', which
        // is needed on Webkit to be able to get line-level bounding
        // rectangles for it (in measureChar).
        var content = eltP("span", null, null, webkit ? "padding-right: .1px" : null);
        var builder = { pre: eltP("pre", [content], "CodeMirror-line"), content: content,
            col: 0, pos: 0, cm: cm,
            trailingSpace: false,
            splitSpaces: cm.getOption("lineWrapping") };
        lineView.measure = {};

        // Iterate over the logical lines that make up this visual line.
        for (var i = 0; i <= (lineView.rest ? lineView.rest.length : 0); i++) {
            var line = i ? lineView.rest[i - 1] : lineView.line,
                order = void 0;
            builder.pos = 0;
            builder.addToken = buildToken;
            // Optionally wire in some hacks into the token-rendering
            // algorithm, to deal with browser quirks.
            if (hasBadBidiRects(cm.display.measure) && (order = getOrder(line, cm.doc.direction))) {
                builder.addToken = buildTokenBadBidi(builder.addToken, order);
            }
            builder.map = [];
            var allowFrontierUpdate = lineView != cm.display.externalMeasured && lineNo(line);
            insertLineContent(line, builder, getLineStyles(cm, line, allowFrontierUpdate));
            if (line.styleClasses) {
                if (line.styleClasses.bgClass) {
                    builder.bgClass = joinClasses(line.styleClasses.bgClass, builder.bgClass || "");
                }
                if (line.styleClasses.textClass) {
                    builder.textClass = joinClasses(line.styleClasses.textClass, builder.textClass || "");
                }
            }

            // Ensure at least a single node is present, for measuring.
            if (builder.map.length == 0) {
                builder.map.push(0, 0, builder.content.appendChild(zeroWidthElement(cm.display.measure)));
            }

            // Store the map and a cache object for the current logical line
            if (i == 0) {
                lineView.measure.map = builder.map;
                lineView.measure.cache = {};
            } else {
                (lineView.measure.maps || (lineView.measure.maps = [])).push(builder.map);(lineView.measure.caches || (lineView.measure.caches = [])).push({});
            }
        }

        // See issue #2901
        if (webkit) {
            var last = builder.content.lastChild;
            if (/\bcm-tab\b/.test(last.className) || last.querySelector && last.querySelector(".cm-tab")) {
                builder.content.className = "cm-tab-wrap-hack";
            }
        }

        signal(cm, "renderLine", cm, lineView.line, builder.pre);
        if (builder.pre.className) {
            builder.textClass = joinClasses(builder.pre.className, builder.textClass || "");
        }

        return builder;
    }

    function defaultSpecialCharPlaceholder(ch) {
        var token = elt("span", "\u2022", "cm-invalidchar");
        token.title = "\\u" + ch.charCodeAt(0).toString(16);
        token.setAttribute("aria-label", token.title);
        return token;
    }

    // Build up the DOM representation for a single token, and add it to
    // the line map. Takes care to render special characters separately.
    function buildToken(builder, text, style, startStyle, endStyle, css, attributes) {
        if (!text) {
            return;
        }
        var displayText = builder.splitSpaces ? splitSpaces(text, builder.trailingSpace) : text;
        var special = builder.cm.state.specialChars,
            mustWrap = false;
        var content;
        if (!special.test(text)) {
            builder.col += text.length;
            content = document.createTextNode(displayText);
            builder.map.push(builder.pos, builder.pos + text.length, content);
            if (ie && ie_version < 9) {
                mustWrap = true;
            }
            builder.pos += text.length;
        } else {
            content = document.createDocumentFragment();
            var pos = 0;
            while (true) {
                special.lastIndex = pos;
                var m = special.exec(text);
                var skipped = m ? m.index - pos : text.length - pos;
                if (skipped) {
                    var txt = document.createTextNode(displayText.slice(pos, pos + skipped));
                    if (ie && ie_version < 9) {
                        content.appendChild(elt("span", [txt]));
                    } else {
                        content.appendChild(txt);
                    }
                    builder.map.push(builder.pos, builder.pos + skipped, txt);
                    builder.col += skipped;
                    builder.pos += skipped;
                }
                if (!m) {
                    break;
                }
                pos += skipped + 1;
                var txt$1 = void 0;
                if (m[0] == "\t") {
                    var tabSize = builder.cm.options.tabSize,
                        tabWidth = tabSize - builder.col % tabSize;
                    txt$1 = content.appendChild(elt("span", spaceStr(tabWidth), "cm-tab"));
                    txt$1.setAttribute("role", "presentation");
                    txt$1.setAttribute("cm-text", "\t");
                    builder.col += tabWidth;
                } else if (m[0] == "\r" || m[0] == "\n") {
                    txt$1 = content.appendChild(elt("span", m[0] == "\r" ? "\u240D" : "\u2424", "cm-invalidchar"));
                    txt$1.setAttribute("cm-text", m[0]);
                    builder.col += 1;
                } else {
                    txt$1 = builder.cm.options.specialCharPlaceholder(m[0]);
                    txt$1.setAttribute("cm-text", m[0]);
                    if (ie && ie_version < 9) {
                        content.appendChild(elt("span", [txt$1]));
                    } else {
                        content.appendChild(txt$1);
                    }
                    builder.col += 1;
                }
                builder.map.push(builder.pos, builder.pos + 1, txt$1);
                builder.pos++;
            }
        }
        builder.trailingSpace = displayText.charCodeAt(text.length - 1) == 32;
        if (style || startStyle || endStyle || mustWrap || css) {
            var fullStyle = style || "";
            if (startStyle) {
                fullStyle += startStyle;
            }
            if (endStyle) {
                fullStyle += endStyle;
            }
            var token = elt("span", [content], fullStyle, css);
            if (attributes) {
                for (var attr in attributes) {
                    if (attributes.hasOwnProperty(attr) && attr != "style" && attr != "class") {
                        token.setAttribute(attr, attributes[attr]);
                    }
                }
            }
            return builder.content.appendChild(token);
        }
        builder.content.appendChild(content);
    }

    // Change some spaces to NBSP to prevent the browser from collapsing
    // trailing spaces at the end of a line when rendering text (issue #1362).
    function splitSpaces(text, trailingBefore) {
        if (text.length > 1 && !/  /.test(text)) {
            return text;
        }
        var spaceBefore = trailingBefore,
            result = "";
        for (var i = 0; i < text.length; i++) {
            var ch = text.charAt(i);
            if (ch == " " && spaceBefore && (i == text.length - 1 || text.charCodeAt(i + 1) == 32)) {
                ch = "\xA0";
            }
            result += ch;
            spaceBefore = ch == " ";
        }
        return result;
    }

    // Work around nonsense dimensions being reported for stretches of
    // right-to-left text.
    function buildTokenBadBidi(inner, order) {
        return function (builder, text, style, startStyle, endStyle, css, attributes) {
            style = style ? style + " cm-force-border" : "cm-force-border";
            var start = builder.pos,
                end = start + text.length;
            for (;;) {
                // Find the part that overlaps with the start of this text
                var part = void 0;
                for (var i = 0; i < order.length; i++) {
                    part = order[i];
                    if (part.to > start && part.from <= start) {
                        break;
                    }
                }
                if (part.to >= end) {
                    return inner(builder, text, style, startStyle, endStyle, css, attributes);
                }
                inner(builder, text.slice(0, part.to - start), style, startStyle, null, css, attributes);
                startStyle = null;
                text = text.slice(part.to - start);
                start = part.to;
            }
        };
    }

    function buildCollapsedSpan(builder, size, marker, ignoreWidget) {
        var widget = !ignoreWidget && marker.widgetNode;
        if (widget) {
            builder.map.push(builder.pos, builder.pos + size, widget);
        }
        if (!ignoreWidget && builder.cm.display.input.needsContentAttribute) {
            if (!widget) {
                widget = builder.content.appendChild(document.createElement("span"));
            }
            widget.setAttribute("cm-marker", marker.id);
        }
        if (widget) {
            builder.cm.display.input.setUneditable(widget);
            builder.content.appendChild(widget);
        }
        builder.pos += size;
        builder.trailingSpace = false;
    }

    // Outputs a number of spans to make up a line, taking highlighting
    // and marked text into account.
    function insertLineContent(line, builder, styles) {
        var spans = line.markedSpans,
            allText = line.text,
            at = 0;
        if (!spans) {
            for (var i$1 = 1; i$1 < styles.length; i$1 += 2) {
                builder.addToken(builder, allText.slice(at, at = styles[i$1]), interpretTokenStyle(styles[i$1 + 1], builder.cm.options));
            }
            return;
        }

        var len = allText.length,
            pos = 0,
            i = 1,
            text = "",
            style,
            css;
        var nextChange = 0,
            spanStyle,
            spanEndStyle,
            spanStartStyle,
            collapsed,
            attributes;
        for (;;) {
            if (nextChange == pos) {
                // Update current marker set
                spanStyle = spanEndStyle = spanStartStyle = css = "";
                attributes = null;
                collapsed = null;nextChange = Infinity;
                var foundBookmarks = [],
                    endStyles = void 0;
                for (var j = 0; j < spans.length; ++j) {
                    var sp = spans[j],
                        m = sp.marker;
                    if (m.type == "bookmark" && sp.from == pos && m.widgetNode) {
                        foundBookmarks.push(m);
                    } else if (sp.from <= pos && (sp.to == null || sp.to > pos || m.collapsed && sp.to == pos && sp.from == pos)) {
                        if (sp.to != null && sp.to != pos && nextChange > sp.to) {
                            nextChange = sp.to;
                            spanEndStyle = "";
                        }
                        if (m.className) {
                            spanStyle += " " + m.className;
                        }
                        if (m.css) {
                            css = (css ? css + ";" : "") + m.css;
                        }
                        if (m.startStyle && sp.from == pos) {
                            spanStartStyle += " " + m.startStyle;
                        }
                        if (m.endStyle && sp.to == nextChange) {
                            (endStyles || (endStyles = [])).push(m.endStyle, sp.to);
                        }
                        // support for the old title property
                        // https://github.com/codemirror/CodeMirror/pull/5673
                        if (m.title) {
                            (attributes || (attributes = {})).title = m.title;
                        }
                        if (m.attributes) {
                            for (var attr in m.attributes) {
                                (attributes || (attributes = {}))[attr] = m.attributes[attr];
                            }
                        }
                        if (m.collapsed && (!collapsed || compareCollapsedMarkers(collapsed.marker, m) < 0)) {
                            collapsed = sp;
                        }
                    } else if (sp.from > pos && nextChange > sp.from) {
                        nextChange = sp.from;
                    }
                }
                if (endStyles) {
                    for (var j$1 = 0; j$1 < endStyles.length; j$1 += 2) {
                        if (endStyles[j$1 + 1] == nextChange) {
                            spanEndStyle += " " + endStyles[j$1];
                        }
                    }
                }

                if (!collapsed || collapsed.from == pos) {
                    for (var j$2 = 0; j$2 < foundBookmarks.length; ++j$2) {
                        buildCollapsedSpan(builder, 0, foundBookmarks[j$2]);
                    }
                }
                if (collapsed && (collapsed.from || 0) == pos) {
                    buildCollapsedSpan(builder, (collapsed.to == null ? len + 1 : collapsed.to) - pos, collapsed.marker, collapsed.from == null);
                    if (collapsed.to == null) {
                        return;
                    }
                    if (collapsed.to == pos) {
                        collapsed = false;
                    }
                }
            }
            if (pos >= len) {
                break;
            }

            var upto = Math.min(len, nextChange);
            while (true) {
                if (text) {
                    var end = pos + text.length;
                    if (!collapsed) {
                        var tokenText = end > upto ? text.slice(0, upto - pos) : text;
                        builder.addToken(builder, tokenText, style ? style + spanStyle : spanStyle, spanStartStyle, pos + tokenText.length == nextChange ? spanEndStyle : "", css, attributes);
                    }
                    if (end >= upto) {
                        text = text.slice(upto - pos);pos = upto;break;
                    }
                    pos = end;
                    spanStartStyle = "";
                }
                text = allText.slice(at, at = styles[i++]);
                style = interpretTokenStyle(styles[i++], builder.cm.options);
            }
        }
    }

    // These objects are used to represent the visible (currently drawn)
    // part of the document. A LineView may correspond to multiple
    // logical lines, if those are connected by collapsed ranges.
    function LineView(doc, line, lineN) {
        // The starting line
        this.line = line;
        // Continuing lines, if any
        this.rest = visualLineContinued(line);
        // Number of logical lines in this visual line
        this.size = this.rest ? lineNo(lst(this.rest)) - lineN + 1 : 1;
        this.node = this.text = null;
        this.hidden = lineIsHidden(doc, line);
    }

    // Create a range of LineView objects for the given lines.
    function buildViewArray(cm, from, to) {
        var array = [],
            nextPos;
        for (var pos = from; pos < to; pos = nextPos) {
            var view = new LineView(cm.doc, getLine(cm.doc, pos), pos);
            nextPos = pos + view.size;
            array.push(view);
        }
        return array;
    }

    var operationGroup = null;

    function pushOperation(op) {
        if (operationGroup) {
            operationGroup.ops.push(op);
        } else {
            op.ownsGroup = operationGroup = {
                ops: [op],
                delayedCallbacks: []
            };
        }
    }

    function fireCallbacksForOps(group) {
        // Calls delayed callbacks and cursorActivity handlers until no
        // new ones appear
        var callbacks = group.delayedCallbacks,
            i = 0;
        do {
            for (; i < callbacks.length; i++) {
                callbacks[i].call(null);
            }
            for (var j = 0; j < group.ops.length; j++) {
                var op = group.ops[j];
                if (op.cursorActivityHandlers) {
                    while (op.cursorActivityCalled < op.cursorActivityHandlers.length) {
                        op.cursorActivityHandlers[op.cursorActivityCalled++].call(null, op.cm);
                    }
                }
            }
        } while (i < callbacks.length);
    }

    function finishOperation(op, endCb) {
        var group = op.ownsGroup;
        if (!group) {
            return;
        }

        try {
            fireCallbacksForOps(group);
        } finally {
            operationGroup = null;
            endCb(group);
        }
    }

    var orphanDelayedCallbacks = null;

    // Often, we want to signal events at a point where we are in the
    // middle of some work, but don't want the handler to start calling
    // other methods on the editor, which might be in an inconsistent
    // state or simply not expect any other events to happen.
    // signalLater looks whether there are any handlers, and schedules
    // them to be executed when the last operation ends, or, if no
    // operation is active, when a timeout fires.
    function signalLater(emitter, type /*, values...*/) {
        var arr = getHandlers(emitter, type);
        if (!arr.length) {
            return;
        }
        var args = Array.prototype.slice.call(arguments, 2),
            list;
        if (operationGroup) {
            list = operationGroup.delayedCallbacks;
        } else if (orphanDelayedCallbacks) {
            list = orphanDelayedCallbacks;
        } else {
            list = orphanDelayedCallbacks = [];
            setTimeout(fireOrphanDelayed, 0);
        }
        var loop = function loop(i) {
            list.push(function () {
                return arr[i].apply(null, args);
            });
        };

        for (var i = 0; i < arr.length; ++i) {
            loop(i);
        }
    }

    function fireOrphanDelayed() {
        var delayed = orphanDelayedCallbacks;
        orphanDelayedCallbacks = null;
        for (var i = 0; i < delayed.length; ++i) {
            delayed[i]();
        }
    }

    // When an aspect of a line changes, a string is added to
    // lineView.changes. This updates the relevant part of the line's
    // DOM structure.
    function updateLineForChanges(cm, lineView, lineN, dims) {
        for (var j = 0; j < lineView.changes.length; j++) {
            var type = lineView.changes[j];
            if (type == "text") {
                updateLineText(cm, lineView);
            } else if (type == "gutter") {
                updateLineGutter(cm, lineView, lineN, dims);
            } else if (type == "class") {
                updateLineClasses(cm, lineView);
            } else if (type == "widget") {
                updateLineWidgets(cm, lineView, dims);
            }
        }
        lineView.changes = null;
    }

    // Lines with gutter elements, widgets or a background class need to
    // be wrapped, and have the extra elements added to the wrapper div
    function ensureLineWrapped(lineView) {
        if (lineView.node == lineView.text) {
            lineView.node = elt("div", null, null, "position: relative");
            if (lineView.text.parentNode) {
                lineView.text.parentNode.replaceChild(lineView.node, lineView.text);
            }
            lineView.node.appendChild(lineView.text);
            if (ie && ie_version < 8) {
                lineView.node.style.zIndex = 2;
            }
        }
        return lineView.node;
    }

    function updateLineBackground(cm, lineView) {
        var cls = lineView.bgClass ? lineView.bgClass + " " + (lineView.line.bgClass || "") : lineView.line.bgClass;
        if (cls) {
            cls += " CodeMirror-linebackground";
        }
        if (lineView.background) {
            if (cls) {
                lineView.background.className = cls;
            } else {
                lineView.background.parentNode.removeChild(lineView.background);lineView.background = null;
            }
        } else if (cls) {
            var wrap = ensureLineWrapped(lineView);
            lineView.background = wrap.insertBefore(elt("div", null, cls), wrap.firstChild);
            cm.display.input.setUneditable(lineView.background);
        }
    }

    // Wrapper around buildLineContent which will reuse the structure
    // in display.externalMeasured when possible.
    function getLineContent(cm, lineView) {
        var ext = cm.display.externalMeasured;
        if (ext && ext.line == lineView.line) {
            cm.display.externalMeasured = null;
            lineView.measure = ext.measure;
            return ext.built;
        }
        return buildLineContent(cm, lineView);
    }

    // Redraw the line's text. Interacts with the background and text
    // classes because the mode may output tokens that influence these
    // classes.
    function updateLineText(cm, lineView) {
        var cls = lineView.text.className;
        var built = getLineContent(cm, lineView);
        if (lineView.text == lineView.node) {
            lineView.node = built.pre;
        }
        lineView.text.parentNode.replaceChild(built.pre, lineView.text);
        lineView.text = built.pre;
        if (built.bgClass != lineView.bgClass || built.textClass != lineView.textClass) {
            lineView.bgClass = built.bgClass;
            lineView.textClass = built.textClass;
            updateLineClasses(cm, lineView);
        } else if (cls) {
            lineView.text.className = cls;
        }
    }

    function updateLineClasses(cm, lineView) {
        updateLineBackground(cm, lineView);
        if (lineView.line.wrapClass) {
            ensureLineWrapped(lineView).className = lineView.line.wrapClass;
        } else if (lineView.node != lineView.text) {
            lineView.node.className = "";
        }
        var textClass = lineView.textClass ? lineView.textClass + " " + (lineView.line.textClass || "") : lineView.line.textClass;
        lineView.text.className = textClass || "";
    }

    function updateLineGutter(cm, lineView, lineN, dims) {
        if (lineView.gutter) {
            lineView.node.removeChild(lineView.gutter);
            lineView.gutter = null;
        }
        if (lineView.gutterBackground) {
            lineView.node.removeChild(lineView.gutterBackground);
            lineView.gutterBackground = null;
        }
        if (lineView.line.gutterClass) {
            var wrap = ensureLineWrapped(lineView);
            lineView.gutterBackground = elt("div", null, "CodeMirror-gutter-background " + lineView.line.gutterClass, "left: " + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px; width: " + dims.gutterTotalWidth + "px");
            cm.display.input.setUneditable(lineView.gutterBackground);
            wrap.insertBefore(lineView.gutterBackground, lineView.text);
        }
        var markers = lineView.line.gutterMarkers;
        if (cm.options.lineNumbers || markers) {
            var wrap$1 = ensureLineWrapped(lineView);
            var gutterWrap = lineView.gutter = elt("div", null, "CodeMirror-gutter-wrapper", "left: " + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px");
            cm.display.input.setUneditable(gutterWrap);
            wrap$1.insertBefore(gutterWrap, lineView.text);
            if (lineView.line.gutterClass) {
                gutterWrap.className += " " + lineView.line.gutterClass;
            }
            if (cm.options.lineNumbers && (!markers || !markers["CodeMirror-linenumbers"])) {
                lineView.lineNumber = gutterWrap.appendChild(elt("div", lineNumberFor(cm.options, lineN), "CodeMirror-linenumber CodeMirror-gutter-elt", "left: " + dims.gutterLeft["CodeMirror-linenumbers"] + "px; width: " + cm.display.lineNumInnerWidth + "px"));
            }
            if (markers) {
                for (var k = 0; k < cm.display.gutterSpecs.length; ++k) {
                    var id = cm.display.gutterSpecs[k].className,
                        found = markers.hasOwnProperty(id) && markers[id];
                    if (found) {
                        gutterWrap.appendChild(elt("div", [found], "CodeMirror-gutter-elt", "left: " + dims.gutterLeft[id] + "px; width: " + dims.gutterWidth[id] + "px"));
                    }
                }
            }
        }
    }

    function updateLineWidgets(cm, lineView, dims) {
        if (lineView.alignable) {
            lineView.alignable = null;
        }
        var isWidget = classTest("CodeMirror-linewidget");
        for (var node = lineView.node.firstChild, next = void 0; node; node = next) {
            next = node.nextSibling;
            if (isWidget.test(node.className)) {
                lineView.node.removeChild(node);
            }
        }
        insertLineWidgets(cm, lineView, dims);
    }

    // Build a line's DOM representation from scratch
    function buildLineElement(cm, lineView, lineN, dims) {
        var built = getLineContent(cm, lineView);
        lineView.text = lineView.node = built.pre;
        if (built.bgClass) {
            lineView.bgClass = built.bgClass;
        }
        if (built.textClass) {
            lineView.textClass = built.textClass;
        }

        updateLineClasses(cm, lineView);
        updateLineGutter(cm, lineView, lineN, dims);
        insertLineWidgets(cm, lineView, dims);
        return lineView.node;
    }

    // A lineView may contain multiple logical lines (when merged by
    // collapsed spans). The widgets for all of them need to be drawn.
    function insertLineWidgets(cm, lineView, dims) {
        insertLineWidgetsFor(cm, lineView.line, lineView, dims, true);
        if (lineView.rest) {
            for (var i = 0; i < lineView.rest.length; i++) {
                insertLineWidgetsFor(cm, lineView.rest[i], lineView, dims, false);
            }
        }
    }

    function insertLineWidgetsFor(cm, line, lineView, dims, allowAbove) {
        if (!line.widgets) {
            return;
        }
        var wrap = ensureLineWrapped(lineView);
        for (var i = 0, ws = line.widgets; i < ws.length; ++i) {
            var widget = ws[i],
                node = elt("div", [widget.node], "CodeMirror-linewidget" + (widget.className ? " " + widget.className : ""));
            if (!widget.handleMouseEvents) {
                node.setAttribute("cm-ignore-events", "true");
            }
            positionLineWidget(widget, node, lineView, dims);
            cm.display.input.setUneditable(node);
            if (allowAbove && widget.above) {
                wrap.insertBefore(node, lineView.gutter || lineView.text);
            } else {
                wrap.appendChild(node);
            }
            signalLater(widget, "redraw");
        }
    }

    function positionLineWidget(widget, node, lineView, dims) {
        if (widget.noHScroll) {
            (lineView.alignable || (lineView.alignable = [])).push(node);
            var width = dims.wrapperWidth;
            node.style.left = dims.fixedPos + "px";
            if (!widget.coverGutter) {
                width -= dims.gutterTotalWidth;
                node.style.paddingLeft = dims.gutterTotalWidth + "px";
            }
            node.style.width = width + "px";
        }
        if (widget.coverGutter) {
            node.style.zIndex = 5;
            node.style.position = "relative";
            if (!widget.noHScroll) {
                node.style.marginLeft = -dims.gutterTotalWidth + "px";
            }
        }
    }

    function widgetHeight(widget) {
        if (widget.height != null) {
            return widget.height;
        }
        var cm = widget.doc.cm;
        if (!cm) {
            return 0;
        }
        if (!contains(document.body, widget.node)) {
            var parentStyle = "position: relative;";
            if (widget.coverGutter) {
                parentStyle += "margin-left: -" + cm.display.gutters.offsetWidth + "px;";
            }
            if (widget.noHScroll) {
                parentStyle += "width: " + cm.display.wrapper.clientWidth + "px;";
            }
            removeChildrenAndAdd(cm.display.measure, elt("div", [widget.node], null, parentStyle));
        }
        return widget.height = widget.node.parentNode.offsetHeight;
    }

    // Return true when the given mouse event happened in a widget
    function eventInWidget(display, e) {
        for (var n = e_target(e); n != display.wrapper; n = n.parentNode) {
            if (!n || n.nodeType == 1 && n.getAttribute("cm-ignore-events") == "true" || n.parentNode == display.sizer && n != display.mover) {
                return true;
            }
        }
    }

    // POSITION MEASUREMENT

    function paddingTop(display) {
        return display.lineSpace.offsetTop;
    }
    function paddingVert(display) {
        return display.mover.offsetHeight - display.lineSpace.offsetHeight;
    }
    function paddingH(display) {
        if (display.cachedPaddingH) {
            return display.cachedPaddingH;
        }
        var e = removeChildrenAndAdd(display.measure, elt("pre", "x", "CodeMirror-line-like"));
        var style = window.getComputedStyle ? window.getComputedStyle(e) : e.currentStyle;
        var data = { left: parseInt(style.paddingLeft), right: parseInt(style.paddingRight) };
        if (!isNaN(data.left) && !isNaN(data.right)) {
            display.cachedPaddingH = data;
        }
        return data;
    }

    function scrollGap(cm) {
        return scrollerGap - cm.display.nativeBarWidth;
    }
    function displayWidth(cm) {
        return cm.display.scroller.clientWidth - scrollGap(cm) - cm.display.barWidth;
    }
    function displayHeight(cm) {
        return cm.display.scroller.clientHeight - scrollGap(cm) - cm.display.barHeight;
    }

    // Ensure the lineView.wrapping.heights array is populated. This is
    // an array of bottom offsets for the lines that make up a drawn
    // line. When lineWrapping is on, there might be more than one
    // height.
    function ensureLineHeights(cm, lineView, rect) {
        var wrapping = cm.options.lineWrapping;
        var curWidth = wrapping && displayWidth(cm);
        if (!lineView.measure.heights || wrapping && lineView.measure.width != curWidth) {
            var heights = lineView.measure.heights = [];
            if (wrapping) {
                lineView.measure.width = curWidth;
                var rects = lineView.text.firstChild.getClientRects();
                for (var i = 0; i < rects.length - 1; i++) {
                    var cur = rects[i],
                        next = rects[i + 1];
                    if (Math.abs(cur.bottom - next.bottom) > 2) {
                        heights.push((cur.bottom + next.top) / 2 - rect.top);
                    }
                }
            }
            heights.push(rect.bottom - rect.top);
        }
    }

    // Find a line map (mapping character offsets to text nodes) and a
    // measurement cache for the given line number. (A line view might
    // contain multiple lines when collapsed ranges are present.)
    function mapFromLineView(lineView, line, lineN) {
        if (lineView.line == line) {
            return { map: lineView.measure.map, cache: lineView.measure.cache };
        }
        for (var i = 0; i < lineView.rest.length; i++) {
            if (lineView.rest[i] == line) {
                return { map: lineView.measure.maps[i], cache: lineView.measure.caches[i] };
            }
        }
        for (var i$1 = 0; i$1 < lineView.rest.length; i$1++) {
            if (lineNo(lineView.rest[i$1]) > lineN) {
                return { map: lineView.measure.maps[i$1], cache: lineView.measure.caches[i$1], before: true };
            }
        }
    }

    // Render a line into the hidden node display.externalMeasured. Used
    // when measurement is needed for a line that's not in the viewport.
    function updateExternalMeasurement(cm, line) {
        line = visualLine(line);
        var lineN = lineNo(line);
        var view = cm.display.externalMeasured = new LineView(cm.doc, line, lineN);
        view.lineN = lineN;
        var built = view.built = buildLineContent(cm, view);
        view.text = built.pre;
        removeChildrenAndAdd(cm.display.lineMeasure, built.pre);
        return view;
    }

    // Get a {top, bottom, left, right} box (in line-local coordinates)
    // for a given character.
    function measureChar(cm, line, ch, bias) {
        return measureCharPrepared(cm, prepareMeasureForLine(cm, line), ch, bias);
    }

    // Find a line view that corresponds to the given line number.
    function findViewForLine(cm, lineN) {
        if (lineN >= cm.display.viewFrom && lineN < cm.display.viewTo) {
            return cm.display.view[findViewIndex(cm, lineN)];
        }
        var ext = cm.display.externalMeasured;
        if (ext && lineN >= ext.lineN && lineN < ext.lineN + ext.size) {
            return ext;
        }
    }

    // Measurement can be split in two steps, the set-up work that
    // applies to the whole line, and the measurement of the actual
    // character. Functions like coordsChar, that need to do a lot of
    // measurements in a row, can thus ensure that the set-up work is
    // only done once.
    function prepareMeasureForLine(cm, line) {
        var lineN = lineNo(line);
        var view = findViewForLine(cm, lineN);
        if (view && !view.text) {
            view = null;
        } else if (view && view.changes) {
            updateLineForChanges(cm, view, lineN, getDimensions(cm));
            cm.curOp.forceUpdate = true;
        }
        if (!view) {
            view = updateExternalMeasurement(cm, line);
        }

        var info = mapFromLineView(view, line, lineN);
        return {
            line: line, view: view, rect: null,
            map: info.map, cache: info.cache, before: info.before,
            hasHeights: false
        };
    }

    // Given a prepared measurement object, measures the position of an
    // actual character (or fetches it from the cache).
    function measureCharPrepared(cm, prepared, ch, bias, varHeight) {
        if (prepared.before) {
            ch = -1;
        }
        var key = ch + (bias || ""),
            found;
        if (prepared.cache.hasOwnProperty(key)) {
            found = prepared.cache[key];
        } else {
            if (!prepared.rect) {
                prepared.rect = prepared.view.text.getBoundingClientRect();
            }
            if (!prepared.hasHeights) {
                ensureLineHeights(cm, prepared.view, prepared.rect);
                prepared.hasHeights = true;
            }
            found = measureCharInner(cm, prepared, ch, bias);
            if (!found.bogus) {
                prepared.cache[key] = found;
            }
        }
        return { left: found.left, right: found.right,
            top: varHeight ? found.rtop : found.top,
            bottom: varHeight ? found.rbottom : found.bottom };
    }

    var nullRect = { left: 0, right: 0, top: 0, bottom: 0 };

    function nodeAndOffsetInLineMap(map, ch, bias) {
        var node, start, end, collapse, mStart, mEnd;
        // First, search the line map for the text node corresponding to,
        // or closest to, the target character.
        for (var i = 0; i < map.length; i += 3) {
            mStart = map[i];
            mEnd = map[i + 1];
            if (ch < mStart) {
                start = 0;end = 1;
                collapse = "left";
            } else if (ch < mEnd) {
                start = ch - mStart;
                end = start + 1;
            } else if (i == map.length - 3 || ch == mEnd && map[i + 3] > ch) {
                end = mEnd - mStart;
                start = end - 1;
                if (ch >= mEnd) {
                    collapse = "right";
                }
            }
            if (start != null) {
                node = map[i + 2];
                if (mStart == mEnd && bias == (node.insertLeft ? "left" : "right")) {
                    collapse = bias;
                }
                if (bias == "left" && start == 0) {
                    while (i && map[i - 2] == map[i - 3] && map[i - 1].insertLeft) {
                        node = map[(i -= 3) + 2];
                        collapse = "left";
                    }
                }
                if (bias == "right" && start == mEnd - mStart) {
                    while (i < map.length - 3 && map[i + 3] == map[i + 4] && !map[i + 5].insertLeft) {
                        node = map[(i += 3) + 2];
                        collapse = "right";
                    }
                }
                break;
            }
        }
        return { node: node, start: start, end: end, collapse: collapse, coverStart: mStart, coverEnd: mEnd };
    }

    function getUsefulRect(rects, bias) {
        var rect = nullRect;
        if (bias == "left") {
            for (var i = 0; i < rects.length; i++) {
                if ((rect = rects[i]).left != rect.right) {
                    break;
                }
            }
        } else {
            for (var i$1 = rects.length - 1; i$1 >= 0; i$1--) {
                if ((rect = rects[i$1]).left != rect.right) {
                    break;
                }
            }
        }
        return rect;
    }

    function measureCharInner(cm, prepared, ch, bias) {
        var place = nodeAndOffsetInLineMap(prepared.map, ch, bias);
        var node = place.node,
            start = place.start,
            end = place.end,
            collapse = place.collapse;

        var rect;
        if (node.nodeType == 3) {
            // If it is a text node, use a range to retrieve the coordinates.
            for (var i$1 = 0; i$1 < 4; i$1++) {
                // Retry a maximum of 4 times when nonsense rectangles are returned
                while (start && isExtendingChar(prepared.line.text.charAt(place.coverStart + start))) {
                    --start;
                }
                while (place.coverStart + end < place.coverEnd && isExtendingChar(prepared.line.text.charAt(place.coverStart + end))) {
                    ++end;
                }
                if (ie && ie_version < 9 && start == 0 && end == place.coverEnd - place.coverStart) {
                    rect = node.parentNode.getBoundingClientRect();
                } else {
                    rect = getUsefulRect(range(node, start, end).getClientRects(), bias);
                }
                if (rect.left || rect.right || start == 0) {
                    break;
                }
                end = start;
                start = start - 1;
                collapse = "right";
            }
            if (ie && ie_version < 11) {
                rect = maybeUpdateRectForZooming(cm.display.measure, rect);
            }
        } else {
            // If it is a widget, simply get the box for the whole widget.
            if (start > 0) {
                collapse = bias = "right";
            }
            var rects;
            if (cm.options.lineWrapping && (rects = node.getClientRects()).length > 1) {
                rect = rects[bias == "right" ? rects.length - 1 : 0];
            } else {
                rect = node.getBoundingClientRect();
            }
        }
        if (ie && ie_version < 9 && !start && (!rect || !rect.left && !rect.right)) {
            var rSpan = node.parentNode.getClientRects()[0];
            if (rSpan) {
                rect = { left: rSpan.left, right: rSpan.left + charWidth(cm.display), top: rSpan.top, bottom: rSpan.bottom };
            } else {
                rect = nullRect;
            }
        }

        var rtop = rect.top - prepared.rect.top,
            rbot = rect.bottom - prepared.rect.top;
        var mid = (rtop + rbot) / 2;
        var heights = prepared.view.measure.heights;
        var i = 0;
        for (; i < heights.length - 1; i++) {
            if (mid < heights[i]) {
                break;
            }
        }
        var top = i ? heights[i - 1] : 0,
            bot = heights[i];
        var result = { left: (collapse == "right" ? rect.right : rect.left) - prepared.rect.left,
            right: (collapse == "left" ? rect.left : rect.right) - prepared.rect.left,
            top: top, bottom: bot };
        if (!rect.left && !rect.right) {
            result.bogus = true;
        }
        if (!cm.options.singleCursorHeightPerLine) {
            result.rtop = rtop;result.rbottom = rbot;
        }

        return result;
    }

    // Work around problem with bounding client rects on ranges being
    // returned incorrectly when zoomed on IE10 and below.
    function maybeUpdateRectForZooming(measure, rect) {
        if (!window.screen || screen.logicalXDPI == null || screen.logicalXDPI == screen.deviceXDPI || !hasBadZoomedRects(measure)) {
            return rect;
        }
        var scaleX = screen.logicalXDPI / screen.deviceXDPI;
        var scaleY = screen.logicalYDPI / screen.deviceYDPI;
        return { left: rect.left * scaleX, right: rect.right * scaleX,
            top: rect.top * scaleY, bottom: rect.bottom * scaleY };
    }

    function clearLineMeasurementCacheFor(lineView) {
        if (lineView.measure) {
            lineView.measure.cache = {};
            lineView.measure.heights = null;
            if (lineView.rest) {
                for (var i = 0; i < lineView.rest.length; i++) {
                    lineView.measure.caches[i] = {};
                }
            }
        }
    }

    function clearLineMeasurementCache(cm) {
        cm.display.externalMeasure = null;
        removeChildren(cm.display.lineMeasure);
        for (var i = 0; i < cm.display.view.length; i++) {
            clearLineMeasurementCacheFor(cm.display.view[i]);
        }
    }

    function clearCaches(cm) {
        clearLineMeasurementCache(cm);
        cm.display.cachedCharWidth = cm.display.cachedTextHeight = cm.display.cachedPaddingH = null;
        if (!cm.options.lineWrapping) {
            cm.display.maxLineChanged = true;
        }
        cm.display.lineNumChars = null;
    }

    function pageScrollX() {
        // Work around https://bugs.chromium.org/p/chromium/issues/detail?id=489206
        // which causes page_Offset and bounding client rects to use
        // different reference viewports and invalidate our calculations.
        if (chrome && android) {
            return -(document.body.getBoundingClientRect().left - parseInt(getComputedStyle(document.body).marginLeft));
        }
        return window.pageXOffset || (document.documentElement || document.body).scrollLeft;
    }
    function pageScrollY() {
        if (chrome && android) {
            return -(document.body.getBoundingClientRect().top - parseInt(getComputedStyle(document.body).marginTop));
        }
        return window.pageYOffset || (document.documentElement || document.body).scrollTop;
    }

    function widgetTopHeight(lineObj) {
        var height = 0;
        if (lineObj.widgets) {
            for (var i = 0; i < lineObj.widgets.length; ++i) {
                if (lineObj.widgets[i].above) {
                    height += widgetHeight(lineObj.widgets[i]);
                }
            }
        }
        return height;
    }

    // Converts a {top, bottom, left, right} box from line-local
    // coordinates into another coordinate system. Context may be one of
    // "line", "div" (display.lineDiv), "local"./null (editor), "window",
    // or "page".
    function intoCoordSystem(cm, lineObj, rect, context, includeWidgets) {
        if (!includeWidgets) {
            var height = widgetTopHeight(lineObj);
            rect.top += height;rect.bottom += height;
        }
        if (context == "line") {
            return rect;
        }
        if (!context) {
            context = "local";
        }
        var yOff = _heightAtLine(lineObj);
        if (context == "local") {
            yOff += paddingTop(cm.display);
        } else {
            yOff -= cm.display.viewOffset;
        }
        if (context == "page" || context == "window") {
            var lOff = cm.display.lineSpace.getBoundingClientRect();
            yOff += lOff.top + (context == "window" ? 0 : pageScrollY());
            var xOff = lOff.left + (context == "window" ? 0 : pageScrollX());
            rect.left += xOff;rect.right += xOff;
        }
        rect.top += yOff;rect.bottom += yOff;
        return rect;
    }

    // Coverts a box from "div" coords to another coordinate system.
    // Context may be "window", "page", "div", or "local"./null.
    function fromCoordSystem(cm, coords, context) {
        if (context == "div") {
            return coords;
        }
        var left = coords.left,
            top = coords.top;
        // First move into "page" coordinate system
        if (context == "page") {
            left -= pageScrollX();
            top -= pageScrollY();
        } else if (context == "local" || !context) {
            var localBox = cm.display.sizer.getBoundingClientRect();
            left += localBox.left;
            top += localBox.top;
        }

        var lineSpaceBox = cm.display.lineSpace.getBoundingClientRect();
        return { left: left - lineSpaceBox.left, top: top - lineSpaceBox.top };
    }

    function _charCoords(cm, pos, context, lineObj, bias) {
        if (!lineObj) {
            lineObj = getLine(cm.doc, pos.line);
        }
        return intoCoordSystem(cm, lineObj, measureChar(cm, lineObj, pos.ch, bias), context);
    }

    // Returns a box for a given cursor position, which may have an
    // 'other' property containing the position of the secondary cursor
    // on a bidi boundary.
    // A cursor Pos(line, char, "before") is on the same visual line as `char - 1`
    // and after `char - 1` in writing order of `char - 1`
    // A cursor Pos(line, char, "after") is on the same visual line as `char`
    // and before `char` in writing order of `char`
    // Examples (upper-case letters are RTL, lower-case are LTR):
    //     Pos(0, 1, ...)
    //     before   after
    // ab     a|b     a|b
    // aB     a|B     aB|
    // Ab     |Ab     A|b
    // AB     B|A     B|A
    // Every position after the last character on a line is considered to stick
    // to the last character on the line.
    function _cursorCoords(cm, pos, context, lineObj, preparedMeasure, varHeight) {
        lineObj = lineObj || getLine(cm.doc, pos.line);
        if (!preparedMeasure) {
            preparedMeasure = prepareMeasureForLine(cm, lineObj);
        }
        function get$$1(ch, right) {
            var m = measureCharPrepared(cm, preparedMeasure, ch, right ? "right" : "left", varHeight);
            if (right) {
                m.left = m.right;
            } else {
                m.right = m.left;
            }
            return intoCoordSystem(cm, lineObj, m, context);
        }
        var order = getOrder(lineObj, cm.doc.direction),
            ch = pos.ch,
            sticky = pos.sticky;
        if (ch >= lineObj.text.length) {
            ch = lineObj.text.length;
            sticky = "before";
        } else if (ch <= 0) {
            ch = 0;
            sticky = "after";
        }
        if (!order) {
            return get$$1(sticky == "before" ? ch - 1 : ch, sticky == "before");
        }

        function getBidi(ch, partPos, invert) {
            var part = order[partPos],
                right = part.level == 1;
            return get$$1(invert ? ch - 1 : ch, right != invert);
        }
        var partPos = getBidiPartAt(order, ch, sticky);
        var other = bidiOther;
        var val = getBidi(ch, partPos, sticky == "before");
        if (other != null) {
            val.other = getBidi(ch, other, sticky != "before");
        }
        return val;
    }

    // Used to cheaply estimate the coordinates for a position. Used for
    // intermediate scroll updates.
    function estimateCoords(cm, pos) {
        var left = 0;
        pos = _clipPos(cm.doc, pos);
        if (!cm.options.lineWrapping) {
            left = charWidth(cm.display) * pos.ch;
        }
        var lineObj = getLine(cm.doc, pos.line);
        var top = _heightAtLine(lineObj) + paddingTop(cm.display);
        return { left: left, right: left, top: top, bottom: top + lineObj.height };
    }

    // Positions returned by coordsChar contain some extra information.
    // xRel is the relative x position of the input coordinates compared
    // to the found position (so xRel > 0 means the coordinates are to
    // the right of the character position, for example). When outside
    // is true, that means the coordinates lie outside the line's
    // vertical range.
    function PosWithInfo(line, ch, sticky, outside, xRel) {
        var pos = Pos(line, ch, sticky);
        pos.xRel = xRel;
        if (outside) {
            pos.outside = outside;
        }
        return pos;
    }

    // Compute the character position closest to the given coordinates.
    // Input must be lineSpace-local ("div" coordinate system).
    function _coordsChar(cm, x, y) {
        var doc = cm.doc;
        y += cm.display.viewOffset;
        if (y < 0) {
            return PosWithInfo(doc.first, 0, null, -1, -1);
        }
        var lineN = _lineAtHeight(doc, y),
            last = doc.first + doc.size - 1;
        if (lineN > last) {
            return PosWithInfo(doc.first + doc.size - 1, getLine(doc, last).text.length, null, 1, 1);
        }
        if (x < 0) {
            x = 0;
        }

        var lineObj = getLine(doc, lineN);
        for (;;) {
            var found = coordsCharInner(cm, lineObj, lineN, x, y);
            var collapsed = collapsedSpanAround(lineObj, found.ch + (found.xRel > 0 || found.outside > 0 ? 1 : 0));
            if (!collapsed) {
                return found;
            }
            var rangeEnd = collapsed.find(1);
            if (rangeEnd.line == lineN) {
                return rangeEnd;
            }
            lineObj = getLine(doc, lineN = rangeEnd.line);
        }
    }

    function wrappedLineExtent(cm, lineObj, preparedMeasure, y) {
        y -= widgetTopHeight(lineObj);
        var end = lineObj.text.length;
        var begin = findFirst(function (ch) {
            return measureCharPrepared(cm, preparedMeasure, ch - 1).bottom <= y;
        }, end, 0);
        end = findFirst(function (ch) {
            return measureCharPrepared(cm, preparedMeasure, ch).top > y;
        }, begin, end);
        return { begin: begin, end: end };
    }

    function wrappedLineExtentChar(cm, lineObj, preparedMeasure, target) {
        if (!preparedMeasure) {
            preparedMeasure = prepareMeasureForLine(cm, lineObj);
        }
        var targetTop = intoCoordSystem(cm, lineObj, measureCharPrepared(cm, preparedMeasure, target), "line").top;
        return wrappedLineExtent(cm, lineObj, preparedMeasure, targetTop);
    }

    // Returns true if the given side of a box is after the given
    // coordinates, in top-to-bottom, left-to-right order.
    function boxIsAfter(box, x, y, left) {
        return box.bottom <= y ? false : box.top > y ? true : (left ? box.left : box.right) > x;
    }

    function coordsCharInner(cm, lineObj, lineNo, x, y) {
        // Move y into line-local coordinate space
        y -= _heightAtLine(lineObj);
        var preparedMeasure = prepareMeasureForLine(cm, lineObj);
        // When directly calling `measureCharPrepared`, we have to adjust
        // for the widgets at this line.
        var widgetHeight = widgetTopHeight(lineObj);
        var begin = 0,
            end = lineObj.text.length,
            ltr = true;

        var order = getOrder(lineObj, cm.doc.direction);
        // If the line isn't plain left-to-right text, first figure out
        // which bidi section the coordinates fall into.
        if (order) {
            var part = (cm.options.lineWrapping ? coordsBidiPartWrapped : coordsBidiPart)(cm, lineObj, lineNo, preparedMeasure, order, x, y);
            ltr = part.level != 1;
            // The awkward -1 offsets are needed because findFirst (called
            // on these below) will treat its first bound as inclusive,
            // second as exclusive, but we want to actually address the
            // characters in the part's range
            begin = ltr ? part.from : part.to - 1;
            end = ltr ? part.to : part.from - 1;
        }

        // A binary search to find the first character whose bounding box
        // starts after the coordinates. If we run across any whose box wrap
        // the coordinates, store that.
        var chAround = null,
            boxAround = null;
        var ch = findFirst(function (ch) {
            var box = measureCharPrepared(cm, preparedMeasure, ch);
            box.top += widgetHeight;box.bottom += widgetHeight;
            if (!boxIsAfter(box, x, y, false)) {
                return false;
            }
            if (box.top <= y && box.left <= x) {
                chAround = ch;
                boxAround = box;
            }
            return true;
        }, begin, end);

        var baseX,
            sticky,
            outside = false;
        // If a box around the coordinates was found, use that
        if (boxAround) {
            // Distinguish coordinates nearer to the left or right side of the box
            var atLeft = x - boxAround.left < boxAround.right - x,
                atStart = atLeft == ltr;
            ch = chAround + (atStart ? 0 : 1);
            sticky = atStart ? "after" : "before";
            baseX = atLeft ? boxAround.left : boxAround.right;
        } else {
            // (Adjust for extended bound, if necessary.)
            if (!ltr && (ch == end || ch == begin)) {
                ch++;
            }
            // To determine which side to associate with, get the box to the
            // left of the character and compare it's vertical position to the
            // coordinates
            sticky = ch == 0 ? "after" : ch == lineObj.text.length ? "before" : measureCharPrepared(cm, preparedMeasure, ch - (ltr ? 1 : 0)).bottom + widgetHeight <= y == ltr ? "after" : "before";
            // Now get accurate coordinates for this place, in order to get a
            // base X position
            var coords = _cursorCoords(cm, Pos(lineNo, ch, sticky), "line", lineObj, preparedMeasure);
            baseX = coords.left;
            outside = y < coords.top ? -1 : y >= coords.bottom ? 1 : 0;
        }

        ch = skipExtendingChars(lineObj.text, ch, 1);
        return PosWithInfo(lineNo, ch, sticky, outside, x - baseX);
    }

    function coordsBidiPart(cm, lineObj, lineNo, preparedMeasure, order, x, y) {
        // Bidi parts are sorted left-to-right, and in a non-line-wrapping
        // situation, we can take this ordering to correspond to the visual
        // ordering. This finds the first part whose end is after the given
        // coordinates.
        var index = findFirst(function (i) {
            var part = order[i],
                ltr = part.level != 1;
            return boxIsAfter(_cursorCoords(cm, Pos(lineNo, ltr ? part.to : part.from, ltr ? "before" : "after"), "line", lineObj, preparedMeasure), x, y, true);
        }, 0, order.length - 1);
        var part = order[index];
        // If this isn't the first part, the part's start is also after
        // the coordinates, and the coordinates aren't on the same line as
        // that start, move one part back.
        if (index > 0) {
            var ltr = part.level != 1;
            var start = _cursorCoords(cm, Pos(lineNo, ltr ? part.from : part.to, ltr ? "after" : "before"), "line", lineObj, preparedMeasure);
            if (boxIsAfter(start, x, y, true) && start.top > y) {
                part = order[index - 1];
            }
        }
        return part;
    }

    function coordsBidiPartWrapped(cm, lineObj, _lineNo, preparedMeasure, order, x, y) {
        // In a wrapped line, rtl text on wrapping boundaries can do things
        // that don't correspond to the ordering in our `order` array at
        // all, so a binary search doesn't work, and we want to return a
        // part that only spans one line so that the binary search in
        // coordsCharInner is safe. As such, we first find the extent of the
        // wrapped line, and then do a flat search in which we discard any
        // spans that aren't on the line.
        var ref = wrappedLineExtent(cm, lineObj, preparedMeasure, y);
        var begin = ref.begin;
        var end = ref.end;
        if (/\s/.test(lineObj.text.charAt(end - 1))) {
            end--;
        }
        var part = null,
            closestDist = null;
        for (var i = 0; i < order.length; i++) {
            var p = order[i];
            if (p.from >= end || p.to <= begin) {
                continue;
            }
            var ltr = p.level != 1;
            var endX = measureCharPrepared(cm, preparedMeasure, ltr ? Math.min(end, p.to) - 1 : Math.max(begin, p.from)).right;
            // Weigh against spans ending before this, so that they are only
            // picked if nothing ends after
            var dist = endX < x ? x - endX + 1e9 : endX - x;
            if (!part || closestDist > dist) {
                part = p;
                closestDist = dist;
            }
        }
        if (!part) {
            part = order[order.length - 1];
        }
        // Clip the part to the wrapped line.
        if (part.from < begin) {
            part = { from: begin, to: part.to, level: part.level };
        }
        if (part.to > end) {
            part = { from: part.from, to: end, level: part.level };
        }
        return part;
    }

    var measureText;
    // Compute the default text height.
    function textHeight(display) {
        if (display.cachedTextHeight != null) {
            return display.cachedTextHeight;
        }
        if (measureText == null) {
            measureText = elt("pre", null, "CodeMirror-line-like");
            // Measure a bunch of lines, for browsers that compute
            // fractional heights.
            for (var i = 0; i < 49; ++i) {
                measureText.appendChild(document.createTextNode("x"));
                measureText.appendChild(elt("br"));
            }
            measureText.appendChild(document.createTextNode("x"));
        }
        removeChildrenAndAdd(display.measure, measureText);
        var height = measureText.offsetHeight / 50;
        if (height > 3) {
            display.cachedTextHeight = height;
        }
        removeChildren(display.measure);
        return height || 1;
    }

    // Compute the default character width.
    function charWidth(display) {
        if (display.cachedCharWidth != null) {
            return display.cachedCharWidth;
        }
        var anchor = elt("span", "xxxxxxxxxx");
        var pre = elt("pre", [anchor], "CodeMirror-line-like");
        removeChildrenAndAdd(display.measure, pre);
        var rect = anchor.getBoundingClientRect(),
            width = (rect.right - rect.left) / 10;
        if (width > 2) {
            display.cachedCharWidth = width;
        }
        return width || 10;
    }

    // Do a bulk-read of the DOM positions and sizes needed to draw the
    // view, so that we don't interleave reading and writing to the DOM.
    function getDimensions(cm) {
        var d = cm.display,
            left = {},
            width = {};
        var gutterLeft = d.gutters.clientLeft;
        for (var n = d.gutters.firstChild, i = 0; n; n = n.nextSibling, ++i) {
            var id = cm.display.gutterSpecs[i].className;
            left[id] = n.offsetLeft + n.clientLeft + gutterLeft;
            width[id] = n.clientWidth;
        }
        return { fixedPos: compensateForHScroll(d),
            gutterTotalWidth: d.gutters.offsetWidth,
            gutterLeft: left,
            gutterWidth: width,
            wrapperWidth: d.wrapper.clientWidth };
    }

    // Computes display.scroller.scrollLeft + display.gutters.offsetWidth,
    // but using getBoundingClientRect to get a sub-pixel-accurate
    // result.
    function compensateForHScroll(display) {
        return display.scroller.getBoundingClientRect().left - display.sizer.getBoundingClientRect().left;
    }

    // Returns a function that estimates the height of a line, to use as
    // first approximation until the line becomes visible (and is thus
    // properly measurable).
    function estimateHeight(cm) {
        var th = textHeight(cm.display),
            wrapping = cm.options.lineWrapping;
        var perLine = wrapping && Math.max(5, cm.display.scroller.clientWidth / charWidth(cm.display) - 3);
        return function (line) {
            if (lineIsHidden(cm.doc, line)) {
                return 0;
            }

            var widgetsHeight = 0;
            if (line.widgets) {
                for (var i = 0; i < line.widgets.length; i++) {
                    if (line.widgets[i].height) {
                        widgetsHeight += line.widgets[i].height;
                    }
                }
            }

            if (wrapping) {
                return widgetsHeight + (Math.ceil(line.text.length / perLine) || 1) * th;
            } else {
                return widgetsHeight + th;
            }
        };
    }

    function estimateLineHeights(cm) {
        var doc = cm.doc,
            est = estimateHeight(cm);
        doc.iter(function (line) {
            var estHeight = est(line);
            if (estHeight != line.height) {
                updateLineHeight(line, estHeight);
            }
        });
    }

    // Given a mouse event, find the corresponding position. If liberal
    // is false, it checks whether a gutter or scrollbar was clicked,
    // and returns null if it was. forRect is used by rectangular
    // selections, and tries to estimate a character position even for
    // coordinates beyond the right of the text.
    function posFromMouse(cm, e, liberal, forRect) {
        var display = cm.display;
        if (!liberal && e_target(e).getAttribute("cm-not-content") == "true") {
            return null;
        }

        var x,
            y,
            space = display.lineSpace.getBoundingClientRect();
        // Fails unpredictably on IE[67] when mouse is dragged around quickly.
        try {
            x = e.clientX - space.left;y = e.clientY - space.top;
        } catch (e) {
            return null;
        }
        var coords = _coordsChar(cm, x, y),
            line;
        if (forRect && coords.xRel > 0 && (line = getLine(cm.doc, coords.line).text).length == coords.ch) {
            var colDiff = countColumn(line, line.length, cm.options.tabSize) - line.length;
            coords = Pos(coords.line, Math.max(0, Math.round((x - paddingH(cm.display).left) / charWidth(cm.display)) - colDiff));
        }
        return coords;
    }

    // Find the view element corresponding to a given line. Return null
    // when the line isn't visible.
    function findViewIndex(cm, n) {
        if (n >= cm.display.viewTo) {
            return null;
        }
        n -= cm.display.viewFrom;
        if (n < 0) {
            return null;
        }
        var view = cm.display.view;
        for (var i = 0; i < view.length; i++) {
            n -= view[i].size;
            if (n < 0) {
                return i;
            }
        }
    }

    // Updates the display.view data structure for a given change to the
    // document. From and to are in pre-change coordinates. Lendiff is
    // the amount of lines added or subtracted by the change. This is
    // used for changes that span multiple lines, or change the way
    // lines are divided into visual lines. regLineChange (below)
    // registers single-line changes.
    function regChange(cm, from, to, lendiff) {
        if (from == null) {
            from = cm.doc.first;
        }
        if (to == null) {
            to = cm.doc.first + cm.doc.size;
        }
        if (!lendiff) {
            lendiff = 0;
        }

        var display = cm.display;
        if (lendiff && to < display.viewTo && (display.updateLineNumbers == null || display.updateLineNumbers > from)) {
            display.updateLineNumbers = from;
        }

        cm.curOp.viewChanged = true;

        if (from >= display.viewTo) {
            // Change after
            if (sawCollapsedSpans && visualLineNo(cm.doc, from) < display.viewTo) {
                resetView(cm);
            }
        } else if (to <= display.viewFrom) {
            // Change before
            if (sawCollapsedSpans && visualLineEndNo(cm.doc, to + lendiff) > display.viewFrom) {
                resetView(cm);
            } else {
                display.viewFrom += lendiff;
                display.viewTo += lendiff;
            }
        } else if (from <= display.viewFrom && to >= display.viewTo) {
            // Full overlap
            resetView(cm);
        } else if (from <= display.viewFrom) {
            // Top overlap
            var cut = viewCuttingPoint(cm, to, to + lendiff, 1);
            if (cut) {
                display.view = display.view.slice(cut.index);
                display.viewFrom = cut.lineN;
                display.viewTo += lendiff;
            } else {
                resetView(cm);
            }
        } else if (to >= display.viewTo) {
            // Bottom overlap
            var cut$1 = viewCuttingPoint(cm, from, from, -1);
            if (cut$1) {
                display.view = display.view.slice(0, cut$1.index);
                display.viewTo = cut$1.lineN;
            } else {
                resetView(cm);
            }
        } else {
            // Gap in the middle
            var cutTop = viewCuttingPoint(cm, from, from, -1);
            var cutBot = viewCuttingPoint(cm, to, to + lendiff, 1);
            if (cutTop && cutBot) {
                display.view = display.view.slice(0, cutTop.index).concat(buildViewArray(cm, cutTop.lineN, cutBot.lineN)).concat(display.view.slice(cutBot.index));
                display.viewTo += lendiff;
            } else {
                resetView(cm);
            }
        }

        var ext = display.externalMeasured;
        if (ext) {
            if (to < ext.lineN) {
                ext.lineN += lendiff;
            } else if (from < ext.lineN + ext.size) {
                display.externalMeasured = null;
            }
        }
    }

    // Register a change to a single line. Type must be one of "text",
    // "gutter", "class", "widget"
    function regLineChange(cm, line, type) {
        cm.curOp.viewChanged = true;
        var display = cm.display,
            ext = cm.display.externalMeasured;
        if (ext && line >= ext.lineN && line < ext.lineN + ext.size) {
            display.externalMeasured = null;
        }

        if (line < display.viewFrom || line >= display.viewTo) {
            return;
        }
        var lineView = display.view[findViewIndex(cm, line)];
        if (lineView.node == null) {
            return;
        }
        var arr = lineView.changes || (lineView.changes = []);
        if (indexOf(arr, type) == -1) {
            arr.push(type);
        }
    }

    // Clear the view.
    function resetView(cm) {
        cm.display.viewFrom = cm.display.viewTo = cm.doc.first;
        cm.display.view = [];
        cm.display.viewOffset = 0;
    }

    function viewCuttingPoint(cm, oldN, newN, dir) {
        var index = findViewIndex(cm, oldN),
            diff,
            view = cm.display.view;
        if (!sawCollapsedSpans || newN == cm.doc.first + cm.doc.size) {
            return { index: index, lineN: newN };
        }
        var n = cm.display.viewFrom;
        for (var i = 0; i < index; i++) {
            n += view[i].size;
        }
        if (n != oldN) {
            if (dir > 0) {
                if (index == view.length - 1) {
                    return null;
                }
                diff = n + view[index].size - oldN;
                index++;
            } else {
                diff = n - oldN;
            }
            oldN += diff;newN += diff;
        }
        while (visualLineNo(cm.doc, newN) != newN) {
            if (index == (dir < 0 ? 0 : view.length - 1)) {
                return null;
            }
            newN += dir * view[index - (dir < 0 ? 1 : 0)].size;
            index += dir;
        }
        return { index: index, lineN: newN };
    }

    // Force the view to cover a given range, adding empty view element
    // or clipping off existing ones as needed.
    function adjustView(cm, from, to) {
        var display = cm.display,
            view = display.view;
        if (view.length == 0 || from >= display.viewTo || to <= display.viewFrom) {
            display.view = buildViewArray(cm, from, to);
            display.viewFrom = from;
        } else {
            if (display.viewFrom > from) {
                display.view = buildViewArray(cm, from, display.viewFrom).concat(display.view);
            } else if (display.viewFrom < from) {
                display.view = display.view.slice(findViewIndex(cm, from));
            }
            display.viewFrom = from;
            if (display.viewTo < to) {
                display.view = display.view.concat(buildViewArray(cm, display.viewTo, to));
            } else if (display.viewTo > to) {
                display.view = display.view.slice(0, findViewIndex(cm, to));
            }
        }
        display.viewTo = to;
    }

    // Count the number of lines in the view whose DOM representation is
    // out of date (or nonexistent).
    function countDirtyView(cm) {
        var view = cm.display.view,
            dirty = 0;
        for (var i = 0; i < view.length; i++) {
            var lineView = view[i];
            if (!lineView.hidden && (!lineView.node || lineView.changes)) {
                ++dirty;
            }
        }
        return dirty;
    }

    function updateSelection(cm) {
        cm.display.input.showSelection(cm.display.input.prepareSelection());
    }

    function prepareSelection(cm, primary) {
        if (primary === void 0) primary = true;

        var doc = cm.doc,
            result = {};
        var curFragment = result.cursors = document.createDocumentFragment();
        var selFragment = result.selection = document.createDocumentFragment();

        for (var i = 0; i < doc.sel.ranges.length; i++) {
            if (!primary && i == doc.sel.primIndex) {
                continue;
            }
            var range = doc.sel.ranges[i];
            if (range.from().line >= cm.display.viewTo || range.to().line < cm.display.viewFrom) {
                continue;
            }
            var collapsed = range.empty();
            if (collapsed || cm.options.showCursorWhenSelecting) {
                drawSelectionCursor(cm, range.head, curFragment);
            }
            if (!collapsed) {
                drawSelectionRange(cm, range, selFragment);
            }
        }
        return result;
    }

    // Draws a cursor for the given range
    function drawSelectionCursor(cm, head, output) {
        var pos = _cursorCoords(cm, head, "div", null, null, !cm.options.singleCursorHeightPerLine);

        var cursor = output.appendChild(elt("div", "\xA0", "CodeMirror-cursor"));
        cursor.style.left = pos.left + "px";
        cursor.style.top = pos.top + "px";
        cursor.style.height = Math.max(0, pos.bottom - pos.top) * cm.options.cursorHeight + "px";

        if (pos.other) {
            // Secondary cursor, shown when on a 'jump' in bi-directional text
            var otherCursor = output.appendChild(elt("div", "\xA0", "CodeMirror-cursor CodeMirror-secondarycursor"));
            otherCursor.style.display = "";
            otherCursor.style.left = pos.other.left + "px";
            otherCursor.style.top = pos.other.top + "px";
            otherCursor.style.height = (pos.other.bottom - pos.other.top) * .85 + "px";
        }
    }

    function cmpCoords(a, b) {
        return a.top - b.top || a.left - b.left;
    }

    // Draws the given range as a highlighted selection
    function drawSelectionRange(cm, range, output) {
        var display = cm.display,
            doc = cm.doc;
        var fragment = document.createDocumentFragment();
        var padding = paddingH(cm.display),
            leftSide = padding.left;
        var rightSide = Math.max(display.sizerWidth, displayWidth(cm) - display.sizer.offsetLeft) - padding.right;
        var docLTR = doc.direction == "ltr";

        function add(left, top, width, bottom) {
            if (top < 0) {
                top = 0;
            }
            top = Math.round(top);
            bottom = Math.round(bottom);
            fragment.appendChild(elt("div", null, "CodeMirror-selected", "position: absolute; left: " + left + "px;\n                             top: " + top + "px; width: " + (width == null ? rightSide - left : width) + "px;\n                             height: " + (bottom - top) + "px"));
        }

        function drawForLine(line, fromArg, toArg) {
            var lineObj = getLine(doc, line);
            var lineLen = lineObj.text.length;
            var start, end;
            function coords(ch, bias) {
                return _charCoords(cm, Pos(line, ch), "div", lineObj, bias);
            }

            function wrapX(pos, dir, side) {
                var extent = wrappedLineExtentChar(cm, lineObj, null, pos);
                var prop = dir == "ltr" == (side == "after") ? "left" : "right";
                var ch = side == "after" ? extent.begin : extent.end - (/\s/.test(lineObj.text.charAt(extent.end - 1)) ? 2 : 1);
                return coords(ch, prop)[prop];
            }

            var order = getOrder(lineObj, doc.direction);
            iterateBidiSections(order, fromArg || 0, toArg == null ? lineLen : toArg, function (from, to, dir, i) {
                var ltr = dir == "ltr";
                var fromPos = coords(from, ltr ? "left" : "right");
                var toPos = coords(to - 1, ltr ? "right" : "left");

                var openStart = fromArg == null && from == 0,
                    openEnd = toArg == null && to == lineLen;
                var first = i == 0,
                    last = !order || i == order.length - 1;
                if (toPos.top - fromPos.top <= 3) {
                    // Single line
                    var openLeft = (docLTR ? openStart : openEnd) && first;
                    var openRight = (docLTR ? openEnd : openStart) && last;
                    var left = openLeft ? leftSide : (ltr ? fromPos : toPos).left;
                    var right = openRight ? rightSide : (ltr ? toPos : fromPos).right;
                    add(left, fromPos.top, right - left, fromPos.bottom);
                } else {
                    // Multiple lines
                    var topLeft, topRight, botLeft, botRight;
                    if (ltr) {
                        topLeft = docLTR && openStart && first ? leftSide : fromPos.left;
                        topRight = docLTR ? rightSide : wrapX(from, dir, "before");
                        botLeft = docLTR ? leftSide : wrapX(to, dir, "after");
                        botRight = docLTR && openEnd && last ? rightSide : toPos.right;
                    } else {
                        topLeft = !docLTR ? leftSide : wrapX(from, dir, "before");
                        topRight = !docLTR && openStart && first ? rightSide : fromPos.right;
                        botLeft = !docLTR && openEnd && last ? leftSide : toPos.left;
                        botRight = !docLTR ? rightSide : wrapX(to, dir, "after");
                    }
                    add(topLeft, fromPos.top, topRight - topLeft, fromPos.bottom);
                    if (fromPos.bottom < toPos.top) {
                        add(leftSide, fromPos.bottom, null, toPos.top);
                    }
                    add(botLeft, toPos.top, botRight - botLeft, toPos.bottom);
                }

                if (!start || cmpCoords(fromPos, start) < 0) {
                    start = fromPos;
                }
                if (cmpCoords(toPos, start) < 0) {
                    start = toPos;
                }
                if (!end || cmpCoords(fromPos, end) < 0) {
                    end = fromPos;
                }
                if (cmpCoords(toPos, end) < 0) {
                    end = toPos;
                }
            });
            return { start: start, end: end };
        }

        var sFrom = range.from(),
            sTo = range.to();
        if (sFrom.line == sTo.line) {
            drawForLine(sFrom.line, sFrom.ch, sTo.ch);
        } else {
            var fromLine = getLine(doc, sFrom.line),
                toLine = getLine(doc, sTo.line);
            var singleVLine = visualLine(fromLine) == visualLine(toLine);
            var leftEnd = drawForLine(sFrom.line, sFrom.ch, singleVLine ? fromLine.text.length + 1 : null).end;
            var rightStart = drawForLine(sTo.line, singleVLine ? 0 : null, sTo.ch).start;
            if (singleVLine) {
                if (leftEnd.top < rightStart.top - 2) {
                    add(leftEnd.right, leftEnd.top, null, leftEnd.bottom);
                    add(leftSide, rightStart.top, rightStart.left, rightStart.bottom);
                } else {
                    add(leftEnd.right, leftEnd.top, rightStart.left - leftEnd.right, leftEnd.bottom);
                }
            }
            if (leftEnd.bottom < rightStart.top) {
                add(leftSide, leftEnd.bottom, null, rightStart.top);
            }
        }

        output.appendChild(fragment);
    }

    // Cursor-blinking
    function restartBlink(cm) {
        if (!cm.state.focused) {
            return;
        }
        var display = cm.display;
        clearInterval(display.blinker);
        var on = true;
        display.cursorDiv.style.visibility = "";
        if (cm.options.cursorBlinkRate > 0) {
            display.blinker = setInterval(function () {
                return display.cursorDiv.style.visibility = (on = !on) ? "" : "hidden";
            }, cm.options.cursorBlinkRate);
        } else if (cm.options.cursorBlinkRate < 0) {
            display.cursorDiv.style.visibility = "hidden";
        }
    }

    function ensureFocus(cm) {
        if (!cm.state.focused) {
            cm.display.input.focus();onFocus(cm);
        }
    }

    function delayBlurEvent(cm) {
        cm.state.delayingBlurEvent = true;
        setTimeout(function () {
            if (cm.state.delayingBlurEvent) {
                cm.state.delayingBlurEvent = false;
                onBlur(cm);
            }
        }, 100);
    }

    function onFocus(cm, e) {
        if (cm.state.delayingBlurEvent) {
            cm.state.delayingBlurEvent = false;
        }

        if (cm.options.readOnly == "nocursor") {
            return;
        }
        if (!cm.state.focused) {
            signal(cm, "focus", cm, e);
            cm.state.focused = true;
            addClass(cm.display.wrapper, "CodeMirror-focused");
            // This test prevents this from firing when a context
            // menu is closed (since the input reset would kill the
            // select-all detection hack)
            if (!cm.curOp && cm.display.selForContextMenu != cm.doc.sel) {
                cm.display.input.reset();
                if (webkit) {
                    setTimeout(function () {
                        return cm.display.input.reset(true);
                    }, 20);
                } // Issue #1730
            }
            cm.display.input.receivedFocus();
        }
        restartBlink(cm);
    }
    function onBlur(cm, e) {
        if (cm.state.delayingBlurEvent) {
            return;
        }

        if (cm.state.focused) {
            signal(cm, "blur", cm, e);
            cm.state.focused = false;
            rmClass(cm.display.wrapper, "CodeMirror-focused");
        }
        clearInterval(cm.display.blinker);
        setTimeout(function () {
            if (!cm.state.focused) {
                cm.display.shift = false;
            }
        }, 150);
    }

    // Read the actual heights of the rendered lines, and update their
    // stored heights to match.
    function updateHeightsInViewport(cm) {
        var display = cm.display;
        var prevBottom = display.lineDiv.offsetTop;
        for (var i = 0; i < display.view.length; i++) {
            var cur = display.view[i],
                wrapping = cm.options.lineWrapping;
            var height = void 0,
                width = 0;
            if (cur.hidden) {
                continue;
            }
            if (ie && ie_version < 8) {
                var bot = cur.node.offsetTop + cur.node.offsetHeight;
                height = bot - prevBottom;
                prevBottom = bot;
            } else {
                var box = cur.node.getBoundingClientRect();
                height = box.bottom - box.top;
                // Check that lines don't extend past the right of the current
                // editor width
                if (!wrapping && cur.text.firstChild) {
                    width = cur.text.firstChild.getBoundingClientRect().right - box.left - 1;
                }
            }
            var diff = cur.line.height - height;
            if (diff > .005 || diff < -.005) {
                updateLineHeight(cur.line, height);
                updateWidgetHeight(cur.line);
                if (cur.rest) {
                    for (var j = 0; j < cur.rest.length; j++) {
                        updateWidgetHeight(cur.rest[j]);
                    }
                }
            }
            if (width > cm.display.sizerWidth) {
                var chWidth = Math.ceil(width / charWidth(cm.display));
                if (chWidth > cm.display.maxLineLength) {
                    cm.display.maxLineLength = chWidth;
                    cm.display.maxLine = cur.line;
                    cm.display.maxLineChanged = true;
                }
            }
        }
    }

    // Read and store the height of line widgets associated with the
    // given line.
    function updateWidgetHeight(line) {
        if (line.widgets) {
            for (var i = 0; i < line.widgets.length; ++i) {
                var w = line.widgets[i],
                    parent = w.node.parentNode;
                if (parent) {
                    w.height = parent.offsetHeight;
                }
            }
        }
    }

    // Compute the lines that are visible in a given viewport (defaults
    // the the current scroll position). viewport may contain top,
    // height, and ensure (see op.scrollToPos) properties.
    function visibleLines(display, doc, viewport) {
        var top = viewport && viewport.top != null ? Math.max(0, viewport.top) : display.scroller.scrollTop;
        top = Math.floor(top - paddingTop(display));
        var bottom = viewport && viewport.bottom != null ? viewport.bottom : top + display.wrapper.clientHeight;

        var from = _lineAtHeight(doc, top),
            to = _lineAtHeight(doc, bottom);
        // Ensure is a {from: {line, ch}, to: {line, ch}} object, and
        // forces those lines into the viewport (if possible).
        if (viewport && viewport.ensure) {
            var ensureFrom = viewport.ensure.from.line,
                ensureTo = viewport.ensure.to.line;
            if (ensureFrom < from) {
                from = ensureFrom;
                to = _lineAtHeight(doc, _heightAtLine(getLine(doc, ensureFrom)) + display.wrapper.clientHeight);
            } else if (Math.min(ensureTo, doc.lastLine()) >= to) {
                from = _lineAtHeight(doc, _heightAtLine(getLine(doc, ensureTo)) - display.wrapper.clientHeight);
                to = ensureTo;
            }
        }
        return { from: from, to: Math.max(to, from + 1) };
    }

    // SCROLLING THINGS INTO VIEW

    // If an editor sits on the top or bottom of the window, partially
    // scrolled out of view, this ensures that the cursor is visible.
    function maybeScrollWindow(cm, rect) {
        if (signalDOMEvent(cm, "scrollCursorIntoView")) {
            return;
        }

        var display = cm.display,
            box = display.sizer.getBoundingClientRect(),
            doScroll = null;
        if (rect.top + box.top < 0) {
            doScroll = true;
        } else if (rect.bottom + box.top > (window.innerHeight || document.documentElement.clientHeight)) {
            doScroll = false;
        }
        if (doScroll != null && !phantom) {
            var scrollNode = elt("div", "\u200B", null, "position: absolute;\n                         top: " + (rect.top - display.viewOffset - paddingTop(cm.display)) + "px;\n                         height: " + (rect.bottom - rect.top + scrollGap(cm) + display.barHeight) + "px;\n                         left: " + rect.left + "px; width: " + Math.max(2, rect.right - rect.left) + "px;");
            cm.display.lineSpace.appendChild(scrollNode);
            scrollNode.scrollIntoView(doScroll);
            cm.display.lineSpace.removeChild(scrollNode);
        }
    }

    // Scroll a given position into view (immediately), verifying that
    // it actually became visible (as line heights are accurately
    // measured, the position of something may 'drift' during drawing).
    function scrollPosIntoView(cm, pos, end, margin) {
        if (margin == null) {
            margin = 0;
        }
        var rect;
        if (!cm.options.lineWrapping && pos == end) {
            // Set pos and end to the cursor positions around the character pos sticks to
            // If pos.sticky == "before", that is around pos.ch - 1, otherwise around pos.ch
            // If pos == Pos(_, 0, "before"), pos and end are unchanged
            pos = pos.ch ? Pos(pos.line, pos.sticky == "before" ? pos.ch - 1 : pos.ch, "after") : pos;
            end = pos.sticky == "before" ? Pos(pos.line, pos.ch + 1, "before") : pos;
        }
        for (var limit = 0; limit < 5; limit++) {
            var changed = false;
            var coords = _cursorCoords(cm, pos);
            var endCoords = !end || end == pos ? coords : _cursorCoords(cm, end);
            rect = { left: Math.min(coords.left, endCoords.left),
                top: Math.min(coords.top, endCoords.top) - margin,
                right: Math.max(coords.left, endCoords.left),
                bottom: Math.max(coords.bottom, endCoords.bottom) + margin };
            var scrollPos = calculateScrollPos(cm, rect);
            var startTop = cm.doc.scrollTop,
                startLeft = cm.doc.scrollLeft;
            if (scrollPos.scrollTop != null) {
                updateScrollTop(cm, scrollPos.scrollTop);
                if (Math.abs(cm.doc.scrollTop - startTop) > 1) {
                    changed = true;
                }
            }
            if (scrollPos.scrollLeft != null) {
                setScrollLeft(cm, scrollPos.scrollLeft);
                if (Math.abs(cm.doc.scrollLeft - startLeft) > 1) {
                    changed = true;
                }
            }
            if (!changed) {
                break;
            }
        }
        return rect;
    }

    // Scroll a given set of coordinates into view (immediately).
    function scrollIntoView(cm, rect) {
        var scrollPos = calculateScrollPos(cm, rect);
        if (scrollPos.scrollTop != null) {
            updateScrollTop(cm, scrollPos.scrollTop);
        }
        if (scrollPos.scrollLeft != null) {
            setScrollLeft(cm, scrollPos.scrollLeft);
        }
    }

    // Calculate a new scroll position needed to scroll the given
    // rectangle into view. Returns an object with scrollTop and
    // scrollLeft properties. When these are undefined, the
    // vertical/horizontal position does not need to be adjusted.
    function calculateScrollPos(cm, rect) {
        var display = cm.display,
            snapMargin = textHeight(cm.display);
        if (rect.top < 0) {
            rect.top = 0;
        }
        var screentop = cm.curOp && cm.curOp.scrollTop != null ? cm.curOp.scrollTop : display.scroller.scrollTop;
        var screen = displayHeight(cm),
            result = {};
        if (rect.bottom - rect.top > screen) {
            rect.bottom = rect.top + screen;
        }
        var docBottom = cm.doc.height + paddingVert(display);
        var atTop = rect.top < snapMargin,
            atBottom = rect.bottom > docBottom - snapMargin;
        if (rect.top < screentop) {
            result.scrollTop = atTop ? 0 : rect.top;
        } else if (rect.bottom > screentop + screen) {
            var newTop = Math.min(rect.top, (atBottom ? docBottom : rect.bottom) - screen);
            if (newTop != screentop) {
                result.scrollTop = newTop;
            }
        }

        var screenleft = cm.curOp && cm.curOp.scrollLeft != null ? cm.curOp.scrollLeft : display.scroller.scrollLeft;
        var screenw = displayWidth(cm) - (cm.options.fixedGutter ? display.gutters.offsetWidth : 0);
        var tooWide = rect.right - rect.left > screenw;
        if (tooWide) {
            rect.right = rect.left + screenw;
        }
        if (rect.left < 10) {
            result.scrollLeft = 0;
        } else if (rect.left < screenleft) {
            result.scrollLeft = Math.max(0, rect.left - (tooWide ? 0 : 10));
        } else if (rect.right > screenw + screenleft - 3) {
            result.scrollLeft = rect.right + (tooWide ? 0 : 10) - screenw;
        }
        return result;
    }

    // Store a relative adjustment to the scroll position in the current
    // operation (to be applied when the operation finishes).
    function addToScrollTop(cm, top) {
        if (top == null) {
            return;
        }
        resolveScrollToPos(cm);
        cm.curOp.scrollTop = (cm.curOp.scrollTop == null ? cm.doc.scrollTop : cm.curOp.scrollTop) + top;
    }

    // Make sure that at the end of the operation the current cursor is
    // shown.
    function ensureCursorVisible(cm) {
        resolveScrollToPos(cm);
        var cur = cm.getCursor();
        cm.curOp.scrollToPos = { from: cur, to: cur, margin: cm.options.cursorScrollMargin };
    }

    function scrollToCoords(cm, x, y) {
        if (x != null || y != null) {
            resolveScrollToPos(cm);
        }
        if (x != null) {
            cm.curOp.scrollLeft = x;
        }
        if (y != null) {
            cm.curOp.scrollTop = y;
        }
    }

    function scrollToRange(cm, range) {
        resolveScrollToPos(cm);
        cm.curOp.scrollToPos = range;
    }

    // When an operation has its scrollToPos property set, and another
    // scroll action is applied before the end of the operation, this
    // 'simulates' scrolling that position into view in a cheap way, so
    // that the effect of intermediate scroll commands is not ignored.
    function resolveScrollToPos(cm) {
        var range = cm.curOp.scrollToPos;
        if (range) {
            cm.curOp.scrollToPos = null;
            var from = estimateCoords(cm, range.from),
                to = estimateCoords(cm, range.to);
            scrollToCoordsRange(cm, from, to, range.margin);
        }
    }

    function scrollToCoordsRange(cm, from, to, margin) {
        var sPos = calculateScrollPos(cm, {
            left: Math.min(from.left, to.left),
            top: Math.min(from.top, to.top) - margin,
            right: Math.max(from.right, to.right),
            bottom: Math.max(from.bottom, to.bottom) + margin
        });
        scrollToCoords(cm, sPos.scrollLeft, sPos.scrollTop);
    }

    // Sync the scrollable area and scrollbars, ensure the viewport
    // covers the visible area.
    function updateScrollTop(cm, val) {
        if (Math.abs(cm.doc.scrollTop - val) < 2) {
            return;
        }
        if (!gecko) {
            updateDisplaySimple(cm, { top: val });
        }
        setScrollTop(cm, val, true);
        if (gecko) {
            updateDisplaySimple(cm);
        }
        startWorker(cm, 100);
    }

    function setScrollTop(cm, val, forceScroll) {
        val = Math.min(cm.display.scroller.scrollHeight - cm.display.scroller.clientHeight, val);
        if (cm.display.scroller.scrollTop == val && !forceScroll) {
            return;
        }
        cm.doc.scrollTop = val;
        cm.display.scrollbars.setScrollTop(val);
        if (cm.display.scroller.scrollTop != val) {
            cm.display.scroller.scrollTop = val;
        }
    }

    // Sync scroller and scrollbar, ensure the gutter elements are
    // aligned.
    function setScrollLeft(cm, val, isScroller, forceScroll) {
        val = Math.min(val, cm.display.scroller.scrollWidth - cm.display.scroller.clientWidth);
        if ((isScroller ? val == cm.doc.scrollLeft : Math.abs(cm.doc.scrollLeft - val) < 2) && !forceScroll) {
            return;
        }
        cm.doc.scrollLeft = val;
        alignHorizontally(cm);
        if (cm.display.scroller.scrollLeft != val) {
            cm.display.scroller.scrollLeft = val;
        }
        cm.display.scrollbars.setScrollLeft(val);
    }

    // SCROLLBARS

    // Prepare DOM reads needed to update the scrollbars. Done in one
    // shot to minimize update/measure roundtrips.
    function measureForScrollbars(cm) {
        var d = cm.display,
            gutterW = d.gutters.offsetWidth;
        var docH = Math.round(cm.doc.height + paddingVert(cm.display));
        return {
            clientHeight: d.scroller.clientHeight,
            viewHeight: d.wrapper.clientHeight,
            scrollWidth: d.scroller.scrollWidth, clientWidth: d.scroller.clientWidth,
            viewWidth: d.wrapper.clientWidth,
            barLeft: cm.options.fixedGutter ? gutterW : 0,
            docHeight: docH,
            scrollHeight: docH + scrollGap(cm) + d.barHeight,
            nativeBarWidth: d.nativeBarWidth,
            gutterWidth: gutterW
        };
    }

    var NativeScrollbars = function NativeScrollbars(place, scroll, cm) {
        this.cm = cm;
        var vert = this.vert = elt("div", [elt("div", null, null, "min-width: 1px")], "CodeMirror-vscrollbar");
        var horiz = this.horiz = elt("div", [elt("div", null, null, "height: 100%; min-height: 1px")], "CodeMirror-hscrollbar");
        vert.tabIndex = horiz.tabIndex = -1;
        place(vert);place(horiz);

        on(vert, "scroll", function () {
            if (vert.clientHeight) {
                scroll(vert.scrollTop, "vertical");
            }
        });
        on(horiz, "scroll", function () {
            if (horiz.clientWidth) {
                scroll(horiz.scrollLeft, "horizontal");
            }
        });

        this.checkedZeroWidth = false;
        // Need to set a minimum width to see the scrollbar on IE7 (but must not set it on IE8).
        if (ie && ie_version < 8) {
            this.horiz.style.minHeight = this.vert.style.minWidth = "18px";
        }
    };

    NativeScrollbars.prototype.update = function (measure) {
        var needsH = measure.scrollWidth > measure.clientWidth + 1;
        var needsV = measure.scrollHeight > measure.clientHeight + 1;
        var sWidth = measure.nativeBarWidth;

        if (needsV) {
            this.vert.style.display = "block";
            this.vert.style.bottom = needsH ? sWidth + "px" : "0";
            var totalHeight = measure.viewHeight - (needsH ? sWidth : 0);
            // A bug in IE8 can cause this value to be negative, so guard it.
            this.vert.firstChild.style.height = Math.max(0, measure.scrollHeight - measure.clientHeight + totalHeight) + "px";
        } else {
            this.vert.style.display = "";
            this.vert.firstChild.style.height = "0";
        }

        if (needsH) {
            this.horiz.style.display = "block";
            this.horiz.style.right = needsV ? sWidth + "px" : "0";
            this.horiz.style.left = measure.barLeft + "px";
            var totalWidth = measure.viewWidth - measure.barLeft - (needsV ? sWidth : 0);
            this.horiz.firstChild.style.width = Math.max(0, measure.scrollWidth - measure.clientWidth + totalWidth) + "px";
        } else {
            this.horiz.style.display = "";
            this.horiz.firstChild.style.width = "0";
        }

        if (!this.checkedZeroWidth && measure.clientHeight > 0) {
            if (sWidth == 0) {
                this.zeroWidthHack();
            }
            this.checkedZeroWidth = true;
        }

        return { right: needsV ? sWidth : 0, bottom: needsH ? sWidth : 0 };
    };

    NativeScrollbars.prototype.setScrollLeft = function (pos) {
        if (this.horiz.scrollLeft != pos) {
            this.horiz.scrollLeft = pos;
        }
        if (this.disableHoriz) {
            this.enableZeroWidthBar(this.horiz, this.disableHoriz, "horiz");
        }
    };

    NativeScrollbars.prototype.setScrollTop = function (pos) {
        if (this.vert.scrollTop != pos) {
            this.vert.scrollTop = pos;
        }
        if (this.disableVert) {
            this.enableZeroWidthBar(this.vert, this.disableVert, "vert");
        }
    };

    NativeScrollbars.prototype.zeroWidthHack = function () {
        var w = mac && !mac_geMountainLion ? "12px" : "18px";
        this.horiz.style.height = this.vert.style.width = w;
        this.horiz.style.pointerEvents = this.vert.style.pointerEvents = "none";
        this.disableHoriz = new Delayed();
        this.disableVert = new Delayed();
    };

    NativeScrollbars.prototype.enableZeroWidthBar = function (bar, delay, type) {
        bar.style.pointerEvents = "auto";
        function maybeDisable() {
            // To find out whether the scrollbar is still visible, we
            // check whether the element under the pixel in the bottom
            // right corner of the scrollbar box is the scrollbar box
            // itself (when the bar is still visible) or its filler child
            // (when the bar is hidden). If it is still visible, we keep
            // it enabled, if it's hidden, we disable pointer events.
            var box = bar.getBoundingClientRect();
            var elt = type == "vert" ? document.elementFromPoint(box.right - 1, (box.top + box.bottom) / 2) : document.elementFromPoint((box.right + box.left) / 2, box.bottom - 1);
            if (elt != bar) {
                bar.style.pointerEvents = "none";
            } else {
                delay.set(1000, maybeDisable);
            }
        }
        delay.set(1000, maybeDisable);
    };

    NativeScrollbars.prototype.clear = function () {
        var parent = this.horiz.parentNode;
        parent.removeChild(this.horiz);
        parent.removeChild(this.vert);
    };

    var NullScrollbars = function NullScrollbars() {};

    NullScrollbars.prototype.update = function () {
        return { bottom: 0, right: 0 };
    };
    NullScrollbars.prototype.setScrollLeft = function () {};
    NullScrollbars.prototype.setScrollTop = function () {};
    NullScrollbars.prototype.clear = function () {};

    function updateScrollbars(cm, measure) {
        if (!measure) {
            measure = measureForScrollbars(cm);
        }
        var startWidth = cm.display.barWidth,
            startHeight = cm.display.barHeight;
        updateScrollbarsInner(cm, measure);
        for (var i = 0; i < 4 && startWidth != cm.display.barWidth || startHeight != cm.display.barHeight; i++) {
            if (startWidth != cm.display.barWidth && cm.options.lineWrapping) {
                updateHeightsInViewport(cm);
            }
            updateScrollbarsInner(cm, measureForScrollbars(cm));
            startWidth = cm.display.barWidth;startHeight = cm.display.barHeight;
        }
    }

    // Re-synchronize the fake scrollbars with the actual size of the
    // content.
    function updateScrollbarsInner(cm, measure) {
        var d = cm.display;
        var sizes = d.scrollbars.update(measure);

        d.sizer.style.paddingRight = (d.barWidth = sizes.right) + "px";
        d.sizer.style.paddingBottom = (d.barHeight = sizes.bottom) + "px";
        d.heightForcer.style.borderBottom = sizes.bottom + "px solid transparent";

        if (sizes.right && sizes.bottom) {
            d.scrollbarFiller.style.display = "block";
            d.scrollbarFiller.style.height = sizes.bottom + "px";
            d.scrollbarFiller.style.width = sizes.right + "px";
        } else {
            d.scrollbarFiller.style.display = "";
        }
        if (sizes.bottom && cm.options.coverGutterNextToScrollbar && cm.options.fixedGutter) {
            d.gutterFiller.style.display = "block";
            d.gutterFiller.style.height = sizes.bottom + "px";
            d.gutterFiller.style.width = measure.gutterWidth + "px";
        } else {
            d.gutterFiller.style.display = "";
        }
    }

    var scrollbarModel = { "native": NativeScrollbars, "null": NullScrollbars };

    function initScrollbars(cm) {
        if (cm.display.scrollbars) {
            cm.display.scrollbars.clear();
            if (cm.display.scrollbars.addClass) {
                rmClass(cm.display.wrapper, cm.display.scrollbars.addClass);
            }
        }

        cm.display.scrollbars = new scrollbarModel[cm.options.scrollbarStyle](function (node) {
            cm.display.wrapper.insertBefore(node, cm.display.scrollbarFiller);
            // Prevent clicks in the scrollbars from killing focus
            on(node, "mousedown", function () {
                if (cm.state.focused) {
                    setTimeout(function () {
                        return cm.display.input.focus();
                    }, 0);
                }
            });
            node.setAttribute("cm-not-content", "true");
        }, function (pos, axis) {
            if (axis == "horizontal") {
                setScrollLeft(cm, pos);
            } else {
                updateScrollTop(cm, pos);
            }
        }, cm);
        if (cm.display.scrollbars.addClass) {
            addClass(cm.display.wrapper, cm.display.scrollbars.addClass);
        }
    }

    // Operations are used to wrap a series of changes to the editor
    // state in such a way that each change won't have to update the
    // cursor and display (which would be awkward, slow, and
    // error-prone). Instead, display updates are batched and then all
    // combined and executed at once.

    var nextOpId = 0;
    // Start a new operation.
    function _startOperation(cm) {
        cm.curOp = {
            cm: cm,
            viewChanged: false, // Flag that indicates that lines might need to be redrawn
            startHeight: cm.doc.height, // Used to detect need to update scrollbar
            forceUpdate: false, // Used to force a redraw
            updateInput: 0, // Whether to reset the input textarea
            typing: false, // Whether this reset should be careful to leave existing text (for compositing)
            changeObjs: null, // Accumulated changes, for firing change events
            cursorActivityHandlers: null, // Set of handlers to fire cursorActivity on
            cursorActivityCalled: 0, // Tracks which cursorActivity handlers have been called already
            selectionChanged: false, // Whether the selection needs to be redrawn
            updateMaxLine: false, // Set when the widest line needs to be determined anew
            scrollLeft: null, scrollTop: null, // Intermediate scroll position, not pushed to DOM yet
            scrollToPos: null, // Used to scroll to a specific position
            focus: false,
            id: ++nextOpId // Unique ID
        };
        pushOperation(cm.curOp);
    }

    // Finish an operation, updating the display and signalling delayed events
    function _endOperation(cm) {
        var op = cm.curOp;
        if (op) {
            finishOperation(op, function (group) {
                for (var i = 0; i < group.ops.length; i++) {
                    group.ops[i].cm.curOp = null;
                }
                endOperations(group);
            });
        }
    }

    // The DOM updates done when an operation finishes are batched so
    // that the minimum number of relayouts are required.
    function endOperations(group) {
        var ops = group.ops;
        for (var i = 0; i < ops.length; i++) // Read DOM
        {
            endOperation_R1(ops[i]);
        }
        for (var i$1 = 0; i$1 < ops.length; i$1++) // Write DOM (maybe)
        {
            endOperation_W1(ops[i$1]);
        }
        for (var i$2 = 0; i$2 < ops.length; i$2++) // Read DOM
        {
            endOperation_R2(ops[i$2]);
        }
        for (var i$3 = 0; i$3 < ops.length; i$3++) // Write DOM (maybe)
        {
            endOperation_W2(ops[i$3]);
        }
        for (var i$4 = 0; i$4 < ops.length; i$4++) // Read DOM
        {
            endOperation_finish(ops[i$4]);
        }
    }

    function endOperation_R1(op) {
        var cm = op.cm,
            display = cm.display;
        maybeClipScrollbars(cm);
        if (op.updateMaxLine) {
            findMaxLine(cm);
        }

        op.mustUpdate = op.viewChanged || op.forceUpdate || op.scrollTop != null || op.scrollToPos && (op.scrollToPos.from.line < display.viewFrom || op.scrollToPos.to.line >= display.viewTo) || display.maxLineChanged && cm.options.lineWrapping;
        op.update = op.mustUpdate && new DisplayUpdate(cm, op.mustUpdate && { top: op.scrollTop, ensure: op.scrollToPos }, op.forceUpdate);
    }

    function endOperation_W1(op) {
        op.updatedDisplay = op.mustUpdate && updateDisplayIfNeeded(op.cm, op.update);
    }

    function endOperation_R2(op) {
        var cm = op.cm,
            display = cm.display;
        if (op.updatedDisplay) {
            updateHeightsInViewport(cm);
        }

        op.barMeasure = measureForScrollbars(cm);

        // If the max line changed since it was last measured, measure it,
        // and ensure the document's width matches it.
        // updateDisplay_W2 will use these properties to do the actual resizing
        if (display.maxLineChanged && !cm.options.lineWrapping) {
            op.adjustWidthTo = measureChar(cm, display.maxLine, display.maxLine.text.length).left + 3;
            cm.display.sizerWidth = op.adjustWidthTo;
            op.barMeasure.scrollWidth = Math.max(display.scroller.clientWidth, display.sizer.offsetLeft + op.adjustWidthTo + scrollGap(cm) + cm.display.barWidth);
            op.maxScrollLeft = Math.max(0, display.sizer.offsetLeft + op.adjustWidthTo - displayWidth(cm));
        }

        if (op.updatedDisplay || op.selectionChanged) {
            op.preparedSelection = display.input.prepareSelection();
        }
    }

    function endOperation_W2(op) {
        var cm = op.cm;

        if (op.adjustWidthTo != null) {
            cm.display.sizer.style.minWidth = op.adjustWidthTo + "px";
            if (op.maxScrollLeft < cm.doc.scrollLeft) {
                setScrollLeft(cm, Math.min(cm.display.scroller.scrollLeft, op.maxScrollLeft), true);
            }
            cm.display.maxLineChanged = false;
        }

        var takeFocus = op.focus && op.focus == activeElt();
        if (op.preparedSelection) {
            cm.display.input.showSelection(op.preparedSelection, takeFocus);
        }
        if (op.updatedDisplay || op.startHeight != cm.doc.height) {
            updateScrollbars(cm, op.barMeasure);
        }
        if (op.updatedDisplay) {
            setDocumentHeight(cm, op.barMeasure);
        }

        if (op.selectionChanged) {
            restartBlink(cm);
        }

        if (cm.state.focused && op.updateInput) {
            cm.display.input.reset(op.typing);
        }
        if (takeFocus) {
            ensureFocus(op.cm);
        }
    }

    function endOperation_finish(op) {
        var cm = op.cm,
            display = cm.display,
            doc = cm.doc;

        if (op.updatedDisplay) {
            postUpdateDisplay(cm, op.update);
        }

        // Abort mouse wheel delta measurement, when scrolling explicitly
        if (display.wheelStartX != null && (op.scrollTop != null || op.scrollLeft != null || op.scrollToPos)) {
            display.wheelStartX = display.wheelStartY = null;
        }

        // Propagate the scroll position to the actual DOM scroller
        if (op.scrollTop != null) {
            setScrollTop(cm, op.scrollTop, op.forceScroll);
        }

        if (op.scrollLeft != null) {
            setScrollLeft(cm, op.scrollLeft, true, true);
        }
        // If we need to scroll a specific position into view, do so.
        if (op.scrollToPos) {
            var rect = scrollPosIntoView(cm, _clipPos(doc, op.scrollToPos.from), _clipPos(doc, op.scrollToPos.to), op.scrollToPos.margin);
            maybeScrollWindow(cm, rect);
        }

        // Fire events for markers that are hidden/unidden by editing or
        // undoing
        var hidden = op.maybeHiddenMarkers,
            unhidden = op.maybeUnhiddenMarkers;
        if (hidden) {
            for (var i = 0; i < hidden.length; ++i) {
                if (!hidden[i].lines.length) {
                    signal(hidden[i], "hide");
                }
            }
        }
        if (unhidden) {
            for (var i$1 = 0; i$1 < unhidden.length; ++i$1) {
                if (unhidden[i$1].lines.length) {
                    signal(unhidden[i$1], "unhide");
                }
            }
        }

        if (display.wrapper.offsetHeight) {
            doc.scrollTop = cm.display.scroller.scrollTop;
        }

        // Fire change events, and delayed event handlers
        if (op.changeObjs) {
            signal(cm, "changes", cm, op.changeObjs);
        }
        if (op.update) {
            op.update.finish();
        }
    }

    // Run the given function in an operation
    function runInOp(cm, f) {
        if (cm.curOp) {
            return f();
        }
        _startOperation(cm);
        try {
            return f();
        } finally {
            _endOperation(cm);
        }
    }
    // Wraps a function in an operation. Returns the wrapped function.
    function operation(cm, f) {
        return function () {
            if (cm.curOp) {
                return f.apply(cm, arguments);
            }
            _startOperation(cm);
            try {
                return f.apply(cm, arguments);
            } finally {
                _endOperation(cm);
            }
        };
    }
    // Used to add methods to editor and doc instances, wrapping them in
    // operations.
    function methodOp(f) {
        return function () {
            if (this.curOp) {
                return f.apply(this, arguments);
            }
            _startOperation(this);
            try {
                return f.apply(this, arguments);
            } finally {
                _endOperation(this);
            }
        };
    }
    function docMethodOp(f) {
        return function () {
            var cm = this.cm;
            if (!cm || cm.curOp) {
                return f.apply(this, arguments);
            }
            _startOperation(cm);
            try {
                return f.apply(this, arguments);
            } finally {
                _endOperation(cm);
            }
        };
    }

    // HIGHLIGHT WORKER

    function startWorker(cm, time) {
        if (cm.doc.highlightFrontier < cm.display.viewTo) {
            cm.state.highlight.set(time, bind(highlightWorker, cm));
        }
    }

    function highlightWorker(cm) {
        var doc = cm.doc;
        if (doc.highlightFrontier >= cm.display.viewTo) {
            return;
        }
        var end = +new Date() + cm.options.workTime;
        var context = getContextBefore(cm, doc.highlightFrontier);
        var changedLines = [];

        doc.iter(context.line, Math.min(doc.first + doc.size, cm.display.viewTo + 500), function (line) {
            if (context.line >= cm.display.viewFrom) {
                // Visible
                var oldStyles = line.styles;
                var resetState = line.text.length > cm.options.maxHighlightLength ? copyState(doc.mode, context.state) : null;
                var highlighted = highlightLine(cm, line, context, true);
                if (resetState) {
                    context.state = resetState;
                }
                line.styles = highlighted.styles;
                var oldCls = line.styleClasses,
                    newCls = highlighted.classes;
                if (newCls) {
                    line.styleClasses = newCls;
                } else if (oldCls) {
                    line.styleClasses = null;
                }
                var ischange = !oldStyles || oldStyles.length != line.styles.length || oldCls != newCls && (!oldCls || !newCls || oldCls.bgClass != newCls.bgClass || oldCls.textClass != newCls.textClass);
                for (var i = 0; !ischange && i < oldStyles.length; ++i) {
                    ischange = oldStyles[i] != line.styles[i];
                }
                if (ischange) {
                    changedLines.push(context.line);
                }
                line.stateAfter = context.save();
                context.nextLine();
            } else {
                if (line.text.length <= cm.options.maxHighlightLength) {
                    processLine(cm, line.text, context);
                }
                line.stateAfter = context.line % 5 == 0 ? context.save() : null;
                context.nextLine();
            }
            if (+new Date() > end) {
                startWorker(cm, cm.options.workDelay);
                return true;
            }
        });
        doc.highlightFrontier = context.line;
        doc.modeFrontier = Math.max(doc.modeFrontier, context.line);
        if (changedLines.length) {
            runInOp(cm, function () {
                for (var i = 0; i < changedLines.length; i++) {
                    regLineChange(cm, changedLines[i], "text");
                }
            });
        }
    }

    // DISPLAY DRAWING

    var DisplayUpdate = function DisplayUpdate(cm, viewport, force) {
        var display = cm.display;

        this.viewport = viewport;
        // Store some values that we'll need later (but don't want to force a relayout for)
        this.visible = visibleLines(display, cm.doc, viewport);
        this.editorIsHidden = !display.wrapper.offsetWidth;
        this.wrapperHeight = display.wrapper.clientHeight;
        this.wrapperWidth = display.wrapper.clientWidth;
        this.oldDisplayWidth = displayWidth(cm);
        this.force = force;
        this.dims = getDimensions(cm);
        this.events = [];
    };

    DisplayUpdate.prototype.signal = function (emitter, type) {
        if (hasHandler(emitter, type)) {
            this.events.push(arguments);
        }
    };
    DisplayUpdate.prototype.finish = function () {
        for (var i = 0; i < this.events.length; i++) {
            signal.apply(null, this.events[i]);
        }
    };

    function maybeClipScrollbars(cm) {
        var display = cm.display;
        if (!display.scrollbarsClipped && display.scroller.offsetWidth) {
            display.nativeBarWidth = display.scroller.offsetWidth - display.scroller.clientWidth;
            display.heightForcer.style.height = scrollGap(cm) + "px";
            display.sizer.style.marginBottom = -display.nativeBarWidth + "px";
            display.sizer.style.borderRightWidth = scrollGap(cm) + "px";
            display.scrollbarsClipped = true;
        }
    }

    function selectionSnapshot(cm) {
        if (cm.hasFocus()) {
            return null;
        }
        var active = activeElt();
        if (!active || !contains(cm.display.lineDiv, active)) {
            return null;
        }
        var result = { activeElt: active };
        if (window.getSelection) {
            var sel = window.getSelection();
            if (sel.anchorNode && sel.extend && contains(cm.display.lineDiv, sel.anchorNode)) {
                result.anchorNode = sel.anchorNode;
                result.anchorOffset = sel.anchorOffset;
                result.focusNode = sel.focusNode;
                result.focusOffset = sel.focusOffset;
            }
        }
        return result;
    }

    function restoreSelection(snapshot) {
        if (!snapshot || !snapshot.activeElt || snapshot.activeElt == activeElt()) {
            return;
        }
        snapshot.activeElt.focus();
        if (snapshot.anchorNode && contains(document.body, snapshot.anchorNode) && contains(document.body, snapshot.focusNode)) {
            var sel = window.getSelection(),
                range = document.createRange();
            range.setEnd(snapshot.anchorNode, snapshot.anchorOffset);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
            sel.extend(snapshot.focusNode, snapshot.focusOffset);
        }
    }

    // Does the actual updating of the line display. Bails out
    // (returning false) when there is nothing to be done and forced is
    // false.
    function updateDisplayIfNeeded(cm, update) {
        var display = cm.display,
            doc = cm.doc;

        if (update.editorIsHidden) {
            resetView(cm);
            return false;
        }

        // Bail out if the visible area is already rendered and nothing changed.
        if (!update.force && update.visible.from >= display.viewFrom && update.visible.to <= display.viewTo && (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo) && display.renderedView == display.view && countDirtyView(cm) == 0) {
            return false;
        }

        if (maybeUpdateLineNumberWidth(cm)) {
            resetView(cm);
            update.dims = getDimensions(cm);
        }

        // Compute a suitable new viewport (from & to)
        var end = doc.first + doc.size;
        var from = Math.max(update.visible.from - cm.options.viewportMargin, doc.first);
        var to = Math.min(end, update.visible.to + cm.options.viewportMargin);
        if (display.viewFrom < from && from - display.viewFrom < 20) {
            from = Math.max(doc.first, display.viewFrom);
        }
        if (display.viewTo > to && display.viewTo - to < 20) {
            to = Math.min(end, display.viewTo);
        }
        if (sawCollapsedSpans) {
            from = visualLineNo(cm.doc, from);
            to = visualLineEndNo(cm.doc, to);
        }

        var different = from != display.viewFrom || to != display.viewTo || display.lastWrapHeight != update.wrapperHeight || display.lastWrapWidth != update.wrapperWidth;
        adjustView(cm, from, to);

        display.viewOffset = _heightAtLine(getLine(cm.doc, display.viewFrom));
        // Position the mover div to align with the current scroll position
        cm.display.mover.style.top = display.viewOffset + "px";

        var toUpdate = countDirtyView(cm);
        if (!different && toUpdate == 0 && !update.force && display.renderedView == display.view && (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo)) {
            return false;
        }

        // For big changes, we hide the enclosing element during the
        // update, since that speeds up the operations on most browsers.
        var selSnapshot = selectionSnapshot(cm);
        if (toUpdate > 4) {
            display.lineDiv.style.display = "none";
        }
        patchDisplay(cm, display.updateLineNumbers, update.dims);
        if (toUpdate > 4) {
            display.lineDiv.style.display = "";
        }
        display.renderedView = display.view;
        // There might have been a widget with a focused element that got
        // hidden or updated, if so re-focus it.
        restoreSelection(selSnapshot);

        // Prevent selection and cursors from interfering with the scroll
        // width and height.
        removeChildren(display.cursorDiv);
        removeChildren(display.selectionDiv);
        display.gutters.style.height = display.sizer.style.minHeight = 0;

        if (different) {
            display.lastWrapHeight = update.wrapperHeight;
            display.lastWrapWidth = update.wrapperWidth;
            startWorker(cm, 400);
        }

        display.updateLineNumbers = null;

        return true;
    }

    function postUpdateDisplay(cm, update) {
        var viewport = update.viewport;

        for (var first = true;; first = false) {
            if (!first || !cm.options.lineWrapping || update.oldDisplayWidth == displayWidth(cm)) {
                // Clip forced viewport to actual scrollable area.
                if (viewport && viewport.top != null) {
                    viewport = { top: Math.min(cm.doc.height + paddingVert(cm.display) - displayHeight(cm), viewport.top) };
                }
                // Updated line heights might result in the drawn area not
                // actually covering the viewport. Keep looping until it does.
                update.visible = visibleLines(cm.display, cm.doc, viewport);
                if (update.visible.from >= cm.display.viewFrom && update.visible.to <= cm.display.viewTo) {
                    break;
                }
            }
            if (!updateDisplayIfNeeded(cm, update)) {
                break;
            }
            updateHeightsInViewport(cm);
            var barMeasure = measureForScrollbars(cm);
            updateSelection(cm);
            updateScrollbars(cm, barMeasure);
            setDocumentHeight(cm, barMeasure);
            update.force = false;
        }

        update.signal(cm, "update", cm);
        if (cm.display.viewFrom != cm.display.reportedViewFrom || cm.display.viewTo != cm.display.reportedViewTo) {
            update.signal(cm, "viewportChange", cm, cm.display.viewFrom, cm.display.viewTo);
            cm.display.reportedViewFrom = cm.display.viewFrom;cm.display.reportedViewTo = cm.display.viewTo;
        }
    }

    function updateDisplaySimple(cm, viewport) {
        var update = new DisplayUpdate(cm, viewport);
        if (updateDisplayIfNeeded(cm, update)) {
            updateHeightsInViewport(cm);
            postUpdateDisplay(cm, update);
            var barMeasure = measureForScrollbars(cm);
            updateSelection(cm);
            updateScrollbars(cm, barMeasure);
            setDocumentHeight(cm, barMeasure);
            update.finish();
        }
    }

    // Sync the actual display DOM structure with display.view, removing
    // nodes for lines that are no longer in view, and creating the ones
    // that are not there yet, and updating the ones that are out of
    // date.
    function patchDisplay(cm, updateNumbersFrom, dims) {
        var display = cm.display,
            lineNumbers = cm.options.lineNumbers;
        var container = display.lineDiv,
            cur = container.firstChild;

        function rm(node) {
            var next = node.nextSibling;
            // Works around a throw-scroll bug in OS X Webkit
            if (webkit && mac && cm.display.currentWheelTarget == node) {
                node.style.display = "none";
            } else {
                node.parentNode.removeChild(node);
            }
            return next;
        }

        var view = display.view,
            lineN = display.viewFrom;
        // Loop over the elements in the view, syncing cur (the DOM nodes
        // in display.lineDiv) with the view as we go.
        for (var i = 0; i < view.length; i++) {
            var lineView = view[i];
            if (lineView.hidden) ;else if (!lineView.node || lineView.node.parentNode != container) {
                // Not drawn yet
                var node = buildLineElement(cm, lineView, lineN, dims);
                container.insertBefore(node, cur);
            } else {
                // Already drawn
                while (cur != lineView.node) {
                    cur = rm(cur);
                }
                var updateNumber = lineNumbers && updateNumbersFrom != null && updateNumbersFrom <= lineN && lineView.lineNumber;
                if (lineView.changes) {
                    if (indexOf(lineView.changes, "gutter") > -1) {
                        updateNumber = false;
                    }
                    updateLineForChanges(cm, lineView, lineN, dims);
                }
                if (updateNumber) {
                    removeChildren(lineView.lineNumber);
                    lineView.lineNumber.appendChild(document.createTextNode(lineNumberFor(cm.options, lineN)));
                }
                cur = lineView.node.nextSibling;
            }
            lineN += lineView.size;
        }
        while (cur) {
            cur = rm(cur);
        }
    }

    function updateGutterSpace(display) {
        var width = display.gutters.offsetWidth;
        display.sizer.style.marginLeft = width + "px";
    }

    function setDocumentHeight(cm, measure) {
        cm.display.sizer.style.minHeight = measure.docHeight + "px";
        cm.display.heightForcer.style.top = measure.docHeight + "px";
        cm.display.gutters.style.height = measure.docHeight + cm.display.barHeight + scrollGap(cm) + "px";
    }

    // Re-align line numbers and gutter marks to compensate for
    // horizontal scrolling.
    function alignHorizontally(cm) {
        var display = cm.display,
            view = display.view;
        if (!display.alignWidgets && (!display.gutters.firstChild || !cm.options.fixedGutter)) {
            return;
        }
        var comp = compensateForHScroll(display) - display.scroller.scrollLeft + cm.doc.scrollLeft;
        var gutterW = display.gutters.offsetWidth,
            left = comp + "px";
        for (var i = 0; i < view.length; i++) {
            if (!view[i].hidden) {
                if (cm.options.fixedGutter) {
                    if (view[i].gutter) {
                        view[i].gutter.style.left = left;
                    }
                    if (view[i].gutterBackground) {
                        view[i].gutterBackground.style.left = left;
                    }
                }
                var align = view[i].alignable;
                if (align) {
                    for (var j = 0; j < align.length; j++) {
                        align[j].style.left = left;
                    }
                }
            }
        }
        if (cm.options.fixedGutter) {
            display.gutters.style.left = comp + gutterW + "px";
        }
    }

    // Used to ensure that the line number gutter is still the right
    // size for the current document size. Returns true when an update
    // is needed.
    function maybeUpdateLineNumberWidth(cm) {
        if (!cm.options.lineNumbers) {
            return false;
        }
        var doc = cm.doc,
            last = lineNumberFor(cm.options, doc.first + doc.size - 1),
            display = cm.display;
        if (last.length != display.lineNumChars) {
            var test = display.measure.appendChild(elt("div", [elt("div", last)], "CodeMirror-linenumber CodeMirror-gutter-elt"));
            var innerW = test.firstChild.offsetWidth,
                padding = test.offsetWidth - innerW;
            display.lineGutter.style.width = "";
            display.lineNumInnerWidth = Math.max(innerW, display.lineGutter.offsetWidth - padding) + 1;
            display.lineNumWidth = display.lineNumInnerWidth + padding;
            display.lineNumChars = display.lineNumInnerWidth ? last.length : -1;
            display.lineGutter.style.width = display.lineNumWidth + "px";
            updateGutterSpace(cm.display);
            return true;
        }
        return false;
    }

    function getGutters(gutters, lineNumbers) {
        var result = [],
            sawLineNumbers = false;
        for (var i = 0; i < gutters.length; i++) {
            var name = gutters[i],
                style = null;
            if (typeof name != "string") {
                style = name.style;name = name.className;
            }
            if (name == "CodeMirror-linenumbers") {
                if (!lineNumbers) {
                    continue;
                } else {
                    sawLineNumbers = true;
                }
            }
            result.push({ className: name, style: style });
        }
        if (lineNumbers && !sawLineNumbers) {
            result.push({ className: "CodeMirror-linenumbers", style: null });
        }
        return result;
    }

    // Rebuild the gutter elements, ensure the margin to the left of the
    // code matches their width.
    function renderGutters(display) {
        var gutters = display.gutters,
            specs = display.gutterSpecs;
        removeChildren(gutters);
        display.lineGutter = null;
        for (var i = 0; i < specs.length; ++i) {
            var ref = specs[i];
            var className = ref.className;
            var style = ref.style;
            var gElt = gutters.appendChild(elt("div", null, "CodeMirror-gutter " + className));
            if (style) {
                gElt.style.cssText = style;
            }
            if (className == "CodeMirror-linenumbers") {
                display.lineGutter = gElt;
                gElt.style.width = (display.lineNumWidth || 1) + "px";
            }
        }
        gutters.style.display = specs.length ? "" : "none";
        updateGutterSpace(display);
    }

    function updateGutters(cm) {
        renderGutters(cm.display);
        regChange(cm);
        alignHorizontally(cm);
    }

    // The display handles the DOM integration, both for input reading
    // and content drawing. It holds references to DOM nodes and
    // display-related state.

    function Display(place, doc, input, options) {
        var d = this;
        this.input = input;

        // Covers bottom-right square when both scrollbars are present.
        d.scrollbarFiller = elt("div", null, "CodeMirror-scrollbar-filler");
        d.scrollbarFiller.setAttribute("cm-not-content", "true");
        // Covers bottom of gutter when coverGutterNextToScrollbar is on
        // and h scrollbar is present.
        d.gutterFiller = elt("div", null, "CodeMirror-gutter-filler");
        d.gutterFiller.setAttribute("cm-not-content", "true");
        // Will contain the actual code, positioned to cover the viewport.
        d.lineDiv = eltP("div", null, "CodeMirror-code");
        // Elements are added to these to represent selection and cursors.
        d.selectionDiv = elt("div", null, null, "position: relative; z-index: 1");
        d.cursorDiv = elt("div", null, "CodeMirror-cursors");
        // A visibility: hidden element used to find the size of things.
        d.measure = elt("div", null, "CodeMirror-measure");
        // When lines outside of the viewport are measured, they are drawn in this.
        d.lineMeasure = elt("div", null, "CodeMirror-measure");
        // Wraps everything that needs to exist inside the vertically-padded coordinate system
        d.lineSpace = eltP("div", [d.measure, d.lineMeasure, d.selectionDiv, d.cursorDiv, d.lineDiv], null, "position: relative; outline: none");
        var lines = eltP("div", [d.lineSpace], "CodeMirror-lines");
        // Moved around its parent to cover visible view.
        d.mover = elt("div", [lines], null, "position: relative");
        // Set to the height of the document, allowing scrolling.
        d.sizer = elt("div", [d.mover], "CodeMirror-sizer");
        d.sizerWidth = null;
        // Behavior of elts with overflow: auto and padding is
        // inconsistent across browsers. This is used to ensure the
        // scrollable area is big enough.
        d.heightForcer = elt("div", null, null, "position: absolute; height: " + scrollerGap + "px; width: 1px;");
        // Will contain the gutters, if any.
        d.gutters = elt("div", null, "CodeMirror-gutters");
        d.lineGutter = null;
        // Actual scrollable element.
        d.scroller = elt("div", [d.sizer, d.heightForcer, d.gutters], "CodeMirror-scroll");
        d.scroller.setAttribute("tabIndex", "-1");
        // The element in which the editor lives.
        d.wrapper = elt("div", [d.scrollbarFiller, d.gutterFiller, d.scroller], "CodeMirror");

        // Work around IE7 z-index bug (not perfect, hence IE7 not really being supported)
        if (ie && ie_version < 8) {
            d.gutters.style.zIndex = -1;d.scroller.style.paddingRight = 0;
        }
        if (!webkit && !(gecko && mobile)) {
            d.scroller.draggable = true;
        }

        if (place) {
            if (place.appendChild) {
                place.appendChild(d.wrapper);
            } else {
                place(d.wrapper);
            }
        }

        // Current rendered range (may be bigger than the view window).
        d.viewFrom = d.viewTo = doc.first;
        d.reportedViewFrom = d.reportedViewTo = doc.first;
        // Information about the rendered lines.
        d.view = [];
        d.renderedView = null;
        // Holds info about a single rendered line when it was rendered
        // for measurement, while not in view.
        d.externalMeasured = null;
        // Empty space (in pixels) above the view
        d.viewOffset = 0;
        d.lastWrapHeight = d.lastWrapWidth = 0;
        d.updateLineNumbers = null;

        d.nativeBarWidth = d.barHeight = d.barWidth = 0;
        d.scrollbarsClipped = false;

        // Used to only resize the line number gutter when necessary (when
        // the amount of lines crosses a boundary that makes its width change)
        d.lineNumWidth = d.lineNumInnerWidth = d.lineNumChars = null;
        // Set to true when a non-horizontal-scrolling line widget is
        // added. As an optimization, line widget aligning is skipped when
        // this is false.
        d.alignWidgets = false;

        d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;

        // Tracks the maximum line length so that the horizontal scrollbar
        // can be kept static when scrolling.
        d.maxLine = null;
        d.maxLineLength = 0;
        d.maxLineChanged = false;

        // Used for measuring wheel scrolling granularity
        d.wheelDX = d.wheelDY = d.wheelStartX = d.wheelStartY = null;

        // True when shift is held down.
        d.shift = false;

        // Used to track whether anything happened since the context menu
        // was opened.
        d.selForContextMenu = null;

        d.activeTouch = null;

        d.gutterSpecs = getGutters(options.gutters, options.lineNumbers);
        renderGutters(d);

        input.init(d);
    }

    // Since the delta values reported on mouse wheel events are
    // unstandardized between browsers and even browser versions, and
    // generally horribly unpredictable, this code starts by measuring
    // the scroll effect that the first few mouse wheel events have,
    // and, from that, detects the way it can convert deltas to pixel
    // offsets afterwards.
    //
    // The reason we want to know the amount a wheel event will scroll
    // is that it gives us a chance to update the display before the
    // actual scrolling happens, reducing flickering.

    var wheelSamples = 0,
        wheelPixelsPerUnit = null;
    // Fill in a browser-detected starting value on browsers where we
    // know one. These don't have to be accurate -- the result of them
    // being wrong would just be a slight flicker on the first wheel
    // scroll (if it is large enough).
    if (ie) {
        wheelPixelsPerUnit = -.53;
    } else if (gecko) {
        wheelPixelsPerUnit = 15;
    } else if (chrome) {
        wheelPixelsPerUnit = -.7;
    } else if (safari) {
        wheelPixelsPerUnit = -1 / 3;
    }

    function wheelEventDelta(e) {
        var dx = e.wheelDeltaX,
            dy = e.wheelDeltaY;
        if (dx == null && e.detail && e.axis == e.HORIZONTAL_AXIS) {
            dx = e.detail;
        }
        if (dy == null && e.detail && e.axis == e.VERTICAL_AXIS) {
            dy = e.detail;
        } else if (dy == null) {
            dy = e.wheelDelta;
        }
        return { x: dx, y: dy };
    }
    function wheelEventPixels(e) {
        var delta = wheelEventDelta(e);
        delta.x *= wheelPixelsPerUnit;
        delta.y *= wheelPixelsPerUnit;
        return delta;
    }

    function onScrollWheel(cm, e) {
        var delta = wheelEventDelta(e),
            dx = delta.x,
            dy = delta.y;

        var display = cm.display,
            scroll = display.scroller;
        // Quit if there's nothing to scroll here
        var canScrollX = scroll.scrollWidth > scroll.clientWidth;
        var canScrollY = scroll.scrollHeight > scroll.clientHeight;
        if (!(dx && canScrollX || dy && canScrollY)) {
            return;
        }

        // Webkit browsers on OS X abort momentum scrolls when the target
        // of the scroll event is removed from the scrollable element.
        // This hack (see related code in patchDisplay) makes sure the
        // element is kept around.
        if (dy && mac && webkit) {
            outer: for (var cur = e.target, view = display.view; cur != scroll; cur = cur.parentNode) {
                for (var i = 0; i < view.length; i++) {
                    if (view[i].node == cur) {
                        cm.display.currentWheelTarget = cur;
                        break outer;
                    }
                }
            }
        }

        // On some browsers, horizontal scrolling will cause redraws to
        // happen before the gutter has been realigned, causing it to
        // wriggle around in a most unseemly way. When we have an
        // estimated pixels/delta value, we just handle horizontal
        // scrolling entirely here. It'll be slightly off from native, but
        // better than glitching out.
        if (dx && !gecko && !presto && wheelPixelsPerUnit != null) {
            if (dy && canScrollY) {
                updateScrollTop(cm, Math.max(0, scroll.scrollTop + dy * wheelPixelsPerUnit));
            }
            setScrollLeft(cm, Math.max(0, scroll.scrollLeft + dx * wheelPixelsPerUnit));
            // Only prevent default scrolling if vertical scrolling is
            // actually possible. Otherwise, it causes vertical scroll
            // jitter on OSX trackpads when deltaX is small and deltaY
            // is large (issue #3579)
            if (!dy || dy && canScrollY) {
                e_preventDefault(e);
            }
            display.wheelStartX = null; // Abort measurement, if in progress
            return;
        }

        // 'Project' the visible viewport to cover the area that is being
        // scrolled into view (if we know enough to estimate it).
        if (dy && wheelPixelsPerUnit != null) {
            var pixels = dy * wheelPixelsPerUnit;
            var top = cm.doc.scrollTop,
                bot = top + display.wrapper.clientHeight;
            if (pixels < 0) {
                top = Math.max(0, top + pixels - 50);
            } else {
                bot = Math.min(cm.doc.height, bot + pixels + 50);
            }
            updateDisplaySimple(cm, { top: top, bottom: bot });
        }

        if (wheelSamples < 20) {
            if (display.wheelStartX == null) {
                display.wheelStartX = scroll.scrollLeft;display.wheelStartY = scroll.scrollTop;
                display.wheelDX = dx;display.wheelDY = dy;
                setTimeout(function () {
                    if (display.wheelStartX == null) {
                        return;
                    }
                    var movedX = scroll.scrollLeft - display.wheelStartX;
                    var movedY = scroll.scrollTop - display.wheelStartY;
                    var sample = movedY && display.wheelDY && movedY / display.wheelDY || movedX && display.wheelDX && movedX / display.wheelDX;
                    display.wheelStartX = display.wheelStartY = null;
                    if (!sample) {
                        return;
                    }
                    wheelPixelsPerUnit = (wheelPixelsPerUnit * wheelSamples + sample) / (wheelSamples + 1);
                    ++wheelSamples;
                }, 200);
            } else {
                display.wheelDX += dx;display.wheelDY += dy;
            }
        }
    }

    // Selection objects are immutable. A new one is created every time
    // the selection changes. A selection is one or more non-overlapping
    // (and non-touching) ranges, sorted, and an integer that indicates
    // which one is the primary selection (the one that's scrolled into
    // view, that getCursor returns, etc).
    var Selection = function Selection(ranges, primIndex) {
        this.ranges = ranges;
        this.primIndex = primIndex;
    };

    Selection.prototype.primary = function () {
        return this.ranges[this.primIndex];
    };

    Selection.prototype.equals = function (other) {
        if (other == this) {
            return true;
        }
        if (other.primIndex != this.primIndex || other.ranges.length != this.ranges.length) {
            return false;
        }
        for (var i = 0; i < this.ranges.length; i++) {
            var here = this.ranges[i],
                there = other.ranges[i];
            if (!equalCursorPos(here.anchor, there.anchor) || !equalCursorPos(here.head, there.head)) {
                return false;
            }
        }
        return true;
    };

    Selection.prototype.deepCopy = function () {
        var out = [];
        for (var i = 0; i < this.ranges.length; i++) {
            out[i] = new Range(copyPos(this.ranges[i].anchor), copyPos(this.ranges[i].head));
        }
        return new Selection(out, this.primIndex);
    };

    Selection.prototype.somethingSelected = function () {
        for (var i = 0; i < this.ranges.length; i++) {
            if (!this.ranges[i].empty()) {
                return true;
            }
        }
        return false;
    };

    Selection.prototype.contains = function (pos, end) {
        if (!end) {
            end = pos;
        }
        for (var i = 0; i < this.ranges.length; i++) {
            var range = this.ranges[i];
            if (cmp(end, range.from()) >= 0 && cmp(pos, range.to()) <= 0) {
                return i;
            }
        }
        return -1;
    };

    var Range = function Range(anchor, head) {
        this.anchor = anchor;this.head = head;
    };

    Range.prototype.from = function () {
        return minPos(this.anchor, this.head);
    };
    Range.prototype.to = function () {
        return maxPos(this.anchor, this.head);
    };
    Range.prototype.empty = function () {
        return this.head.line == this.anchor.line && this.head.ch == this.anchor.ch;
    };

    // Take an unsorted, potentially overlapping set of ranges, and
    // build a selection out of it. 'Consumes' ranges array (modifying
    // it).
    function normalizeSelection(cm, ranges, primIndex) {
        var mayTouch = cm && cm.options.selectionsMayTouch;
        var prim = ranges[primIndex];
        ranges.sort(function (a, b) {
            return cmp(a.from(), b.from());
        });
        primIndex = indexOf(ranges, prim);
        for (var i = 1; i < ranges.length; i++) {
            var cur = ranges[i],
                prev = ranges[i - 1];
            var diff = cmp(prev.to(), cur.from());
            if (mayTouch && !cur.empty() ? diff > 0 : diff >= 0) {
                var from = minPos(prev.from(), cur.from()),
                    to = maxPos(prev.to(), cur.to());
                var inv = prev.empty() ? cur.from() == cur.head : prev.from() == prev.head;
                if (i <= primIndex) {
                    --primIndex;
                }
                ranges.splice(--i, 2, new Range(inv ? to : from, inv ? from : to));
            }
        }
        return new Selection(ranges, primIndex);
    }

    function simpleSelection(anchor, head) {
        return new Selection([new Range(anchor, head || anchor)], 0);
    }

    // Compute the position of the end of a change (its 'to' property
    // refers to the pre-change end).
    function changeEnd(change) {
        if (!change.text) {
            return change.to;
        }
        return Pos(change.from.line + change.text.length - 1, lst(change.text).length + (change.text.length == 1 ? change.from.ch : 0));
    }

    // Adjust a position to refer to the post-change position of the
    // same text, or the end of the change if the change covers it.
    function adjustForChange(pos, change) {
        if (cmp(pos, change.from) < 0) {
            return pos;
        }
        if (cmp(pos, change.to) <= 0) {
            return changeEnd(change);
        }

        var line = pos.line + change.text.length - (change.to.line - change.from.line) - 1,
            ch = pos.ch;
        if (pos.line == change.to.line) {
            ch += changeEnd(change).ch - change.to.ch;
        }
        return Pos(line, ch);
    }

    function computeSelAfterChange(doc, change) {
        var out = [];
        for (var i = 0; i < doc.sel.ranges.length; i++) {
            var range = doc.sel.ranges[i];
            out.push(new Range(adjustForChange(range.anchor, change), adjustForChange(range.head, change)));
        }
        return normalizeSelection(doc.cm, out, doc.sel.primIndex);
    }

    function offsetPos(pos, old, nw) {
        if (pos.line == old.line) {
            return Pos(nw.line, pos.ch - old.ch + nw.ch);
        } else {
            return Pos(nw.line + (pos.line - old.line), pos.ch);
        }
    }

    // Used by replaceSelections to allow moving the selection to the
    // start or around the replaced test. Hint may be "start" or "around".
    function computeReplacedSel(doc, changes, hint) {
        var out = [];
        var oldPrev = Pos(doc.first, 0),
            newPrev = oldPrev;
        for (var i = 0; i < changes.length; i++) {
            var change = changes[i];
            var from = offsetPos(change.from, oldPrev, newPrev);
            var to = offsetPos(changeEnd(change), oldPrev, newPrev);
            oldPrev = change.to;
            newPrev = to;
            if (hint == "around") {
                var range = doc.sel.ranges[i],
                    inv = cmp(range.head, range.anchor) < 0;
                out[i] = new Range(inv ? to : from, inv ? from : to);
            } else {
                out[i] = new Range(from, from);
            }
        }
        return new Selection(out, doc.sel.primIndex);
    }

    // Used to get the editor into a consistent state again when options change.

    function loadMode(cm) {
        cm.doc.mode = getMode(cm.options, cm.doc.modeOption);
        resetModeState(cm);
    }

    function resetModeState(cm) {
        cm.doc.iter(function (line) {
            if (line.stateAfter) {
                line.stateAfter = null;
            }
            if (line.styles) {
                line.styles = null;
            }
        });
        cm.doc.modeFrontier = cm.doc.highlightFrontier = cm.doc.first;
        startWorker(cm, 100);
        cm.state.modeGen++;
        if (cm.curOp) {
            regChange(cm);
        }
    }

    // DOCUMENT DATA STRUCTURE

    // By default, updates that start and end at the beginning of a line
    // are treated specially, in order to make the association of line
    // widgets and marker elements with the text behave more intuitive.
    function isWholeLineUpdate(doc, change) {
        return change.from.ch == 0 && change.to.ch == 0 && lst(change.text) == "" && (!doc.cm || doc.cm.options.wholeLineUpdateBefore);
    }

    // Perform a change on the document data structure.
    function updateDoc(doc, change, markedSpans, estimateHeight) {
        function spansFor(n) {
            return markedSpans ? markedSpans[n] : null;
        }
        function update(line, text, spans) {
            updateLine(line, text, spans, estimateHeight);
            signalLater(line, "change", line, change);
        }
        function linesFor(start, end) {
            var result = [];
            for (var i = start; i < end; ++i) {
                result.push(new Line(text[i], spansFor(i), estimateHeight));
            }
            return result;
        }

        var from = change.from,
            to = change.to,
            text = change.text;
        var firstLine = getLine(doc, from.line),
            lastLine = getLine(doc, to.line);
        var lastText = lst(text),
            lastSpans = spansFor(text.length - 1),
            nlines = to.line - from.line;

        // Adjust the line structure
        if (change.full) {
            doc.insert(0, linesFor(0, text.length));
            doc.remove(text.length, doc.size - text.length);
        } else if (isWholeLineUpdate(doc, change)) {
            // This is a whole-line replace. Treated specially to make
            // sure line objects move the way they are supposed to.
            var added = linesFor(0, text.length - 1);
            update(lastLine, lastLine.text, lastSpans);
            if (nlines) {
                doc.remove(from.line, nlines);
            }
            if (added.length) {
                doc.insert(from.line, added);
            }
        } else if (firstLine == lastLine) {
            if (text.length == 1) {
                update(firstLine, firstLine.text.slice(0, from.ch) + lastText + firstLine.text.slice(to.ch), lastSpans);
            } else {
                var added$1 = linesFor(1, text.length - 1);
                added$1.push(new Line(lastText + firstLine.text.slice(to.ch), lastSpans, estimateHeight));
                update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
                doc.insert(from.line + 1, added$1);
            }
        } else if (text.length == 1) {
            update(firstLine, firstLine.text.slice(0, from.ch) + text[0] + lastLine.text.slice(to.ch), spansFor(0));
            doc.remove(from.line + 1, nlines);
        } else {
            update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
            update(lastLine, lastText + lastLine.text.slice(to.ch), lastSpans);
            var added$2 = linesFor(1, text.length - 1);
            if (nlines > 1) {
                doc.remove(from.line + 1, nlines - 1);
            }
            doc.insert(from.line + 1, added$2);
        }

        signalLater(doc, "change", doc, change);
    }

    // Call f for all linked documents.
    function linkedDocs(doc, f, sharedHistOnly) {
        function propagate(doc, skip, sharedHist) {
            if (doc.linked) {
                for (var i = 0; i < doc.linked.length; ++i) {
                    var rel = doc.linked[i];
                    if (rel.doc == skip) {
                        continue;
                    }
                    var shared = sharedHist && rel.sharedHist;
                    if (sharedHistOnly && !shared) {
                        continue;
                    }
                    f(rel.doc, shared);
                    propagate(rel.doc, doc, shared);
                }
            }
        }
        propagate(doc, null, true);
    }

    // Attach a document to an editor.
    function attachDoc(cm, doc) {
        if (doc.cm) {
            throw new Error("This document is already in use.");
        }
        cm.doc = doc;
        doc.cm = cm;
        estimateLineHeights(cm);
        loadMode(cm);
        setDirectionClass(cm);
        if (!cm.options.lineWrapping) {
            findMaxLine(cm);
        }
        cm.options.mode = doc.modeOption;
        regChange(cm);
    }

    function setDirectionClass(cm) {
        (cm.doc.direction == "rtl" ? addClass : rmClass)(cm.display.lineDiv, "CodeMirror-rtl");
    }

    function directionChanged(cm) {
        runInOp(cm, function () {
            setDirectionClass(cm);
            regChange(cm);
        });
    }

    function History(startGen) {
        // Arrays of change events and selections. Doing something adds an
        // event to done and clears undo. Undoing moves events from done
        // to undone, redoing moves them in the other direction.
        this.done = [];this.undone = [];
        this.undoDepth = Infinity;
        // Used to track when changes can be merged into a single undo
        // event
        this.lastModTime = this.lastSelTime = 0;
        this.lastOp = this.lastSelOp = null;
        this.lastOrigin = this.lastSelOrigin = null;
        // Used by the isClean() method
        this.generation = this.maxGeneration = startGen || 1;
    }

    // Create a history change event from an updateDoc-style change
    // object.
    function historyChangeFromChange(doc, change) {
        var histChange = { from: copyPos(change.from), to: changeEnd(change), text: getBetween(doc, change.from, change.to) };
        attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1);
        linkedDocs(doc, function (doc) {
            return attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1);
        }, true);
        return histChange;
    }

    // Pop all selection events off the end of a history array. Stop at
    // a change event.
    function clearSelectionEvents(array) {
        while (array.length) {
            var last = lst(array);
            if (last.ranges) {
                array.pop();
            } else {
                break;
            }
        }
    }

    // Find the top change event in the history. Pop off selection
    // events that are in the way.
    function lastChangeEvent(hist, force) {
        if (force) {
            clearSelectionEvents(hist.done);
            return lst(hist.done);
        } else if (hist.done.length && !lst(hist.done).ranges) {
            return lst(hist.done);
        } else if (hist.done.length > 1 && !hist.done[hist.done.length - 2].ranges) {
            hist.done.pop();
            return lst(hist.done);
        }
    }

    // Register a change in the history. Merges changes that are within
    // a single operation, or are close together with an origin that
    // allows merging (starting with "+") into a single event.
    function addChangeToHistory(doc, change, selAfter, opId) {
        var hist = doc.history;
        hist.undone.length = 0;
        var time = +new Date(),
            cur;
        var last;

        if ((hist.lastOp == opId || hist.lastOrigin == change.origin && change.origin && (change.origin.charAt(0) == "+" && hist.lastModTime > time - (doc.cm ? doc.cm.options.historyEventDelay : 500) || change.origin.charAt(0) == "*")) && (cur = lastChangeEvent(hist, hist.lastOp == opId))) {
            // Merge this change into the last event
            last = lst(cur.changes);
            if (cmp(change.from, change.to) == 0 && cmp(change.from, last.to) == 0) {
                // Optimized case for simple insertion -- don't want to add
                // new changesets for every character typed
                last.to = changeEnd(change);
            } else {
                // Add new sub-event
                cur.changes.push(historyChangeFromChange(doc, change));
            }
        } else {
            // Can not be merged, start a new event.
            var before = lst(hist.done);
            if (!before || !before.ranges) {
                pushSelectionToHistory(doc.sel, hist.done);
            }
            cur = { changes: [historyChangeFromChange(doc, change)],
                generation: hist.generation };
            hist.done.push(cur);
            while (hist.done.length > hist.undoDepth) {
                hist.done.shift();
                if (!hist.done[0].ranges) {
                    hist.done.shift();
                }
            }
        }
        hist.done.push(selAfter);
        hist.generation = ++hist.maxGeneration;
        hist.lastModTime = hist.lastSelTime = time;
        hist.lastOp = hist.lastSelOp = opId;
        hist.lastOrigin = hist.lastSelOrigin = change.origin;

        if (!last) {
            signal(doc, "historyAdded");
        }
    }

    function selectionEventCanBeMerged(doc, origin, prev, sel) {
        var ch = origin.charAt(0);
        return ch == "*" || ch == "+" && prev.ranges.length == sel.ranges.length && prev.somethingSelected() == sel.somethingSelected() && new Date() - doc.history.lastSelTime <= (doc.cm ? doc.cm.options.historyEventDelay : 500);
    }

    // Called whenever the selection changes, sets the new selection as
    // the pending selection in the history, and pushes the old pending
    // selection into the 'done' array when it was significantly
    // different (in number of selected ranges, emptiness, or time).
    function addSelectionToHistory(doc, sel, opId, options) {
        var hist = doc.history,
            origin = options && options.origin;

        // A new event is started when the previous origin does not match
        // the current, or the origins don't allow matching. Origins
        // starting with * are always merged, those starting with + are
        // merged when similar and close together in time.
        if (opId == hist.lastSelOp || origin && hist.lastSelOrigin == origin && (hist.lastModTime == hist.lastSelTime && hist.lastOrigin == origin || selectionEventCanBeMerged(doc, origin, lst(hist.done), sel))) {
            hist.done[hist.done.length - 1] = sel;
        } else {
            pushSelectionToHistory(sel, hist.done);
        }

        hist.lastSelTime = +new Date();
        hist.lastSelOrigin = origin;
        hist.lastSelOp = opId;
        if (options && options.clearRedo !== false) {
            clearSelectionEvents(hist.undone);
        }
    }

    function pushSelectionToHistory(sel, dest) {
        var top = lst(dest);
        if (!(top && top.ranges && top.equals(sel))) {
            dest.push(sel);
        }
    }

    // Used to store marked span information in the history.
    function attachLocalSpans(doc, change, from, to) {
        var existing = change["spans_" + doc.id],
            n = 0;
        doc.iter(Math.max(doc.first, from), Math.min(doc.first + doc.size, to), function (line) {
            if (line.markedSpans) {
                (existing || (existing = change["spans_" + doc.id] = {}))[n] = line.markedSpans;
            }
            ++n;
        });
    }

    // When un/re-doing restores text containing marked spans, those
    // that have been explicitly cleared should not be restored.
    function removeClearedSpans(spans) {
        if (!spans) {
            return null;
        }
        var out;
        for (var i = 0; i < spans.length; ++i) {
            if (spans[i].marker.explicitlyCleared) {
                if (!out) {
                    out = spans.slice(0, i);
                }
            } else if (out) {
                out.push(spans[i]);
            }
        }
        return !out ? spans : out.length ? out : null;
    }

    // Retrieve and filter the old marked spans stored in a change event.
    function getOldSpans(doc, change) {
        var found = change["spans_" + doc.id];
        if (!found) {
            return null;
        }
        var nw = [];
        for (var i = 0; i < change.text.length; ++i) {
            nw.push(removeClearedSpans(found[i]));
        }
        return nw;
    }

    // Used for un/re-doing changes from the history. Combines the
    // result of computing the existing spans with the set of spans that
    // existed in the history (so that deleting around a span and then
    // undoing brings back the span).
    function mergeOldSpans(doc, change) {
        var old = getOldSpans(doc, change);
        var stretched = stretchSpansOverChange(doc, change);
        if (!old) {
            return stretched;
        }
        if (!stretched) {
            return old;
        }

        for (var i = 0; i < old.length; ++i) {
            var oldCur = old[i],
                stretchCur = stretched[i];
            if (oldCur && stretchCur) {
                spans: for (var j = 0; j < stretchCur.length; ++j) {
                    var span = stretchCur[j];
                    for (var k = 0; k < oldCur.length; ++k) {
                        if (oldCur[k].marker == span.marker) {
                            continue spans;
                        }
                    }
                    oldCur.push(span);
                }
            } else if (stretchCur) {
                old[i] = stretchCur;
            }
        }
        return old;
    }

    // Used both to provide a JSON-safe object in .getHistory, and, when
    // detaching a document, to split the history in two
    function copyHistoryArray(events, newGroup, instantiateSel) {
        var copy = [];
        for (var i = 0; i < events.length; ++i) {
            var event = events[i];
            if (event.ranges) {
                copy.push(instantiateSel ? Selection.prototype.deepCopy.call(event) : event);
                continue;
            }
            var changes = event.changes,
                newChanges = [];
            copy.push({ changes: newChanges });
            for (var j = 0; j < changes.length; ++j) {
                var change = changes[j],
                    m = void 0;
                newChanges.push({ from: change.from, to: change.to, text: change.text });
                if (newGroup) {
                    for (var prop in change) {
                        if (m = prop.match(/^spans_(\d+)$/)) {
                            if (indexOf(newGroup, Number(m[1])) > -1) {
                                lst(newChanges)[prop] = change[prop];
                                delete change[prop];
                            }
                        }
                    }
                }
            }
        }
        return copy;
    }

    // The 'scroll' parameter given to many of these indicated whether
    // the new cursor position should be scrolled into view after
    // modifying the selection.

    // If shift is held or the extend flag is set, extends a range to
    // include a given position (and optionally a second position).
    // Otherwise, simply returns the range between the given positions.
    // Used for cursor motion and such.
    function extendRange(range, head, other, extend) {
        if (extend) {
            var anchor = range.anchor;
            if (other) {
                var posBefore = cmp(head, anchor) < 0;
                if (posBefore != cmp(other, anchor) < 0) {
                    anchor = head;
                    head = other;
                } else if (posBefore != cmp(head, other) < 0) {
                    head = other;
                }
            }
            return new Range(anchor, head);
        } else {
            return new Range(other || head, head);
        }
    }

    // Extend the primary selection range, discard the rest.
    function extendSelection(doc, head, other, options, extend) {
        if (extend == null) {
            extend = doc.cm && (doc.cm.display.shift || doc.extend);
        }
        setSelection(doc, new Selection([extendRange(doc.sel.primary(), head, other, extend)], 0), options);
    }

    // Extend all selections (pos is an array of selections with length
    // equal the number of selections)
    function extendSelections(doc, heads, options) {
        var out = [];
        var extend = doc.cm && (doc.cm.display.shift || doc.extend);
        for (var i = 0; i < doc.sel.ranges.length; i++) {
            out[i] = extendRange(doc.sel.ranges[i], heads[i], null, extend);
        }
        var newSel = normalizeSelection(doc.cm, out, doc.sel.primIndex);
        setSelection(doc, newSel, options);
    }

    // Updates a single range in the selection.
    function replaceOneSelection(doc, i, range, options) {
        var ranges = doc.sel.ranges.slice(0);
        ranges[i] = range;
        setSelection(doc, normalizeSelection(doc.cm, ranges, doc.sel.primIndex), options);
    }

    // Reset the selection to a single range.
    function setSimpleSelection(doc, anchor, head, options) {
        setSelection(doc, simpleSelection(anchor, head), options);
    }

    // Give beforeSelectionChange handlers a change to influence a
    // selection update.
    function filterSelectionChange(doc, sel, options) {
        var obj = {
            ranges: sel.ranges,
            update: function update(ranges) {
                this.ranges = [];
                for (var i = 0; i < ranges.length; i++) {
                    this.ranges[i] = new Range(_clipPos(doc, ranges[i].anchor), _clipPos(doc, ranges[i].head));
                }
            },
            origin: options && options.origin
        };
        signal(doc, "beforeSelectionChange", doc, obj);
        if (doc.cm) {
            signal(doc.cm, "beforeSelectionChange", doc.cm, obj);
        }
        if (obj.ranges != sel.ranges) {
            return normalizeSelection(doc.cm, obj.ranges, obj.ranges.length - 1);
        } else {
            return sel;
        }
    }

    function setSelectionReplaceHistory(doc, sel, options) {
        var done = doc.history.done,
            last = lst(done);
        if (last && last.ranges) {
            done[done.length - 1] = sel;
            setSelectionNoUndo(doc, sel, options);
        } else {
            setSelection(doc, sel, options);
        }
    }

    // Set a new selection.
    function setSelection(doc, sel, options) {
        setSelectionNoUndo(doc, sel, options);
        addSelectionToHistory(doc, doc.sel, doc.cm ? doc.cm.curOp.id : NaN, options);
    }

    function setSelectionNoUndo(doc, sel, options) {
        if (hasHandler(doc, "beforeSelectionChange") || doc.cm && hasHandler(doc.cm, "beforeSelectionChange")) {
            sel = filterSelectionChange(doc, sel, options);
        }

        var bias = options && options.bias || (cmp(sel.primary().head, doc.sel.primary().head) < 0 ? -1 : 1);
        setSelectionInner(doc, skipAtomicInSelection(doc, sel, bias, true));

        if (!(options && options.scroll === false) && doc.cm) {
            ensureCursorVisible(doc.cm);
        }
    }

    function setSelectionInner(doc, sel) {
        if (sel.equals(doc.sel)) {
            return;
        }

        doc.sel = sel;

        if (doc.cm) {
            doc.cm.curOp.updateInput = 1;
            doc.cm.curOp.selectionChanged = true;
            signalCursorActivity(doc.cm);
        }
        signalLater(doc, "cursorActivity", doc);
    }

    // Verify that the selection does not partially select any atomic
    // marked ranges.
    function reCheckSelection(doc) {
        setSelectionInner(doc, skipAtomicInSelection(doc, doc.sel, null, false));
    }

    // Return a selection that does not partially select any atomic
    // ranges.
    function skipAtomicInSelection(doc, sel, bias, mayClear) {
        var out;
        for (var i = 0; i < sel.ranges.length; i++) {
            var range = sel.ranges[i];
            var old = sel.ranges.length == doc.sel.ranges.length && doc.sel.ranges[i];
            var newAnchor = skipAtomic(doc, range.anchor, old && old.anchor, bias, mayClear);
            var newHead = skipAtomic(doc, range.head, old && old.head, bias, mayClear);
            if (out || newAnchor != range.anchor || newHead != range.head) {
                if (!out) {
                    out = sel.ranges.slice(0, i);
                }
                out[i] = new Range(newAnchor, newHead);
            }
        }
        return out ? normalizeSelection(doc.cm, out, sel.primIndex) : sel;
    }

    function skipAtomicInner(doc, pos, oldPos, dir, mayClear) {
        var line = getLine(doc, pos.line);
        if (line.markedSpans) {
            for (var i = 0; i < line.markedSpans.length; ++i) {
                var sp = line.markedSpans[i],
                    m = sp.marker;

                // Determine if we should prevent the cursor being placed to the left/right of an atomic marker
                // Historically this was determined using the inclusiveLeft/Right option, but the new way to control it
                // is with selectLeft/Right
                var preventCursorLeft = "selectLeft" in m ? !m.selectLeft : m.inclusiveLeft;
                var preventCursorRight = "selectRight" in m ? !m.selectRight : m.inclusiveRight;

                if ((sp.from == null || (preventCursorLeft ? sp.from <= pos.ch : sp.from < pos.ch)) && (sp.to == null || (preventCursorRight ? sp.to >= pos.ch : sp.to > pos.ch))) {
                    if (mayClear) {
                        signal(m, "beforeCursorEnter");
                        if (m.explicitlyCleared) {
                            if (!line.markedSpans) {
                                break;
                            } else {
                                --i;continue;
                            }
                        }
                    }
                    if (!m.atomic) {
                        continue;
                    }

                    if (oldPos) {
                        var near = m.find(dir < 0 ? 1 : -1),
                            diff = void 0;
                        if (dir < 0 ? preventCursorRight : preventCursorLeft) {
                            near = movePos(doc, near, -dir, near && near.line == pos.line ? line : null);
                        }
                        if (near && near.line == pos.line && (diff = cmp(near, oldPos)) && (dir < 0 ? diff < 0 : diff > 0)) {
                            return skipAtomicInner(doc, near, pos, dir, mayClear);
                        }
                    }

                    var far = m.find(dir < 0 ? -1 : 1);
                    if (dir < 0 ? preventCursorLeft : preventCursorRight) {
                        far = movePos(doc, far, dir, far.line == pos.line ? line : null);
                    }
                    return far ? skipAtomicInner(doc, far, pos, dir, mayClear) : null;
                }
            }
        }
        return pos;
    }

    // Ensure a given position is not inside an atomic range.
    function skipAtomic(doc, pos, oldPos, bias, mayClear) {
        var dir = bias || 1;
        var found = skipAtomicInner(doc, pos, oldPos, dir, mayClear) || !mayClear && skipAtomicInner(doc, pos, oldPos, dir, true) || skipAtomicInner(doc, pos, oldPos, -dir, mayClear) || !mayClear && skipAtomicInner(doc, pos, oldPos, -dir, true);
        if (!found) {
            doc.cantEdit = true;
            return Pos(doc.first, 0);
        }
        return found;
    }

    function movePos(doc, pos, dir, line) {
        if (dir < 0 && pos.ch == 0) {
            if (pos.line > doc.first) {
                return _clipPos(doc, Pos(pos.line - 1));
            } else {
                return null;
            }
        } else if (dir > 0 && pos.ch == (line || getLine(doc, pos.line)).text.length) {
            if (pos.line < doc.first + doc.size - 1) {
                return Pos(pos.line + 1, 0);
            } else {
                return null;
            }
        } else {
            return new Pos(pos.line, pos.ch + dir);
        }
    }

    function selectAll(cm) {
        cm.setSelection(Pos(cm.firstLine(), 0), Pos(cm.lastLine()), sel_dontScroll);
    }

    // UPDATING

    // Allow "beforeChange" event handlers to influence a change
    function filterChange(doc, change, update) {
        var obj = {
            canceled: false,
            from: change.from,
            to: change.to,
            text: change.text,
            origin: change.origin,
            cancel: function cancel() {
                return obj.canceled = true;
            }
        };
        if (update) {
            obj.update = function (from, to, text, origin) {
                if (from) {
                    obj.from = _clipPos(doc, from);
                }
                if (to) {
                    obj.to = _clipPos(doc, to);
                }
                if (text) {
                    obj.text = text;
                }
                if (origin !== undefined) {
                    obj.origin = origin;
                }
            };
        }
        signal(doc, "beforeChange", doc, obj);
        if (doc.cm) {
            signal(doc.cm, "beforeChange", doc.cm, obj);
        }

        if (obj.canceled) {
            if (doc.cm) {
                doc.cm.curOp.updateInput = 2;
            }
            return null;
        }
        return { from: obj.from, to: obj.to, text: obj.text, origin: obj.origin };
    }

    // Apply a change to a document, and add it to the document's
    // history, and propagating it to all linked documents.
    function makeChange(doc, change, ignoreReadOnly) {
        if (doc.cm) {
            if (!doc.cm.curOp) {
                return operation(doc.cm, makeChange)(doc, change, ignoreReadOnly);
            }
            if (doc.cm.state.suppressEdits) {
                return;
            }
        }

        if (hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange")) {
            change = filterChange(doc, change, true);
            if (!change) {
                return;
            }
        }

        // Possibly split or suppress the update based on the presence
        // of read-only spans in its range.
        var split = sawReadOnlySpans && !ignoreReadOnly && removeReadOnlyRanges(doc, change.from, change.to);
        if (split) {
            for (var i = split.length - 1; i >= 0; --i) {
                makeChangeInner(doc, { from: split[i].from, to: split[i].to, text: i ? [""] : change.text, origin: change.origin });
            }
        } else {
            makeChangeInner(doc, change);
        }
    }

    function makeChangeInner(doc, change) {
        if (change.text.length == 1 && change.text[0] == "" && cmp(change.from, change.to) == 0) {
            return;
        }
        var selAfter = computeSelAfterChange(doc, change);
        addChangeToHistory(doc, change, selAfter, doc.cm ? doc.cm.curOp.id : NaN);

        makeChangeSingleDoc(doc, change, selAfter, stretchSpansOverChange(doc, change));
        var rebased = [];

        linkedDocs(doc, function (doc, sharedHist) {
            if (!sharedHist && indexOf(rebased, doc.history) == -1) {
                rebaseHist(doc.history, change);
                rebased.push(doc.history);
            }
            makeChangeSingleDoc(doc, change, null, stretchSpansOverChange(doc, change));
        });
    }

    // Revert a change stored in a document's history.
    function makeChangeFromHistory(doc, type, allowSelectionOnly) {
        var suppress = doc.cm && doc.cm.state.suppressEdits;
        if (suppress && !allowSelectionOnly) {
            return;
        }

        var hist = doc.history,
            event,
            selAfter = doc.sel;
        var source = type == "undo" ? hist.done : hist.undone,
            dest = type == "undo" ? hist.undone : hist.done;

        // Verify that there is a useable event (so that ctrl-z won't
        // needlessly clear selection events)
        var i = 0;
        for (; i < source.length; i++) {
            event = source[i];
            if (allowSelectionOnly ? event.ranges && !event.equals(doc.sel) : !event.ranges) {
                break;
            }
        }
        if (i == source.length) {
            return;
        }
        hist.lastOrigin = hist.lastSelOrigin = null;

        for (;;) {
            event = source.pop();
            if (event.ranges) {
                pushSelectionToHistory(event, dest);
                if (allowSelectionOnly && !event.equals(doc.sel)) {
                    setSelection(doc, event, { clearRedo: false });
                    return;
                }
                selAfter = event;
            } else if (suppress) {
                source.push(event);
                return;
            } else {
                break;
            }
        }

        // Build up a reverse change object to add to the opposite history
        // stack (redo when undoing, and vice versa).
        var antiChanges = [];
        pushSelectionToHistory(selAfter, dest);
        dest.push({ changes: antiChanges, generation: hist.generation });
        hist.generation = event.generation || ++hist.maxGeneration;

        var filter = hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange");

        var loop = function loop(i) {
            var change = event.changes[i];
            change.origin = type;
            if (filter && !filterChange(doc, change, false)) {
                source.length = 0;
                return {};
            }

            antiChanges.push(historyChangeFromChange(doc, change));

            var after = i ? computeSelAfterChange(doc, change) : lst(source);
            makeChangeSingleDoc(doc, change, after, mergeOldSpans(doc, change));
            if (!i && doc.cm) {
                doc.cm.scrollIntoView({ from: change.from, to: changeEnd(change) });
            }
            var rebased = [];

            // Propagate to the linked documents
            linkedDocs(doc, function (doc, sharedHist) {
                if (!sharedHist && indexOf(rebased, doc.history) == -1) {
                    rebaseHist(doc.history, change);
                    rebased.push(doc.history);
                }
                makeChangeSingleDoc(doc, change, null, mergeOldSpans(doc, change));
            });
        };

        for (var i$1 = event.changes.length - 1; i$1 >= 0; --i$1) {
            var returned = loop(i$1);

            if (returned) return returned.v;
        }
    }

    // Sub-views need their line numbers shifted when text is added
    // above or below them in the parent document.
    function shiftDoc(doc, distance) {
        if (distance == 0) {
            return;
        }
        doc.first += distance;
        doc.sel = new Selection(map(doc.sel.ranges, function (range) {
            return new Range(Pos(range.anchor.line + distance, range.anchor.ch), Pos(range.head.line + distance, range.head.ch));
        }), doc.sel.primIndex);
        if (doc.cm) {
            regChange(doc.cm, doc.first, doc.first - distance, distance);
            for (var d = doc.cm.display, l = d.viewFrom; l < d.viewTo; l++) {
                regLineChange(doc.cm, l, "gutter");
            }
        }
    }

    // More lower-level change function, handling only a single document
    // (not linked ones).
    function makeChangeSingleDoc(doc, change, selAfter, spans) {
        if (doc.cm && !doc.cm.curOp) {
            return operation(doc.cm, makeChangeSingleDoc)(doc, change, selAfter, spans);
        }

        if (change.to.line < doc.first) {
            shiftDoc(doc, change.text.length - 1 - (change.to.line - change.from.line));
            return;
        }
        if (change.from.line > doc.lastLine()) {
            return;
        }

        // Clip the change to the size of this doc
        if (change.from.line < doc.first) {
            var shift = change.text.length - 1 - (doc.first - change.from.line);
            shiftDoc(doc, shift);
            change = { from: Pos(doc.first, 0), to: Pos(change.to.line + shift, change.to.ch),
                text: [lst(change.text)], origin: change.origin };
        }
        var last = doc.lastLine();
        if (change.to.line > last) {
            change = { from: change.from, to: Pos(last, getLine(doc, last).text.length),
                text: [change.text[0]], origin: change.origin };
        }

        change.removed = getBetween(doc, change.from, change.to);

        if (!selAfter) {
            selAfter = computeSelAfterChange(doc, change);
        }
        if (doc.cm) {
            makeChangeSingleDocInEditor(doc.cm, change, spans);
        } else {
            updateDoc(doc, change, spans);
        }
        setSelectionNoUndo(doc, selAfter, sel_dontScroll);

        if (doc.cantEdit && skipAtomic(doc, Pos(doc.firstLine(), 0))) {
            doc.cantEdit = false;
        }
    }

    // Handle the interaction of a change to a document with the editor
    // that this document is part of.
    function makeChangeSingleDocInEditor(cm, change, spans) {
        var doc = cm.doc,
            display = cm.display,
            from = change.from,
            to = change.to;

        var recomputeMaxLength = false,
            checkWidthStart = from.line;
        if (!cm.options.lineWrapping) {
            checkWidthStart = lineNo(visualLine(getLine(doc, from.line)));
            doc.iter(checkWidthStart, to.line + 1, function (line) {
                if (line == display.maxLine) {
                    recomputeMaxLength = true;
                    return true;
                }
            });
        }

        if (doc.sel.contains(change.from, change.to) > -1) {
            signalCursorActivity(cm);
        }

        updateDoc(doc, change, spans, estimateHeight(cm));

        if (!cm.options.lineWrapping) {
            doc.iter(checkWidthStart, from.line + change.text.length, function (line) {
                var len = lineLength(line);
                if (len > display.maxLineLength) {
                    display.maxLine = line;
                    display.maxLineLength = len;
                    display.maxLineChanged = true;
                    recomputeMaxLength = false;
                }
            });
            if (recomputeMaxLength) {
                cm.curOp.updateMaxLine = true;
            }
        }

        retreatFrontier(doc, from.line);
        startWorker(cm, 400);

        var lendiff = change.text.length - (to.line - from.line) - 1;
        // Remember that these lines changed, for updating the display
        if (change.full) {
            regChange(cm);
        } else if (from.line == to.line && change.text.length == 1 && !isWholeLineUpdate(cm.doc, change)) {
            regLineChange(cm, from.line, "text");
        } else {
            regChange(cm, from.line, to.line + 1, lendiff);
        }

        var changesHandler = hasHandler(cm, "changes"),
            changeHandler = hasHandler(cm, "change");
        if (changeHandler || changesHandler) {
            var obj = {
                from: from, to: to,
                text: change.text,
                removed: change.removed,
                origin: change.origin
            };
            if (changeHandler) {
                signalLater(cm, "change", cm, obj);
            }
            if (changesHandler) {
                (cm.curOp.changeObjs || (cm.curOp.changeObjs = [])).push(obj);
            }
        }
        cm.display.selForContextMenu = null;
    }

    function _replaceRange(doc, code, from, to, origin) {
        var assign;

        if (!to) {
            to = from;
        }
        if (cmp(to, from) < 0) {
            assign = [to, from], from = assign[0], to = assign[1];
        }
        if (typeof code == "string") {
            code = doc.splitLines(code);
        }
        makeChange(doc, { from: from, to: to, text: code, origin: origin });
    }

    // Rebasing/resetting history to deal with externally-sourced changes

    function rebaseHistSelSingle(pos, from, to, diff) {
        if (to < pos.line) {
            pos.line += diff;
        } else if (from < pos.line) {
            pos.line = from;
            pos.ch = 0;
        }
    }

    // Tries to rebase an array of history events given a change in the
    // document. If the change touches the same lines as the event, the
    // event, and everything 'behind' it, is discarded. If the change is
    // before the event, the event's positions are updated. Uses a
    // copy-on-write scheme for the positions, to avoid having to
    // reallocate them all on every rebase, but also avoid problems with
    // shared position objects being unsafely updated.
    function rebaseHistArray(array, from, to, diff) {
        for (var i = 0; i < array.length; ++i) {
            var sub = array[i],
                ok = true;
            if (sub.ranges) {
                if (!sub.copied) {
                    sub = array[i] = sub.deepCopy();sub.copied = true;
                }
                for (var j = 0; j < sub.ranges.length; j++) {
                    rebaseHistSelSingle(sub.ranges[j].anchor, from, to, diff);
                    rebaseHistSelSingle(sub.ranges[j].head, from, to, diff);
                }
                continue;
            }
            for (var j$1 = 0; j$1 < sub.changes.length; ++j$1) {
                var cur = sub.changes[j$1];
                if (to < cur.from.line) {
                    cur.from = Pos(cur.from.line + diff, cur.from.ch);
                    cur.to = Pos(cur.to.line + diff, cur.to.ch);
                } else if (from <= cur.to.line) {
                    ok = false;
                    break;
                }
            }
            if (!ok) {
                array.splice(0, i + 1);
                i = 0;
            }
        }
    }

    function rebaseHist(hist, change) {
        var from = change.from.line,
            to = change.to.line,
            diff = change.text.length - (to - from) - 1;
        rebaseHistArray(hist.done, from, to, diff);
        rebaseHistArray(hist.undone, from, to, diff);
    }

    // Utility for applying a change to a line by handle or number,
    // returning the number and optionally registering the line as
    // changed.
    function changeLine(doc, handle, changeType, op) {
        var no = handle,
            line = handle;
        if (typeof handle == "number") {
            line = getLine(doc, clipLine(doc, handle));
        } else {
            no = lineNo(handle);
        }
        if (no == null) {
            return null;
        }
        if (op(line, no) && doc.cm) {
            regLineChange(doc.cm, no, changeType);
        }
        return line;
    }

    // The document is represented as a BTree consisting of leaves, with
    // chunk of lines in them, and branches, with up to ten leaves or
    // other branch nodes below them. The top node is always a branch
    // node, and is the document object itself (meaning it has
    // additional methods and properties).
    //
    // All nodes have parent links. The tree is used both to go from
    // line numbers to line objects, and to go from objects to numbers.
    // It also indexes by height, and is used to convert between height
    // and line object, and to find the total height of the document.
    //
    // See also http://marijnhaverbeke.nl/blog/codemirror-line-tree.html

    function LeafChunk(lines) {
        this.lines = lines;
        this.parent = null;
        var height = 0;
        for (var i = 0; i < lines.length; ++i) {
            lines[i].parent = this;
            height += lines[i].height;
        }
        this.height = height;
    }

    LeafChunk.prototype = {
        chunkSize: function chunkSize() {
            return this.lines.length;
        },

        // Remove the n lines at offset 'at'.
        removeInner: function removeInner(at, n) {
            for (var i = at, e = at + n; i < e; ++i) {
                var line = this.lines[i];
                this.height -= line.height;
                cleanUpLine(line);
                signalLater(line, "delete");
            }
            this.lines.splice(at, n);
        },

        // Helper used to collapse a small branch into a single leaf.
        collapse: function collapse(lines) {
            lines.push.apply(lines, this.lines);
        },

        // Insert the given array of lines at offset 'at', count them as
        // having the given height.
        insertInner: function insertInner(at, lines, height) {
            this.height += height;
            this.lines = this.lines.slice(0, at).concat(lines).concat(this.lines.slice(at));
            for (var i = 0; i < lines.length; ++i) {
                lines[i].parent = this;
            }
        },

        // Used to iterate over a part of the tree.
        iterN: function iterN(at, n, op) {
            for (var e = at + n; at < e; ++at) {
                if (op(this.lines[at])) {
                    return true;
                }
            }
        }
    };

    function BranchChunk(children) {
        this.children = children;
        var size = 0,
            height = 0;
        for (var i = 0; i < children.length; ++i) {
            var ch = children[i];
            size += ch.chunkSize();height += ch.height;
            ch.parent = this;
        }
        this.size = size;
        this.height = height;
        this.parent = null;
    }

    BranchChunk.prototype = {
        chunkSize: function chunkSize() {
            return this.size;
        },

        removeInner: function removeInner(at, n) {
            this.size -= n;
            for (var i = 0; i < this.children.length; ++i) {
                var child = this.children[i],
                    sz = child.chunkSize();
                if (at < sz) {
                    var rm = Math.min(n, sz - at),
                        oldHeight = child.height;
                    child.removeInner(at, rm);
                    this.height -= oldHeight - child.height;
                    if (sz == rm) {
                        this.children.splice(i--, 1);child.parent = null;
                    }
                    if ((n -= rm) == 0) {
                        break;
                    }
                    at = 0;
                } else {
                    at -= sz;
                }
            }
            // If the result is smaller than 25 lines, ensure that it is a
            // single leaf node.
            if (this.size - n < 25 && (this.children.length > 1 || !(this.children[0] instanceof LeafChunk))) {
                var lines = [];
                this.collapse(lines);
                this.children = [new LeafChunk(lines)];
                this.children[0].parent = this;
            }
        },

        collapse: function collapse(lines) {
            for (var i = 0; i < this.children.length; ++i) {
                this.children[i].collapse(lines);
            }
        },

        insertInner: function insertInner(at, lines, height) {
            this.size += lines.length;
            this.height += height;
            for (var i = 0; i < this.children.length; ++i) {
                var child = this.children[i],
                    sz = child.chunkSize();
                if (at <= sz) {
                    child.insertInner(at, lines, height);
                    if (child.lines && child.lines.length > 50) {
                        // To avoid memory thrashing when child.lines is huge (e.g. first view of a large file), it's never spliced.
                        // Instead, small slices are taken. They're taken in order because sequential memory accesses are fastest.
                        var remaining = child.lines.length % 25 + 25;
                        for (var pos = remaining; pos < child.lines.length;) {
                            var leaf = new LeafChunk(child.lines.slice(pos, pos += 25));
                            child.height -= leaf.height;
                            this.children.splice(++i, 0, leaf);
                            leaf.parent = this;
                        }
                        child.lines = child.lines.slice(0, remaining);
                        this.maybeSpill();
                    }
                    break;
                }
                at -= sz;
            }
        },

        // When a node has grown, check whether it should be split.
        maybeSpill: function maybeSpill() {
            if (this.children.length <= 10) {
                return;
            }
            var me = this;
            do {
                var spilled = me.children.splice(me.children.length - 5, 5);
                var sibling = new BranchChunk(spilled);
                if (!me.parent) {
                    // Become the parent node
                    var copy = new BranchChunk(me.children);
                    copy.parent = me;
                    me.children = [copy, sibling];
                    me = copy;
                } else {
                    me.size -= sibling.size;
                    me.height -= sibling.height;
                    var myIndex = indexOf(me.parent.children, me);
                    me.parent.children.splice(myIndex + 1, 0, sibling);
                }
                sibling.parent = me.parent;
            } while (me.children.length > 10);
            me.parent.maybeSpill();
        },

        iterN: function iterN(at, n, op) {
            for (var i = 0; i < this.children.length; ++i) {
                var child = this.children[i],
                    sz = child.chunkSize();
                if (at < sz) {
                    var used = Math.min(n, sz - at);
                    if (child.iterN(at, used, op)) {
                        return true;
                    }
                    if ((n -= used) == 0) {
                        break;
                    }
                    at = 0;
                } else {
                    at -= sz;
                }
            }
        }
    };

    // Line widgets are block elements displayed above or below a line.

    var LineWidget = function LineWidget(doc, node, options) {
        if (options) {
            for (var opt in options) {
                if (options.hasOwnProperty(opt)) {
                    this[opt] = options[opt];
                }
            }
        }
        this.doc = doc;
        this.node = node;
    };

    LineWidget.prototype.clear = function () {
        var cm = this.doc.cm,
            ws = this.line.widgets,
            line = this.line,
            no = lineNo(line);
        if (no == null || !ws) {
            return;
        }
        for (var i = 0; i < ws.length; ++i) {
            if (ws[i] == this) {
                ws.splice(i--, 1);
            }
        }
        if (!ws.length) {
            line.widgets = null;
        }
        var height = widgetHeight(this);
        updateLineHeight(line, Math.max(0, line.height - height));
        if (cm) {
            runInOp(cm, function () {
                adjustScrollWhenAboveVisible(cm, line, -height);
                regLineChange(cm, no, "widget");
            });
            signalLater(cm, "lineWidgetCleared", cm, this, no);
        }
    };

    LineWidget.prototype.changed = function () {
        var this$1 = this;

        var oldH = this.height,
            cm = this.doc.cm,
            line = this.line;
        this.height = null;
        var diff = widgetHeight(this) - oldH;
        if (!diff) {
            return;
        }
        if (!lineIsHidden(this.doc, line)) {
            updateLineHeight(line, line.height + diff);
        }
        if (cm) {
            runInOp(cm, function () {
                cm.curOp.forceUpdate = true;
                adjustScrollWhenAboveVisible(cm, line, diff);
                signalLater(cm, "lineWidgetChanged", cm, this$1, lineNo(line));
            });
        }
    };
    eventMixin(LineWidget);

    function adjustScrollWhenAboveVisible(cm, line, diff) {
        if (_heightAtLine(line) < (cm.curOp && cm.curOp.scrollTop || cm.doc.scrollTop)) {
            addToScrollTop(cm, diff);
        }
    }

    function addLineWidget(doc, handle, node, options) {
        var widget = new LineWidget(doc, node, options);
        var cm = doc.cm;
        if (cm && widget.noHScroll) {
            cm.display.alignWidgets = true;
        }
        changeLine(doc, handle, "widget", function (line) {
            var widgets = line.widgets || (line.widgets = []);
            if (widget.insertAt == null) {
                widgets.push(widget);
            } else {
                widgets.splice(Math.min(widgets.length - 1, Math.max(0, widget.insertAt)), 0, widget);
            }
            widget.line = line;
            if (cm && !lineIsHidden(doc, line)) {
                var aboveVisible = _heightAtLine(line) < doc.scrollTop;
                updateLineHeight(line, line.height + widgetHeight(widget));
                if (aboveVisible) {
                    addToScrollTop(cm, widget.height);
                }
                cm.curOp.forceUpdate = true;
            }
            return true;
        });
        if (cm) {
            signalLater(cm, "lineWidgetAdded", cm, widget, typeof handle == "number" ? handle : lineNo(handle));
        }
        return widget;
    }

    // TEXTMARKERS

    // Created with markText and setBookmark methods. A TextMarker is a
    // handle that can be used to clear or find a marked position in the
    // document. Line objects hold arrays (markedSpans) containing
    // {from, to, marker} object pointing to such marker objects, and
    // indicating that such a marker is present on that line. Multiple
    // lines may point to the same marker when it spans across lines.
    // The spans will have null for their from/to properties when the
    // marker continues beyond the start/end of the line. Markers have
    // links back to the lines they currently touch.

    // Collapsed markers have unique ids, in order to be able to order
    // them, which is needed for uniquely determining an outer marker
    // when they overlap (they may nest, but not partially overlap).
    var nextMarkerId = 0;

    var TextMarker = function TextMarker(doc, type) {
        this.lines = [];
        this.type = type;
        this.doc = doc;
        this.id = ++nextMarkerId;
    };

    // Clear the marker.
    TextMarker.prototype.clear = function () {
        if (this.explicitlyCleared) {
            return;
        }
        var cm = this.doc.cm,
            withOp = cm && !cm.curOp;
        if (withOp) {
            _startOperation(cm);
        }
        if (hasHandler(this, "clear")) {
            var found = this.find();
            if (found) {
                signalLater(this, "clear", found.from, found.to);
            }
        }
        var min = null,
            max = null;
        for (var i = 0; i < this.lines.length; ++i) {
            var line = this.lines[i];
            var span = getMarkedSpanFor(line.markedSpans, this);
            if (cm && !this.collapsed) {
                regLineChange(cm, lineNo(line), "text");
            } else if (cm) {
                if (span.to != null) {
                    max = lineNo(line);
                }
                if (span.from != null) {
                    min = lineNo(line);
                }
            }
            line.markedSpans = removeMarkedSpan(line.markedSpans, span);
            if (span.from == null && this.collapsed && !lineIsHidden(this.doc, line) && cm) {
                updateLineHeight(line, textHeight(cm.display));
            }
        }
        if (cm && this.collapsed && !cm.options.lineWrapping) {
            for (var i$1 = 0; i$1 < this.lines.length; ++i$1) {
                var visual = visualLine(this.lines[i$1]),
                    len = lineLength(visual);
                if (len > cm.display.maxLineLength) {
                    cm.display.maxLine = visual;
                    cm.display.maxLineLength = len;
                    cm.display.maxLineChanged = true;
                }
            }
        }

        if (min != null && cm && this.collapsed) {
            regChange(cm, min, max + 1);
        }
        this.lines.length = 0;
        this.explicitlyCleared = true;
        if (this.atomic && this.doc.cantEdit) {
            this.doc.cantEdit = false;
            if (cm) {
                reCheckSelection(cm.doc);
            }
        }
        if (cm) {
            signalLater(cm, "markerCleared", cm, this, min, max);
        }
        if (withOp) {
            _endOperation(cm);
        }
        if (this.parent) {
            this.parent.clear();
        }
    };

    // Find the position of the marker in the document. Returns a {from,
    // to} object by default. Side can be passed to get a specific side
    // -- 0 (both), -1 (left), or 1 (right). When lineObj is true, the
    // Pos objects returned contain a line object, rather than a line
    // number (used to prevent looking up the same line twice).
    TextMarker.prototype.find = function (side, lineObj) {
        if (side == null && this.type == "bookmark") {
            side = 1;
        }
        var from, to;
        for (var i = 0; i < this.lines.length; ++i) {
            var line = this.lines[i];
            var span = getMarkedSpanFor(line.markedSpans, this);
            if (span.from != null) {
                from = Pos(lineObj ? line : lineNo(line), span.from);
                if (side == -1) {
                    return from;
                }
            }
            if (span.to != null) {
                to = Pos(lineObj ? line : lineNo(line), span.to);
                if (side == 1) {
                    return to;
                }
            }
        }
        return from && { from: from, to: to };
    };

    // Signals that the marker's widget changed, and surrounding layout
    // should be recomputed.
    TextMarker.prototype.changed = function () {
        var this$1 = this;

        var pos = this.find(-1, true),
            widget = this,
            cm = this.doc.cm;
        if (!pos || !cm) {
            return;
        }
        runInOp(cm, function () {
            var line = pos.line,
                lineN = lineNo(pos.line);
            var view = findViewForLine(cm, lineN);
            if (view) {
                clearLineMeasurementCacheFor(view);
                cm.curOp.selectionChanged = cm.curOp.forceUpdate = true;
            }
            cm.curOp.updateMaxLine = true;
            if (!lineIsHidden(widget.doc, line) && widget.height != null) {
                var oldHeight = widget.height;
                widget.height = null;
                var dHeight = widgetHeight(widget) - oldHeight;
                if (dHeight) {
                    updateLineHeight(line, line.height + dHeight);
                }
            }
            signalLater(cm, "markerChanged", cm, this$1);
        });
    };

    TextMarker.prototype.attachLine = function (line) {
        if (!this.lines.length && this.doc.cm) {
            var op = this.doc.cm.curOp;
            if (!op.maybeHiddenMarkers || indexOf(op.maybeHiddenMarkers, this) == -1) {
                (op.maybeUnhiddenMarkers || (op.maybeUnhiddenMarkers = [])).push(this);
            }
        }
        this.lines.push(line);
    };

    TextMarker.prototype.detachLine = function (line) {
        this.lines.splice(indexOf(this.lines, line), 1);
        if (!this.lines.length && this.doc.cm) {
            var op = this.doc.cm.curOp;(op.maybeHiddenMarkers || (op.maybeHiddenMarkers = [])).push(this);
        }
    };
    eventMixin(TextMarker);

    // Create a marker, wire it up to the right lines, and
    function _markText(doc, from, to, options, type) {
        // Shared markers (across linked documents) are handled separately
        // (markTextShared will call out to this again, once per
        // document).
        if (options && options.shared) {
            return markTextShared(doc, from, to, options, type);
        }
        // Ensure we are in an operation.
        if (doc.cm && !doc.cm.curOp) {
            return operation(doc.cm, _markText)(doc, from, to, options, type);
        }

        var marker = new TextMarker(doc, type),
            diff = cmp(from, to);
        if (options) {
            copyObj(options, marker, false);
        }
        // Don't connect empty markers unless clearWhenEmpty is false
        if (diff > 0 || diff == 0 && marker.clearWhenEmpty !== false) {
            return marker;
        }
        if (marker.replacedWith) {
            // Showing up as a widget implies collapsed (widget replaces text)
            marker.collapsed = true;
            marker.widgetNode = eltP("span", [marker.replacedWith], "CodeMirror-widget");
            if (!options.handleMouseEvents) {
                marker.widgetNode.setAttribute("cm-ignore-events", "true");
            }
            if (options.insertLeft) {
                marker.widgetNode.insertLeft = true;
            }
        }
        if (marker.collapsed) {
            if (conflictingCollapsedRange(doc, from.line, from, to, marker) || from.line != to.line && conflictingCollapsedRange(doc, to.line, from, to, marker)) {
                throw new Error("Inserting collapsed marker partially overlapping an existing one");
            }
            seeCollapsedSpans();
        }

        if (marker.addToHistory) {
            addChangeToHistory(doc, { from: from, to: to, origin: "markText" }, doc.sel, NaN);
        }

        var curLine = from.line,
            cm = doc.cm,
            updateMaxLine;
        doc.iter(curLine, to.line + 1, function (line) {
            if (cm && marker.collapsed && !cm.options.lineWrapping && visualLine(line) == cm.display.maxLine) {
                updateMaxLine = true;
            }
            if (marker.collapsed && curLine != from.line) {
                updateLineHeight(line, 0);
            }
            addMarkedSpan(line, new MarkedSpan(marker, curLine == from.line ? from.ch : null, curLine == to.line ? to.ch : null));
            ++curLine;
        });
        // lineIsHidden depends on the presence of the spans, so needs a second pass
        if (marker.collapsed) {
            doc.iter(from.line, to.line + 1, function (line) {
                if (lineIsHidden(doc, line)) {
                    updateLineHeight(line, 0);
                }
            });
        }

        if (marker.clearOnEnter) {
            on(marker, "beforeCursorEnter", function () {
                return marker.clear();
            });
        }

        if (marker.readOnly) {
            seeReadOnlySpans();
            if (doc.history.done.length || doc.history.undone.length) {
                doc.clearHistory();
            }
        }
        if (marker.collapsed) {
            marker.id = ++nextMarkerId;
            marker.atomic = true;
        }
        if (cm) {
            // Sync editor state
            if (updateMaxLine) {
                cm.curOp.updateMaxLine = true;
            }
            if (marker.collapsed) {
                regChange(cm, from.line, to.line + 1);
            } else if (marker.className || marker.startStyle || marker.endStyle || marker.css || marker.attributes || marker.title) {
                for (var i = from.line; i <= to.line; i++) {
                    regLineChange(cm, i, "text");
                }
            }
            if (marker.atomic) {
                reCheckSelection(cm.doc);
            }
            signalLater(cm, "markerAdded", cm, marker);
        }
        return marker;
    }

    // SHARED TEXTMARKERS

    // A shared marker spans multiple linked documents. It is
    // implemented as a meta-marker-object controlling multiple normal
    // markers.
    var SharedTextMarker = function SharedTextMarker(markers, primary) {
        this.markers = markers;
        this.primary = primary;
        for (var i = 0; i < markers.length; ++i) {
            markers[i].parent = this;
        }
    };

    SharedTextMarker.prototype.clear = function () {
        if (this.explicitlyCleared) {
            return;
        }
        this.explicitlyCleared = true;
        for (var i = 0; i < this.markers.length; ++i) {
            this.markers[i].clear();
        }
        signalLater(this, "clear");
    };

    SharedTextMarker.prototype.find = function (side, lineObj) {
        return this.primary.find(side, lineObj);
    };
    eventMixin(SharedTextMarker);

    function markTextShared(doc, from, to, options, type) {
        options = copyObj(options);
        options.shared = false;
        var markers = [_markText(doc, from, to, options, type)],
            primary = markers[0];
        var widget = options.widgetNode;
        linkedDocs(doc, function (doc) {
            if (widget) {
                options.widgetNode = widget.cloneNode(true);
            }
            markers.push(_markText(doc, _clipPos(doc, from), _clipPos(doc, to), options, type));
            for (var i = 0; i < doc.linked.length; ++i) {
                if (doc.linked[i].isParent) {
                    return;
                }
            }
            primary = lst(markers);
        });
        return new SharedTextMarker(markers, primary);
    }

    function findSharedMarkers(doc) {
        return doc.findMarks(Pos(doc.first, 0), doc.clipPos(Pos(doc.lastLine())), function (m) {
            return m.parent;
        });
    }

    function copySharedMarkers(doc, markers) {
        for (var i = 0; i < markers.length; i++) {
            var marker = markers[i],
                pos = marker.find();
            var mFrom = doc.clipPos(pos.from),
                mTo = doc.clipPos(pos.to);
            if (cmp(mFrom, mTo)) {
                var subMark = _markText(doc, mFrom, mTo, marker.primary, marker.primary.type);
                marker.markers.push(subMark);
                subMark.parent = marker;
            }
        }
    }

    function detachSharedMarkers(markers) {
        var loop = function loop(i) {
            var marker = markers[i],
                linked = [marker.primary.doc];
            linkedDocs(marker.primary.doc, function (d) {
                return linked.push(d);
            });
            for (var j = 0; j < marker.markers.length; j++) {
                var subMarker = marker.markers[j];
                if (indexOf(linked, subMarker.doc) == -1) {
                    subMarker.parent = null;
                    marker.markers.splice(j--, 1);
                }
            }
        };

        for (var i = 0; i < markers.length; i++) {
            loop(i);
        }
    }

    var nextDocId = 0;
    var Doc = function Doc(text, mode, firstLine, lineSep, direction) {
        if (!(this instanceof Doc)) {
            return new Doc(text, mode, firstLine, lineSep, direction);
        }
        if (firstLine == null) {
            firstLine = 0;
        }

        BranchChunk.call(this, [new LeafChunk([new Line("", null)])]);
        this.first = firstLine;
        this.scrollTop = this.scrollLeft = 0;
        this.cantEdit = false;
        this.cleanGeneration = 1;
        this.modeFrontier = this.highlightFrontier = firstLine;
        var start = Pos(firstLine, 0);
        this.sel = simpleSelection(start);
        this.history = new History(null);
        this.id = ++nextDocId;
        this.modeOption = mode;
        this.lineSep = lineSep;
        this.direction = direction == "rtl" ? "rtl" : "ltr";
        this.extend = false;

        if (typeof text == "string") {
            text = this.splitLines(text);
        }
        updateDoc(this, { from: start, to: start, text: text });
        setSelection(this, simpleSelection(start), sel_dontScroll);
    };

    Doc.prototype = createObj(BranchChunk.prototype, {
        constructor: Doc,
        // Iterate over the document. Supports two forms -- with only one
        // argument, it calls that for each line in the document. With
        // three, it iterates over the range given by the first two (with
        // the second being non-inclusive).
        iter: function iter(from, to, op) {
            if (op) {
                this.iterN(from - this.first, to - from, op);
            } else {
                this.iterN(this.first, this.first + this.size, from);
            }
        },

        // Non-public interface for adding and removing lines.
        insert: function insert(at, lines) {
            var height = 0;
            for (var i = 0; i < lines.length; ++i) {
                height += lines[i].height;
            }
            this.insertInner(at - this.first, lines, height);
        },
        remove: function remove(at, n) {
            this.removeInner(at - this.first, n);
        },

        // From here, the methods are part of the public interface. Most
        // are also available from CodeMirror (editor) instances.

        getValue: function getValue(lineSep) {
            var lines = getLines(this, this.first, this.first + this.size);
            if (lineSep === false) {
                return lines;
            }
            return lines.join(lineSep || this.lineSeparator());
        },
        setValue: docMethodOp(function (code) {
            var top = Pos(this.first, 0),
                last = this.first + this.size - 1;
            makeChange(this, { from: top, to: Pos(last, getLine(this, last).text.length),
                text: this.splitLines(code), origin: "setValue", full: true }, true);
            if (this.cm) {
                scrollToCoords(this.cm, 0, 0);
            }
            setSelection(this, simpleSelection(top), sel_dontScroll);
        }),
        replaceRange: function replaceRange(code, from, to, origin) {
            from = _clipPos(this, from);
            to = to ? _clipPos(this, to) : from;
            _replaceRange(this, code, from, to, origin);
        },
        getRange: function getRange(from, to, lineSep) {
            var lines = getBetween(this, _clipPos(this, from), _clipPos(this, to));
            if (lineSep === false) {
                return lines;
            }
            return lines.join(lineSep || this.lineSeparator());
        },

        getLine: function getLine(line) {
            var l = this.getLineHandle(line);return l && l.text;
        },

        getLineHandle: function getLineHandle(line) {
            if (isLine(this, line)) {
                return getLine(this, line);
            }
        },
        getLineNumber: function getLineNumber(line) {
            return lineNo(line);
        },

        getLineHandleVisualStart: function getLineHandleVisualStart(line) {
            if (typeof line == "number") {
                line = getLine(this, line);
            }
            return visualLine(line);
        },

        lineCount: function lineCount() {
            return this.size;
        },
        firstLine: function firstLine() {
            return this.first;
        },
        lastLine: function lastLine() {
            return this.first + this.size - 1;
        },

        clipPos: function clipPos(pos) {
            return _clipPos(this, pos);
        },

        getCursor: function getCursor(start) {
            var range = this.sel.primary(),
                pos;
            if (start == null || start == "head") {
                pos = range.head;
            } else if (start == "anchor") {
                pos = range.anchor;
            } else if (start == "end" || start == "to" || start === false) {
                pos = range.to();
            } else {
                pos = range.from();
            }
            return pos;
        },
        listSelections: function listSelections() {
            return this.sel.ranges;
        },
        somethingSelected: function somethingSelected() {
            return this.sel.somethingSelected();
        },

        setCursor: docMethodOp(function (line, ch, options) {
            setSimpleSelection(this, _clipPos(this, typeof line == "number" ? Pos(line, ch || 0) : line), null, options);
        }),
        setSelection: docMethodOp(function (anchor, head, options) {
            setSimpleSelection(this, _clipPos(this, anchor), _clipPos(this, head || anchor), options);
        }),
        extendSelection: docMethodOp(function (head, other, options) {
            extendSelection(this, _clipPos(this, head), other && _clipPos(this, other), options);
        }),
        extendSelections: docMethodOp(function (heads, options) {
            extendSelections(this, clipPosArray(this, heads), options);
        }),
        extendSelectionsBy: docMethodOp(function (f, options) {
            var heads = map(this.sel.ranges, f);
            extendSelections(this, clipPosArray(this, heads), options);
        }),
        setSelections: docMethodOp(function (ranges, primary, options) {
            if (!ranges.length) {
                return;
            }
            var out = [];
            for (var i = 0; i < ranges.length; i++) {
                out[i] = new Range(_clipPos(this, ranges[i].anchor), _clipPos(this, ranges[i].head));
            }
            if (primary == null) {
                primary = Math.min(ranges.length - 1, this.sel.primIndex);
            }
            setSelection(this, normalizeSelection(this.cm, out, primary), options);
        }),
        addSelection: docMethodOp(function (anchor, head, options) {
            var ranges = this.sel.ranges.slice(0);
            ranges.push(new Range(_clipPos(this, anchor), _clipPos(this, head || anchor)));
            setSelection(this, normalizeSelection(this.cm, ranges, ranges.length - 1), options);
        }),

        getSelection: function getSelection(lineSep) {
            var ranges = this.sel.ranges,
                lines;
            for (var i = 0; i < ranges.length; i++) {
                var sel = getBetween(this, ranges[i].from(), ranges[i].to());
                lines = lines ? lines.concat(sel) : sel;
            }
            if (lineSep === false) {
                return lines;
            } else {
                return lines.join(lineSep || this.lineSeparator());
            }
        },
        getSelections: function getSelections(lineSep) {
            var parts = [],
                ranges = this.sel.ranges;
            for (var i = 0; i < ranges.length; i++) {
                var sel = getBetween(this, ranges[i].from(), ranges[i].to());
                if (lineSep !== false) {
                    sel = sel.join(lineSep || this.lineSeparator());
                }
                parts[i] = sel;
            }
            return parts;
        },
        replaceSelection: function replaceSelection(code, collapse, origin) {
            var dup = [];
            for (var i = 0; i < this.sel.ranges.length; i++) {
                dup[i] = code;
            }
            this.replaceSelections(dup, collapse, origin || "+input");
        },
        replaceSelections: docMethodOp(function (code, collapse, origin) {
            var changes = [],
                sel = this.sel;
            for (var i = 0; i < sel.ranges.length; i++) {
                var range = sel.ranges[i];
                changes[i] = { from: range.from(), to: range.to(), text: this.splitLines(code[i]), origin: origin };
            }
            var newSel = collapse && collapse != "end" && computeReplacedSel(this, changes, collapse);
            for (var i$1 = changes.length - 1; i$1 >= 0; i$1--) {
                makeChange(this, changes[i$1]);
            }
            if (newSel) {
                setSelectionReplaceHistory(this, newSel);
            } else if (this.cm) {
                ensureCursorVisible(this.cm);
            }
        }),
        undo: docMethodOp(function () {
            makeChangeFromHistory(this, "undo");
        }),
        redo: docMethodOp(function () {
            makeChangeFromHistory(this, "redo");
        }),
        undoSelection: docMethodOp(function () {
            makeChangeFromHistory(this, "undo", true);
        }),
        redoSelection: docMethodOp(function () {
            makeChangeFromHistory(this, "redo", true);
        }),

        setExtending: function setExtending(val) {
            this.extend = val;
        },
        getExtending: function getExtending() {
            return this.extend;
        },

        historySize: function historySize() {
            var hist = this.history,
                done = 0,
                undone = 0;
            for (var i = 0; i < hist.done.length; i++) {
                if (!hist.done[i].ranges) {
                    ++done;
                }
            }
            for (var i$1 = 0; i$1 < hist.undone.length; i$1++) {
                if (!hist.undone[i$1].ranges) {
                    ++undone;
                }
            }
            return { undo: done, redo: undone };
        },
        clearHistory: function clearHistory() {
            var this$1 = this;

            this.history = new History(this.history.maxGeneration);
            linkedDocs(this, function (doc) {
                return doc.history = this$1.history;
            }, true);
        },

        markClean: function markClean() {
            this.cleanGeneration = this.changeGeneration(true);
        },
        changeGeneration: function changeGeneration(forceSplit) {
            if (forceSplit) {
                this.history.lastOp = this.history.lastSelOp = this.history.lastOrigin = null;
            }
            return this.history.generation;
        },
        isClean: function isClean(gen) {
            return this.history.generation == (gen || this.cleanGeneration);
        },

        getHistory: function getHistory() {
            return { done: copyHistoryArray(this.history.done),
                undone: copyHistoryArray(this.history.undone) };
        },
        setHistory: function setHistory(histData) {
            var hist = this.history = new History(this.history.maxGeneration);
            hist.done = copyHistoryArray(histData.done.slice(0), null, true);
            hist.undone = copyHistoryArray(histData.undone.slice(0), null, true);
        },

        setGutterMarker: docMethodOp(function (line, gutterID, value) {
            return changeLine(this, line, "gutter", function (line) {
                var markers = line.gutterMarkers || (line.gutterMarkers = {});
                markers[gutterID] = value;
                if (!value && isEmpty(markers)) {
                    line.gutterMarkers = null;
                }
                return true;
            });
        }),

        clearGutter: docMethodOp(function (gutterID) {
            var this$1 = this;

            this.iter(function (line) {
                if (line.gutterMarkers && line.gutterMarkers[gutterID]) {
                    changeLine(this$1, line, "gutter", function () {
                        line.gutterMarkers[gutterID] = null;
                        if (isEmpty(line.gutterMarkers)) {
                            line.gutterMarkers = null;
                        }
                        return true;
                    });
                }
            });
        }),

        lineInfo: function lineInfo(line) {
            var n;
            if (typeof line == "number") {
                if (!isLine(this, line)) {
                    return null;
                }
                n = line;
                line = getLine(this, line);
                if (!line) {
                    return null;
                }
            } else {
                n = lineNo(line);
                if (n == null) {
                    return null;
                }
            }
            return { line: n, handle: line, text: line.text, gutterMarkers: line.gutterMarkers,
                textClass: line.textClass, bgClass: line.bgClass, wrapClass: line.wrapClass,
                widgets: line.widgets };
        },

        addLineClass: docMethodOp(function (handle, where, cls) {
            return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function (line) {
                var prop = where == "text" ? "textClass" : where == "background" ? "bgClass" : where == "gutter" ? "gutterClass" : "wrapClass";
                if (!line[prop]) {
                    line[prop] = cls;
                } else if (classTest(cls).test(line[prop])) {
                    return false;
                } else {
                    line[prop] += " " + cls;
                }
                return true;
            });
        }),
        removeLineClass: docMethodOp(function (handle, where, cls) {
            return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function (line) {
                var prop = where == "text" ? "textClass" : where == "background" ? "bgClass" : where == "gutter" ? "gutterClass" : "wrapClass";
                var cur = line[prop];
                if (!cur) {
                    return false;
                } else if (cls == null) {
                    line[prop] = null;
                } else {
                    var found = cur.match(classTest(cls));
                    if (!found) {
                        return false;
                    }
                    var end = found.index + found[0].length;
                    line[prop] = cur.slice(0, found.index) + (!found.index || end == cur.length ? "" : " ") + cur.slice(end) || null;
                }
                return true;
            });
        }),

        addLineWidget: docMethodOp(function (handle, node, options) {
            return addLineWidget(this, handle, node, options);
        }),
        removeLineWidget: function removeLineWidget(widget) {
            widget.clear();
        },

        markText: function markText(from, to, options) {
            return _markText(this, _clipPos(this, from), _clipPos(this, to), options, options && options.type || "range");
        },
        setBookmark: function setBookmark(pos, options) {
            var realOpts = { replacedWith: options && (options.nodeType == null ? options.widget : options),
                insertLeft: options && options.insertLeft,
                clearWhenEmpty: false, shared: options && options.shared,
                handleMouseEvents: options && options.handleMouseEvents };
            pos = _clipPos(this, pos);
            return _markText(this, pos, pos, realOpts, "bookmark");
        },
        findMarksAt: function findMarksAt(pos) {
            pos = _clipPos(this, pos);
            var markers = [],
                spans = getLine(this, pos.line).markedSpans;
            if (spans) {
                for (var i = 0; i < spans.length; ++i) {
                    var span = spans[i];
                    if ((span.from == null || span.from <= pos.ch) && (span.to == null || span.to >= pos.ch)) {
                        markers.push(span.marker.parent || span.marker);
                    }
                }
            }
            return markers;
        },
        findMarks: function findMarks(from, to, filter) {
            from = _clipPos(this, from);to = _clipPos(this, to);
            var found = [],
                lineNo = from.line;
            this.iter(from.line, to.line + 1, function (line) {
                var spans = line.markedSpans;
                if (spans) {
                    for (var i = 0; i < spans.length; i++) {
                        var span = spans[i];
                        if (!(span.to != null && lineNo == from.line && from.ch >= span.to || span.from == null && lineNo != from.line || span.from != null && lineNo == to.line && span.from >= to.ch) && (!filter || filter(span.marker))) {
                            found.push(span.marker.parent || span.marker);
                        }
                    }
                }
                ++lineNo;
            });
            return found;
        },
        getAllMarks: function getAllMarks() {
            var markers = [];
            this.iter(function (line) {
                var sps = line.markedSpans;
                if (sps) {
                    for (var i = 0; i < sps.length; ++i) {
                        if (sps[i].from != null) {
                            markers.push(sps[i].marker);
                        }
                    }
                }
            });
            return markers;
        },

        posFromIndex: function posFromIndex(off) {
            var ch,
                lineNo = this.first,
                sepSize = this.lineSeparator().length;
            this.iter(function (line) {
                var sz = line.text.length + sepSize;
                if (sz > off) {
                    ch = off;return true;
                }
                off -= sz;
                ++lineNo;
            });
            return _clipPos(this, Pos(lineNo, ch));
        },
        indexFromPos: function indexFromPos(coords) {
            coords = _clipPos(this, coords);
            var index = coords.ch;
            if (coords.line < this.first || coords.ch < 0) {
                return 0;
            }
            var sepSize = this.lineSeparator().length;
            this.iter(this.first, coords.line, function (line) {
                // iter aborts when callback returns a truthy value
                index += line.text.length + sepSize;
            });
            return index;
        },

        copy: function copy(copyHistory) {
            var doc = new Doc(getLines(this, this.first, this.first + this.size), this.modeOption, this.first, this.lineSep, this.direction);
            doc.scrollTop = this.scrollTop;doc.scrollLeft = this.scrollLeft;
            doc.sel = this.sel;
            doc.extend = false;
            if (copyHistory) {
                doc.history.undoDepth = this.history.undoDepth;
                doc.setHistory(this.getHistory());
            }
            return doc;
        },

        linkedDoc: function linkedDoc(options) {
            if (!options) {
                options = {};
            }
            var from = this.first,
                to = this.first + this.size;
            if (options.from != null && options.from > from) {
                from = options.from;
            }
            if (options.to != null && options.to < to) {
                to = options.to;
            }
            var copy = new Doc(getLines(this, from, to), options.mode || this.modeOption, from, this.lineSep, this.direction);
            if (options.sharedHist) {
                copy.history = this.history;
            }(this.linked || (this.linked = [])).push({ doc: copy, sharedHist: options.sharedHist });
            copy.linked = [{ doc: this, isParent: true, sharedHist: options.sharedHist }];
            copySharedMarkers(copy, findSharedMarkers(this));
            return copy;
        },
        unlinkDoc: function unlinkDoc(other) {
            if (other instanceof CodeMirror) {
                other = other.doc;
            }
            if (this.linked) {
                for (var i = 0; i < this.linked.length; ++i) {
                    var link = this.linked[i];
                    if (link.doc != other) {
                        continue;
                    }
                    this.linked.splice(i, 1);
                    other.unlinkDoc(this);
                    detachSharedMarkers(findSharedMarkers(this));
                    break;
                }
            }
            // If the histories were shared, split them again
            if (other.history == this.history) {
                var splitIds = [other.id];
                linkedDocs(other, function (doc) {
                    return splitIds.push(doc.id);
                }, true);
                other.history = new History(null);
                other.history.done = copyHistoryArray(this.history.done, splitIds);
                other.history.undone = copyHistoryArray(this.history.undone, splitIds);
            }
        },
        iterLinkedDocs: function iterLinkedDocs(f) {
            linkedDocs(this, f);
        },

        getMode: function getMode() {
            return this.mode;
        },
        getEditor: function getEditor() {
            return this.cm;
        },

        splitLines: function splitLines(str) {
            if (this.lineSep) {
                return str.split(this.lineSep);
            }
            return splitLinesAuto(str);
        },
        lineSeparator: function lineSeparator() {
            return this.lineSep || "\n";
        },

        setDirection: docMethodOp(function (dir) {
            if (dir != "rtl") {
                dir = "ltr";
            }
            if (dir == this.direction) {
                return;
            }
            this.direction = dir;
            this.iter(function (line) {
                return line.order = null;
            });
            if (this.cm) {
                directionChanged(this.cm);
            }
        })
    });

    // Public alias.
    Doc.prototype.eachLine = Doc.prototype.iter;

    // Kludge to work around strange IE behavior where it'll sometimes
    // re-fire a series of drag-related events right after the drop (#1551)
    var lastDrop = 0;

    function onDrop(e) {
        var cm = this;
        clearDragCursor(cm);
        if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e)) {
            return;
        }
        e_preventDefault(e);
        if (ie) {
            lastDrop = +new Date();
        }
        var pos = posFromMouse(cm, e, true),
            files = e.dataTransfer.files;
        if (!pos || cm.isReadOnly()) {
            return;
        }
        // Might be a file drop, in which case we simply extract the text
        // and insert it.
        if (files && files.length && window.FileReader && window.File) {
            var n = files.length,
                text = Array(n),
                read = 0;
            var markAsReadAndPasteIfAllFilesAreRead = function markAsReadAndPasteIfAllFilesAreRead() {
                if (++read == n) {
                    operation(cm, function () {
                        pos = _clipPos(cm.doc, pos);
                        var change = { from: pos, to: pos,
                            text: cm.doc.splitLines(text.filter(function (t) {
                                return t != null;
                            }).join(cm.doc.lineSeparator())),
                            origin: "paste" };
                        makeChange(cm.doc, change);
                        setSelectionReplaceHistory(cm.doc, simpleSelection(pos, changeEnd(change)));
                    })();
                }
            };
            var readTextFromFile = function readTextFromFile(file, i) {
                if (cm.options.allowDropFileTypes && indexOf(cm.options.allowDropFileTypes, file.type) == -1) {
                    markAsReadAndPasteIfAllFilesAreRead();
                    return;
                }
                var reader = new FileReader();
                reader.onerror = function () {
                    return markAsReadAndPasteIfAllFilesAreRead();
                };
                reader.onload = function () {
                    var content = reader.result;
                    if (/[\x00-\x08\x0e-\x1f]{2}/.test(content)) {
                        markAsReadAndPasteIfAllFilesAreRead();
                        return;
                    }
                    text[i] = content;
                    markAsReadAndPasteIfAllFilesAreRead();
                };
                reader.readAsText(file);
            };
            for (var i = 0; i < files.length; i++) {
                readTextFromFile(files[i], i);
            }
        } else {
            // Normal drop
            // Don't do a replace if the drop happened inside of the selected text.
            if (cm.state.draggingText && cm.doc.sel.contains(pos) > -1) {
                cm.state.draggingText(e);
                // Ensure the editor is re-focused
                setTimeout(function () {
                    return cm.display.input.focus();
                }, 20);
                return;
            }
            try {
                var text$1 = e.dataTransfer.getData("Text");
                if (text$1) {
                    var selected;
                    if (cm.state.draggingText && !cm.state.draggingText.copy) {
                        selected = cm.listSelections();
                    }
                    setSelectionNoUndo(cm.doc, simpleSelection(pos, pos));
                    if (selected) {
                        for (var i$1 = 0; i$1 < selected.length; ++i$1) {
                            _replaceRange(cm.doc, "", selected[i$1].anchor, selected[i$1].head, "drag");
                        }
                    }
                    cm.replaceSelection(text$1, "around", "paste");
                    cm.display.input.focus();
                }
            } catch (e) {}
        }
    }

    function onDragStart(cm, e) {
        if (ie && (!cm.state.draggingText || +new Date() - lastDrop < 100)) {
            e_stop(e);return;
        }
        if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e)) {
            return;
        }

        e.dataTransfer.setData("Text", cm.getSelection());
        e.dataTransfer.effectAllowed = "copyMove";

        // Use dummy image instead of default browsers image.
        // Recent Safari (~6.0.2) have a tendency to segfault when this happens, so we don't do it there.
        if (e.dataTransfer.setDragImage && !safari) {
            var img = elt("img", null, null, "position: fixed; left: 0; top: 0;");
            img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
            if (presto) {
                img.width = img.height = 1;
                cm.display.wrapper.appendChild(img);
                // Force a relayout, or Opera won't use our image for some obscure reason
                img._top = img.offsetTop;
            }
            e.dataTransfer.setDragImage(img, 0, 0);
            if (presto) {
                img.parentNode.removeChild(img);
            }
        }
    }

    function onDragOver(cm, e) {
        var pos = posFromMouse(cm, e);
        if (!pos) {
            return;
        }
        var frag = document.createDocumentFragment();
        drawSelectionCursor(cm, pos, frag);
        if (!cm.display.dragCursor) {
            cm.display.dragCursor = elt("div", null, "CodeMirror-cursors CodeMirror-dragcursors");
            cm.display.lineSpace.insertBefore(cm.display.dragCursor, cm.display.cursorDiv);
        }
        removeChildrenAndAdd(cm.display.dragCursor, frag);
    }

    function clearDragCursor(cm) {
        if (cm.display.dragCursor) {
            cm.display.lineSpace.removeChild(cm.display.dragCursor);
            cm.display.dragCursor = null;
        }
    }

    // These must be handled carefully, because naively registering a
    // handler for each editor will cause the editors to never be
    // garbage collected.

    function forEachCodeMirror(f) {
        if (!document.getElementsByClassName) {
            return;
        }
        var byClass = document.getElementsByClassName("CodeMirror"),
            editors = [];
        for (var i = 0; i < byClass.length; i++) {
            var cm = byClass[i].CodeMirror;
            if (cm) {
                editors.push(cm);
            }
        }
        if (editors.length) {
            editors[0].operation(function () {
                for (var i = 0; i < editors.length; i++) {
                    f(editors[i]);
                }
            });
        }
    }

    var globalsRegistered = false;
    function ensureGlobalHandlers() {
        if (globalsRegistered) {
            return;
        }
        registerGlobalHandlers();
        globalsRegistered = true;
    }
    function registerGlobalHandlers() {
        // When the window resizes, we need to refresh active editors.
        var resizeTimer;
        on(window, "resize", function () {
            if (resizeTimer == null) {
                resizeTimer = setTimeout(function () {
                    resizeTimer = null;
                    forEachCodeMirror(onResize);
                }, 100);
            }
        });
        // When the window loses focus, we want to show the editor as blurred
        on(window, "blur", function () {
            return forEachCodeMirror(onBlur);
        });
    }
    // Called when the window resizes
    function onResize(cm) {
        var d = cm.display;
        // Might be a text scaling operation, clear size caches.
        d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;
        d.scrollbarsClipped = false;
        cm.setSize();
    }

    var keyNames = {
        3: "Pause", 8: "Backspace", 9: "Tab", 13: "Enter", 16: "Shift", 17: "Ctrl", 18: "Alt",
        19: "Pause", 20: "CapsLock", 27: "Esc", 32: "Space", 33: "PageUp", 34: "PageDown", 35: "End",
        36: "Home", 37: "Left", 38: "Up", 39: "Right", 40: "Down", 44: "PrintScrn", 45: "Insert",
        46: "Delete", 59: ";", 61: "=", 91: "Mod", 92: "Mod", 93: "Mod",
        106: "*", 107: "=", 109: "-", 110: ".", 111: "/", 145: "ScrollLock",
        173: "-", 186: ";", 187: "=", 188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\",
        221: "]", 222: "'", 63232: "Up", 63233: "Down", 63234: "Left", 63235: "Right", 63272: "Delete",
        63273: "Home", 63275: "End", 63276: "PageUp", 63277: "PageDown", 63302: "Insert"
    };

    // Number keys
    for (var i = 0; i < 10; i++) {
        keyNames[i + 48] = keyNames[i + 96] = String(i);
    }
    // Alphabetic keys
    for (var i$1 = 65; i$1 <= 90; i$1++) {
        keyNames[i$1] = String.fromCharCode(i$1);
    }
    // Function keys
    for (var i$2 = 1; i$2 <= 12; i$2++) {
        keyNames[i$2 + 111] = keyNames[i$2 + 63235] = "F" + i$2;
    }

    var keyMap = {};

    keyMap.basic = {
        "Left": "goCharLeft", "Right": "goCharRight", "Up": "goLineUp", "Down": "goLineDown",
        "End": "goLineEnd", "Home": "goLineStartSmart", "PageUp": "goPageUp", "PageDown": "goPageDown",
        "Delete": "delCharAfter", "Backspace": "delCharBefore", "Shift-Backspace": "delCharBefore",
        "Tab": "defaultTab", "Shift-Tab": "indentAuto",
        "Enter": "newlineAndIndent", "Insert": "toggleOverwrite",
        "Esc": "singleSelection"
    };
    // Note that the save and find-related commands aren't defined by
    // default. User code or addons can define them. Unknown commands
    // are simply ignored.
    keyMap.pcDefault = {
        "Ctrl-A": "selectAll", "Ctrl-D": "deleteLine", "Ctrl-Z": "undo", "Shift-Ctrl-Z": "redo", "Ctrl-Y": "redo",
        "Ctrl-Home": "goDocStart", "Ctrl-End": "goDocEnd", "Ctrl-Up": "goLineUp", "Ctrl-Down": "goLineDown",
        "Ctrl-Left": "goGroupLeft", "Ctrl-Right": "goGroupRight", "Alt-Left": "goLineStart", "Alt-Right": "goLineEnd",
        "Ctrl-Backspace": "delGroupBefore", "Ctrl-Delete": "delGroupAfter", "Ctrl-S": "save", "Ctrl-F": "find",
        "Ctrl-G": "findNext", "Shift-Ctrl-G": "findPrev", "Shift-Ctrl-F": "replace", "Shift-Ctrl-R": "replaceAll",
        "Ctrl-[": "indentLess", "Ctrl-]": "indentMore",
        "Ctrl-U": "undoSelection", "Shift-Ctrl-U": "redoSelection", "Alt-U": "redoSelection",
        "fallthrough": "basic"
    };
    // Very basic readline/emacs-style bindings, which are standard on Mac.
    keyMap.emacsy = {
        "Ctrl-F": "goCharRight", "Ctrl-B": "goCharLeft", "Ctrl-P": "goLineUp", "Ctrl-N": "goLineDown",
        "Alt-F": "goWordRight", "Alt-B": "goWordLeft", "Ctrl-A": "goLineStart", "Ctrl-E": "goLineEnd",
        "Ctrl-V": "goPageDown", "Shift-Ctrl-V": "goPageUp", "Ctrl-D": "delCharAfter", "Ctrl-H": "delCharBefore",
        "Alt-D": "delWordAfter", "Alt-Backspace": "delWordBefore", "Ctrl-K": "killLine", "Ctrl-T": "transposeChars",
        "Ctrl-O": "openLine"
    };
    keyMap.macDefault = {
        "Cmd-A": "selectAll", "Cmd-D": "deleteLine", "Cmd-Z": "undo", "Shift-Cmd-Z": "redo", "Cmd-Y": "redo",
        "Cmd-Home": "goDocStart", "Cmd-Up": "goDocStart", "Cmd-End": "goDocEnd", "Cmd-Down": "goDocEnd", "Alt-Left": "goGroupLeft",
        "Alt-Right": "goGroupRight", "Cmd-Left": "goLineLeft", "Cmd-Right": "goLineRight", "Alt-Backspace": "delGroupBefore",
        "Ctrl-Alt-Backspace": "delGroupAfter", "Alt-Delete": "delGroupAfter", "Cmd-S": "save", "Cmd-F": "find",
        "Cmd-G": "findNext", "Shift-Cmd-G": "findPrev", "Cmd-Alt-F": "replace", "Shift-Cmd-Alt-F": "replaceAll",
        "Cmd-[": "indentLess", "Cmd-]": "indentMore", "Cmd-Backspace": "delWrappedLineLeft", "Cmd-Delete": "delWrappedLineRight",
        "Cmd-U": "undoSelection", "Shift-Cmd-U": "redoSelection", "Ctrl-Up": "goDocStart", "Ctrl-Down": "goDocEnd",
        "fallthrough": ["basic", "emacsy"]
    };
    keyMap["default"] = mac ? keyMap.macDefault : keyMap.pcDefault;

    // KEYMAP DISPATCH

    function normalizeKeyName(name) {
        var parts = name.split(/-(?!$)/);
        name = parts[parts.length - 1];
        var alt, ctrl, shift, cmd;
        for (var i = 0; i < parts.length - 1; i++) {
            var mod = parts[i];
            if (/^(cmd|meta|m)$/i.test(mod)) {
                cmd = true;
            } else if (/^a(lt)?$/i.test(mod)) {
                alt = true;
            } else if (/^(c|ctrl|control)$/i.test(mod)) {
                ctrl = true;
            } else if (/^s(hift)?$/i.test(mod)) {
                shift = true;
            } else {
                throw new Error("Unrecognized modifier name: " + mod);
            }
        }
        if (alt) {
            name = "Alt-" + name;
        }
        if (ctrl) {
            name = "Ctrl-" + name;
        }
        if (cmd) {
            name = "Cmd-" + name;
        }
        if (shift) {
            name = "Shift-" + name;
        }
        return name;
    }

    // This is a kludge to keep keymaps mostly working as raw objects
    // (backwards compatibility) while at the same time support features
    // like normalization and multi-stroke key bindings. It compiles a
    // new normalized keymap, and then updates the old object to reflect
    // this.
    function normalizeKeyMap(keymap) {
        var copy = {};
        for (var keyname in keymap) {
            if (keymap.hasOwnProperty(keyname)) {
                var value = keymap[keyname];
                if (/^(name|fallthrough|(de|at)tach)$/.test(keyname)) {
                    continue;
                }
                if (value == "...") {
                    delete keymap[keyname];continue;
                }

                var keys = map(keyname.split(" "), normalizeKeyName);
                for (var i = 0; i < keys.length; i++) {
                    var val = void 0,
                        name = void 0;
                    if (i == keys.length - 1) {
                        name = keys.join(" ");
                        val = value;
                    } else {
                        name = keys.slice(0, i + 1).join(" ");
                        val = "...";
                    }
                    var prev = copy[name];
                    if (!prev) {
                        copy[name] = val;
                    } else if (prev != val) {
                        throw new Error("Inconsistent bindings for " + name);
                    }
                }
                delete keymap[keyname];
            }
        }
        for (var prop in copy) {
            keymap[prop] = copy[prop];
        }
        return keymap;
    }

    function lookupKey(key, map, handle, context) {
        map = getKeyMap(map);
        var found = map.call ? map.call(key, context) : map[key];
        if (found === false) {
            return "nothing";
        }
        if (found === "...") {
            return "multi";
        }
        if (found != null && handle(found)) {
            return "handled";
        }

        if (map.fallthrough) {
            if (Object.prototype.toString.call(map.fallthrough) != "[object Array]") {
                return lookupKey(key, map.fallthrough, handle, context);
            }
            for (var i = 0; i < map.fallthrough.length; i++) {
                var result = lookupKey(key, map.fallthrough[i], handle, context);
                if (result) {
                    return result;
                }
            }
        }
    }

    // Modifier key presses don't count as 'real' key presses for the
    // purpose of keymap fallthrough.
    function isModifierKey(value) {
        var name = typeof value == "string" ? value : keyNames[value.keyCode];
        return name == "Ctrl" || name == "Alt" || name == "Shift" || name == "Mod";
    }

    function addModifierNames(name, event, noShift) {
        var base = name;
        if (event.altKey && base != "Alt") {
            name = "Alt-" + name;
        }
        if ((flipCtrlCmd ? event.metaKey : event.ctrlKey) && base != "Ctrl") {
            name = "Ctrl-" + name;
        }
        if ((flipCtrlCmd ? event.ctrlKey : event.metaKey) && base != "Cmd") {
            name = "Cmd-" + name;
        }
        if (!noShift && event.shiftKey && base != "Shift") {
            name = "Shift-" + name;
        }
        return name;
    }

    // Look up the name of a key as indicated by an event object.
    function keyName(event, noShift) {
        if (presto && event.keyCode == 34 && event["char"]) {
            return false;
        }
        var name = keyNames[event.keyCode];
        if (name == null || event.altGraphKey) {
            return false;
        }
        // Ctrl-ScrollLock has keyCode 3, same as Ctrl-Pause,
        // so we'll use event.code when available (Chrome 48+, FF 38+, Safari 10.1+)
        if (event.keyCode == 3 && event.code) {
            name = event.code;
        }
        return addModifierNames(name, event, noShift);
    }

    function getKeyMap(val) {
        return typeof val == "string" ? keyMap[val] : val;
    }

    // Helper for deleting text near the selection(s), used to implement
    // backspace, delete, and similar functionality.
    function deleteNearSelection(cm, compute) {
        var ranges = cm.doc.sel.ranges,
            kill = [];
        // Build up a set of ranges to kill first, merging overlapping
        // ranges.
        for (var i = 0; i < ranges.length; i++) {
            var toKill = compute(ranges[i]);
            while (kill.length && cmp(toKill.from, lst(kill).to) <= 0) {
                var replaced = kill.pop();
                if (cmp(replaced.from, toKill.from) < 0) {
                    toKill.from = replaced.from;
                    break;
                }
            }
            kill.push(toKill);
        }
        // Next, remove those actual ranges.
        runInOp(cm, function () {
            for (var i = kill.length - 1; i >= 0; i--) {
                _replaceRange(cm.doc, "", kill[i].from, kill[i].to, "+delete");
            }
            ensureCursorVisible(cm);
        });
    }

    function moveCharLogically(line, ch, dir) {
        var target = skipExtendingChars(line.text, ch + dir, dir);
        return target < 0 || target > line.text.length ? null : target;
    }

    function moveLogically(line, start, dir) {
        var ch = moveCharLogically(line, start.ch, dir);
        return ch == null ? null : new Pos(start.line, ch, dir < 0 ? "after" : "before");
    }

    function endOfLine(visually, cm, lineObj, lineNo, dir) {
        if (visually) {
            if (cm.getOption("direction") == "rtl") {
                dir = -dir;
            }
            var order = getOrder(lineObj, cm.doc.direction);
            if (order) {
                var part = dir < 0 ? lst(order) : order[0];
                var moveInStorageOrder = dir < 0 == (part.level == 1);
                var sticky = moveInStorageOrder ? "after" : "before";
                var ch;
                // With a wrapped rtl chunk (possibly spanning multiple bidi parts),
                // it could be that the last bidi part is not on the last visual line,
                // since visual lines contain content order-consecutive chunks.
                // Thus, in rtl, we are looking for the first (content-order) character
                // in the rtl chunk that is on the last line (that is, the same line
                // as the last (content-order) character).
                if (part.level > 0 || cm.doc.direction == "rtl") {
                    var prep = prepareMeasureForLine(cm, lineObj);
                    ch = dir < 0 ? lineObj.text.length - 1 : 0;
                    var targetTop = measureCharPrepared(cm, prep, ch).top;
                    ch = findFirst(function (ch) {
                        return measureCharPrepared(cm, prep, ch).top == targetTop;
                    }, dir < 0 == (part.level == 1) ? part.from : part.to - 1, ch);
                    if (sticky == "before") {
                        ch = moveCharLogically(lineObj, ch, 1);
                    }
                } else {
                    ch = dir < 0 ? part.to : part.from;
                }
                return new Pos(lineNo, ch, sticky);
            }
        }
        return new Pos(lineNo, dir < 0 ? lineObj.text.length : 0, dir < 0 ? "before" : "after");
    }

    function moveVisually(cm, line, start, dir) {
        var bidi = getOrder(line, cm.doc.direction);
        if (!bidi) {
            return moveLogically(line, start, dir);
        }
        if (start.ch >= line.text.length) {
            start.ch = line.text.length;
            start.sticky = "before";
        } else if (start.ch <= 0) {
            start.ch = 0;
            start.sticky = "after";
        }
        var partPos = getBidiPartAt(bidi, start.ch, start.sticky),
            part = bidi[partPos];
        if (cm.doc.direction == "ltr" && part.level % 2 == 0 && (dir > 0 ? part.to > start.ch : part.from < start.ch)) {
            // Case 1: We move within an ltr part in an ltr editor. Even with wrapped lines,
            // nothing interesting happens.
            return moveLogically(line, start, dir);
        }

        var mv = function mv(pos, dir) {
            return moveCharLogically(line, pos instanceof Pos ? pos.ch : pos, dir);
        };
        var prep;
        var getWrappedLineExtent = function getWrappedLineExtent(ch) {
            if (!cm.options.lineWrapping) {
                return { begin: 0, end: line.text.length };
            }
            prep = prep || prepareMeasureForLine(cm, line);
            return wrappedLineExtentChar(cm, line, prep, ch);
        };
        var wrappedLineExtent = getWrappedLineExtent(start.sticky == "before" ? mv(start, -1) : start.ch);

        if (cm.doc.direction == "rtl" || part.level == 1) {
            var moveInStorageOrder = part.level == 1 == dir < 0;
            var ch = mv(start, moveInStorageOrder ? 1 : -1);
            if (ch != null && (!moveInStorageOrder ? ch >= part.from && ch >= wrappedLineExtent.begin : ch <= part.to && ch <= wrappedLineExtent.end)) {
                // Case 2: We move within an rtl part or in an rtl editor on the same visual line
                var sticky = moveInStorageOrder ? "before" : "after";
                return new Pos(start.line, ch, sticky);
            }
        }

        // Case 3: Could not move within this bidi part in this visual line, so leave
        // the current bidi part

        var searchInVisualLine = function searchInVisualLine(partPos, dir, wrappedLineExtent) {
            var getRes = function getRes(ch, moveInStorageOrder) {
                return moveInStorageOrder ? new Pos(start.line, mv(ch, 1), "before") : new Pos(start.line, ch, "after");
            };

            for (; partPos >= 0 && partPos < bidi.length; partPos += dir) {
                var part = bidi[partPos];
                var moveInStorageOrder = dir > 0 == (part.level != 1);
                var ch = moveInStorageOrder ? wrappedLineExtent.begin : mv(wrappedLineExtent.end, -1);
                if (part.from <= ch && ch < part.to) {
                    return getRes(ch, moveInStorageOrder);
                }
                ch = moveInStorageOrder ? part.from : mv(part.to, -1);
                if (wrappedLineExtent.begin <= ch && ch < wrappedLineExtent.end) {
                    return getRes(ch, moveInStorageOrder);
                }
            }
        };

        // Case 3a: Look for other bidi parts on the same visual line
        var res = searchInVisualLine(partPos + dir, dir, wrappedLineExtent);
        if (res) {
            return res;
        }

        // Case 3b: Look for other bidi parts on the next visual line
        var nextCh = dir > 0 ? wrappedLineExtent.end : mv(wrappedLineExtent.begin, -1);
        if (nextCh != null && !(dir > 0 && nextCh == line.text.length)) {
            res = searchInVisualLine(dir > 0 ? 0 : bidi.length - 1, dir, getWrappedLineExtent(nextCh));
            if (res) {
                return res;
            }
        }

        // Case 4: Nowhere to move
        return null;
    }

    // Commands are parameter-less actions that can be performed on an
    // editor, mostly used for keybindings.
    var commands = {
        selectAll: selectAll,
        singleSelection: function singleSelection(cm) {
            return cm.setSelection(cm.getCursor("anchor"), cm.getCursor("head"), sel_dontScroll);
        },
        killLine: function killLine(cm) {
            return deleteNearSelection(cm, function (range) {
                if (range.empty()) {
                    var len = getLine(cm.doc, range.head.line).text.length;
                    if (range.head.ch == len && range.head.line < cm.lastLine()) {
                        return { from: range.head, to: Pos(range.head.line + 1, 0) };
                    } else {
                        return { from: range.head, to: Pos(range.head.line, len) };
                    }
                } else {
                    return { from: range.from(), to: range.to() };
                }
            });
        },
        deleteLine: function deleteLine(cm) {
            return deleteNearSelection(cm, function (range) {
                return {
                    from: Pos(range.from().line, 0),
                    to: _clipPos(cm.doc, Pos(range.to().line + 1, 0))
                };
            });
        },
        delLineLeft: function delLineLeft(cm) {
            return deleteNearSelection(cm, function (range) {
                return {
                    from: Pos(range.from().line, 0), to: range.from()
                };
            });
        },
        delWrappedLineLeft: function delWrappedLineLeft(cm) {
            return deleteNearSelection(cm, function (range) {
                var top = cm.charCoords(range.head, "div").top + 5;
                var leftPos = cm.coordsChar({ left: 0, top: top }, "div");
                return { from: leftPos, to: range.from() };
            });
        },
        delWrappedLineRight: function delWrappedLineRight(cm) {
            return deleteNearSelection(cm, function (range) {
                var top = cm.charCoords(range.head, "div").top + 5;
                var rightPos = cm.coordsChar({ left: cm.display.lineDiv.offsetWidth + 100, top: top }, "div");
                return { from: range.from(), to: rightPos };
            });
        },
        undo: function undo(cm) {
            return cm.undo();
        },
        redo: function redo(cm) {
            return cm.redo();
        },
        undoSelection: function undoSelection(cm) {
            return cm.undoSelection();
        },
        redoSelection: function redoSelection(cm) {
            return cm.redoSelection();
        },
        goDocStart: function goDocStart(cm) {
            return cm.extendSelection(Pos(cm.firstLine(), 0));
        },
        goDocEnd: function goDocEnd(cm) {
            return cm.extendSelection(Pos(cm.lastLine()));
        },
        goLineStart: function goLineStart(cm) {
            return cm.extendSelectionsBy(function (range) {
                return lineStart(cm, range.head.line);
            }, { origin: "+move", bias: 1 });
        },
        goLineStartSmart: function goLineStartSmart(cm) {
            return cm.extendSelectionsBy(function (range) {
                return lineStartSmart(cm, range.head);
            }, { origin: "+move", bias: 1 });
        },
        goLineEnd: function goLineEnd(cm) {
            return cm.extendSelectionsBy(function (range) {
                return lineEnd(cm, range.head.line);
            }, { origin: "+move", bias: -1 });
        },
        goLineRight: function goLineRight(cm) {
            return cm.extendSelectionsBy(function (range) {
                var top = cm.cursorCoords(range.head, "div").top + 5;
                return cm.coordsChar({ left: cm.display.lineDiv.offsetWidth + 100, top: top }, "div");
            }, sel_move);
        },
        goLineLeft: function goLineLeft(cm) {
            return cm.extendSelectionsBy(function (range) {
                var top = cm.cursorCoords(range.head, "div").top + 5;
                return cm.coordsChar({ left: 0, top: top }, "div");
            }, sel_move);
        },
        goLineLeftSmart: function goLineLeftSmart(cm) {
            return cm.extendSelectionsBy(function (range) {
                var top = cm.cursorCoords(range.head, "div").top + 5;
                var pos = cm.coordsChar({ left: 0, top: top }, "div");
                if (pos.ch < cm.getLine(pos.line).search(/\S/)) {
                    return lineStartSmart(cm, range.head);
                }
                return pos;
            }, sel_move);
        },
        goLineUp: function goLineUp(cm) {
            return cm.moveV(-1, "line");
        },
        goLineDown: function goLineDown(cm) {
            return cm.moveV(1, "line");
        },
        goPageUp: function goPageUp(cm) {
            return cm.moveV(-1, "page");
        },
        goPageDown: function goPageDown(cm) {
            return cm.moveV(1, "page");
        },
        goCharLeft: function goCharLeft(cm) {
            return cm.moveH(-1, "char");
        },
        goCharRight: function goCharRight(cm) {
            return cm.moveH(1, "char");
        },
        goColumnLeft: function goColumnLeft(cm) {
            return cm.moveH(-1, "column");
        },
        goColumnRight: function goColumnRight(cm) {
            return cm.moveH(1, "column");
        },
        goWordLeft: function goWordLeft(cm) {
            return cm.moveH(-1, "word");
        },
        goGroupRight: function goGroupRight(cm) {
            return cm.moveH(1, "group");
        },
        goGroupLeft: function goGroupLeft(cm) {
            return cm.moveH(-1, "group");
        },
        goWordRight: function goWordRight(cm) {
            return cm.moveH(1, "word");
        },
        delCharBefore: function delCharBefore(cm) {
            return cm.deleteH(-1, "char");
        },
        delCharAfter: function delCharAfter(cm) {
            return cm.deleteH(1, "char");
        },
        delWordBefore: function delWordBefore(cm) {
            return cm.deleteH(-1, "word");
        },
        delWordAfter: function delWordAfter(cm) {
            return cm.deleteH(1, "word");
        },
        delGroupBefore: function delGroupBefore(cm) {
            return cm.deleteH(-1, "group");
        },
        delGroupAfter: function delGroupAfter(cm) {
            return cm.deleteH(1, "group");
        },
        indentAuto: function indentAuto(cm) {
            return cm.indentSelection("smart");
        },
        indentMore: function indentMore(cm) {
            return cm.indentSelection("add");
        },
        indentLess: function indentLess(cm) {
            return cm.indentSelection("subtract");
        },
        insertTab: function insertTab(cm) {
            return cm.replaceSelection("\t");
        },
        insertSoftTab: function insertSoftTab(cm) {
            var spaces = [],
                ranges = cm.listSelections(),
                tabSize = cm.options.tabSize;
            for (var i = 0; i < ranges.length; i++) {
                var pos = ranges[i].from();
                var col = countColumn(cm.getLine(pos.line), pos.ch, tabSize);
                spaces.push(spaceStr(tabSize - col % tabSize));
            }
            cm.replaceSelections(spaces);
        },
        defaultTab: function defaultTab(cm) {
            if (cm.somethingSelected()) {
                cm.indentSelection("add");
            } else {
                cm.execCommand("insertTab");
            }
        },
        // Swap the two chars left and right of each selection's head.
        // Move cursor behind the two swapped characters afterwards.
        //
        // Doesn't consider line feeds a character.
        // Doesn't scan more than one line above to find a character.
        // Doesn't do anything on an empty line.
        // Doesn't do anything with non-empty selections.
        transposeChars: function transposeChars(cm) {
            return runInOp(cm, function () {
                var ranges = cm.listSelections(),
                    newSel = [];
                for (var i = 0; i < ranges.length; i++) {
                    if (!ranges[i].empty()) {
                        continue;
                    }
                    var cur = ranges[i].head,
                        line = getLine(cm.doc, cur.line).text;
                    if (line) {
                        if (cur.ch == line.length) {
                            cur = new Pos(cur.line, cur.ch - 1);
                        }
                        if (cur.ch > 0) {
                            cur = new Pos(cur.line, cur.ch + 1);
                            cm.replaceRange(line.charAt(cur.ch - 1) + line.charAt(cur.ch - 2), Pos(cur.line, cur.ch - 2), cur, "+transpose");
                        } else if (cur.line > cm.doc.first) {
                            var prev = getLine(cm.doc, cur.line - 1).text;
                            if (prev) {
                                cur = new Pos(cur.line, 1);
                                cm.replaceRange(line.charAt(0) + cm.doc.lineSeparator() + prev.charAt(prev.length - 1), Pos(cur.line - 1, prev.length - 1), cur, "+transpose");
                            }
                        }
                    }
                    newSel.push(new Range(cur, cur));
                }
                cm.setSelections(newSel);
            });
        },
        newlineAndIndent: function newlineAndIndent(cm) {
            return runInOp(cm, function () {
                var sels = cm.listSelections();
                for (var i = sels.length - 1; i >= 0; i--) {
                    cm.replaceRange(cm.doc.lineSeparator(), sels[i].anchor, sels[i].head, "+input");
                }
                sels = cm.listSelections();
                for (var i$1 = 0; i$1 < sels.length; i$1++) {
                    cm.indentLine(sels[i$1].from().line, null, true);
                }
                ensureCursorVisible(cm);
            });
        },
        openLine: function openLine(cm) {
            return cm.replaceSelection("\n", "start");
        },
        toggleOverwrite: function toggleOverwrite(cm) {
            return cm.toggleOverwrite();
        }
    };

    function lineStart(cm, lineN) {
        var line = getLine(cm.doc, lineN);
        var visual = visualLine(line);
        if (visual != line) {
            lineN = lineNo(visual);
        }
        return endOfLine(true, cm, visual, lineN, 1);
    }
    function lineEnd(cm, lineN) {
        var line = getLine(cm.doc, lineN);
        var visual = visualLineEnd(line);
        if (visual != line) {
            lineN = lineNo(visual);
        }
        return endOfLine(true, cm, line, lineN, -1);
    }
    function lineStartSmart(cm, pos) {
        var start = lineStart(cm, pos.line);
        var line = getLine(cm.doc, start.line);
        var order = getOrder(line, cm.doc.direction);
        if (!order || order[0].level == 0) {
            var firstNonWS = Math.max(0, line.text.search(/\S/));
            var inWS = pos.line == start.line && pos.ch <= firstNonWS && pos.ch;
            return Pos(start.line, inWS ? 0 : firstNonWS, start.sticky);
        }
        return start;
    }

    // Run a handler that was bound to a key.
    function doHandleBinding(cm, bound, dropShift) {
        if (typeof bound == "string") {
            bound = commands[bound];
            if (!bound) {
                return false;
            }
        }
        // Ensure previous input has been read, so that the handler sees a
        // consistent view of the document
        cm.display.input.ensurePolled();
        var prevShift = cm.display.shift,
            done = false;
        try {
            if (cm.isReadOnly()) {
                cm.state.suppressEdits = true;
            }
            if (dropShift) {
                cm.display.shift = false;
            }
            done = bound(cm) != Pass;
        } finally {
            cm.display.shift = prevShift;
            cm.state.suppressEdits = false;
        }
        return done;
    }

    function lookupKeyForEditor(cm, name, handle) {
        for (var i = 0; i < cm.state.keyMaps.length; i++) {
            var result = lookupKey(name, cm.state.keyMaps[i], handle, cm);
            if (result) {
                return result;
            }
        }
        return cm.options.extraKeys && lookupKey(name, cm.options.extraKeys, handle, cm) || lookupKey(name, cm.options.keyMap, handle, cm);
    }

    // Note that, despite the name, this function is also used to check
    // for bound mouse clicks.

    var stopSeq = new Delayed();

    function dispatchKey(cm, name, e, handle) {
        var seq = cm.state.keySeq;
        if (seq) {
            if (isModifierKey(name)) {
                return "handled";
            }
            if (/\'$/.test(name)) {
                cm.state.keySeq = null;
            } else {
                stopSeq.set(50, function () {
                    if (cm.state.keySeq == seq) {
                        cm.state.keySeq = null;
                        cm.display.input.reset();
                    }
                });
            }
            if (dispatchKeyInner(cm, seq + " " + name, e, handle)) {
                return true;
            }
        }
        return dispatchKeyInner(cm, name, e, handle);
    }

    function dispatchKeyInner(cm, name, e, handle) {
        var result = lookupKeyForEditor(cm, name, handle);

        if (result == "multi") {
            cm.state.keySeq = name;
        }
        if (result == "handled") {
            signalLater(cm, "keyHandled", cm, name, e);
        }

        if (result == "handled" || result == "multi") {
            e_preventDefault(e);
            restartBlink(cm);
        }

        return !!result;
    }

    // Handle a key from the keydown event.
    function handleKeyBinding(cm, e) {
        var name = keyName(e, true);
        if (!name) {
            return false;
        }

        if (e.shiftKey && !cm.state.keySeq) {
            // First try to resolve full name (including 'Shift-'). Failing
            // that, see if there is a cursor-motion command (starting with
            // 'go') bound to the keyname without 'Shift-'.
            return dispatchKey(cm, "Shift-" + name, e, function (b) {
                return doHandleBinding(cm, b, true);
            }) || dispatchKey(cm, name, e, function (b) {
                if (typeof b == "string" ? /^go[A-Z]/.test(b) : b.motion) {
                    return doHandleBinding(cm, b);
                }
            });
        } else {
            return dispatchKey(cm, name, e, function (b) {
                return doHandleBinding(cm, b);
            });
        }
    }

    // Handle a key from the keypress event
    function handleCharBinding(cm, e, ch) {
        return dispatchKey(cm, "'" + ch + "'", e, function (b) {
            return doHandleBinding(cm, b, true);
        });
    }

    var lastStoppedKey = null;
    function onKeyDown(e) {
        var cm = this;
        cm.curOp.focus = activeElt();
        if (signalDOMEvent(cm, e)) {
            return;
        }
        // IE does strange things with escape.
        if (ie && ie_version < 11 && e.keyCode == 27) {
            e.returnValue = false;
        }
        var code = e.keyCode;
        cm.display.shift = code == 16 || e.shiftKey;
        var handled = handleKeyBinding(cm, e);
        if (presto) {
            lastStoppedKey = handled ? code : null;
            // Opera has no cut event... we try to at least catch the key combo
            if (!handled && code == 88 && !hasCopyEvent && (mac ? e.metaKey : e.ctrlKey)) {
                cm.replaceSelection("", null, "cut");
            }
        }
        if (gecko && !mac && !handled && code == 46 && e.shiftKey && !e.ctrlKey && document.execCommand) {
            document.execCommand("cut");
        }

        // Turn mouse into crosshair when Alt is held on Mac.
        if (code == 18 && !/\bCodeMirror-crosshair\b/.test(cm.display.lineDiv.className)) {
            showCrossHair(cm);
        }
    }

    function showCrossHair(cm) {
        var lineDiv = cm.display.lineDiv;
        addClass(lineDiv, "CodeMirror-crosshair");

        function up(e) {
            if (e.keyCode == 18 || !e.altKey) {
                rmClass(lineDiv, "CodeMirror-crosshair");
                off(document, "keyup", up);
                off(document, "mouseover", up);
            }
        }
        on(document, "keyup", up);
        on(document, "mouseover", up);
    }

    function onKeyUp(e) {
        if (e.keyCode == 16) {
            this.doc.sel.shift = false;
        }
        signalDOMEvent(this, e);
    }

    function onKeyPress(e) {
        var cm = this;
        if (eventInWidget(cm.display, e) || signalDOMEvent(cm, e) || e.ctrlKey && !e.altKey || mac && e.metaKey) {
            return;
        }
        var keyCode = e.keyCode,
            charCode = e.charCode;
        if (presto && keyCode == lastStoppedKey) {
            lastStoppedKey = null;e_preventDefault(e);return;
        }
        if (presto && (!e.which || e.which < 10) && handleKeyBinding(cm, e)) {
            return;
        }
        var ch = String.fromCharCode(charCode == null ? keyCode : charCode);
        // Some browsers fire keypress events for backspace
        if (ch == "\x08") {
            return;
        }
        if (handleCharBinding(cm, e, ch)) {
            return;
        }
        cm.display.input.onKeyPress(e);
    }

    var DOUBLECLICK_DELAY = 400;

    var PastClick = function PastClick(time, pos, button) {
        this.time = time;
        this.pos = pos;
        this.button = button;
    };

    PastClick.prototype.compare = function (time, pos, button) {
        return this.time + DOUBLECLICK_DELAY > time && cmp(pos, this.pos) == 0 && button == this.button;
    };

    var lastClick, lastDoubleClick;
    function clickRepeat(pos, button) {
        var now = +new Date();
        if (lastDoubleClick && lastDoubleClick.compare(now, pos, button)) {
            lastClick = lastDoubleClick = null;
            return "triple";
        } else if (lastClick && lastClick.compare(now, pos, button)) {
            lastDoubleClick = new PastClick(now, pos, button);
            lastClick = null;
            return "double";
        } else {
            lastClick = new PastClick(now, pos, button);
            lastDoubleClick = null;
            return "single";
        }
    }

    // A mouse down can be a single click, double click, triple click,
    // start of selection drag, start of text drag, new cursor
    // (ctrl-click), rectangle drag (alt-drag), or xwin
    // middle-click-paste. Or it might be a click on something we should
    // not interfere with, such as a scrollbar or widget.
    function onMouseDown(e) {
        var cm = this,
            display = cm.display;
        if (signalDOMEvent(cm, e) || display.activeTouch && display.input.supportsTouch()) {
            return;
        }
        display.input.ensurePolled();
        display.shift = e.shiftKey;

        if (eventInWidget(display, e)) {
            if (!webkit) {
                // Briefly turn off draggability, to allow widgets to do
                // normal dragging things.
                display.scroller.draggable = false;
                setTimeout(function () {
                    return display.scroller.draggable = true;
                }, 100);
            }
            return;
        }
        if (clickInGutter(cm, e)) {
            return;
        }
        var pos = posFromMouse(cm, e),
            button = e_button(e),
            repeat = pos ? clickRepeat(pos, button) : "single";
        window.focus();

        // #3261: make sure, that we're not starting a second selection
        if (button == 1 && cm.state.selectingText) {
            cm.state.selectingText(e);
        }

        if (pos && handleMappedButton(cm, button, pos, repeat, e)) {
            return;
        }

        if (button == 1) {
            if (pos) {
                leftButtonDown(cm, pos, repeat, e);
            } else if (e_target(e) == display.scroller) {
                e_preventDefault(e);
            }
        } else if (button == 2) {
            if (pos) {
                extendSelection(cm.doc, pos);
            }
            setTimeout(function () {
                return display.input.focus();
            }, 20);
        } else if (button == 3) {
            if (captureRightClick) {
                cm.display.input.onContextMenu(e);
            } else {
                delayBlurEvent(cm);
            }
        }
    }

    function handleMappedButton(cm, button, pos, repeat, event) {
        var name = "Click";
        if (repeat == "double") {
            name = "Double" + name;
        } else if (repeat == "triple") {
            name = "Triple" + name;
        }
        name = (button == 1 ? "Left" : button == 2 ? "Middle" : "Right") + name;

        return dispatchKey(cm, addModifierNames(name, event), event, function (bound) {
            if (typeof bound == "string") {
                bound = commands[bound];
            }
            if (!bound) {
                return false;
            }
            var done = false;
            try {
                if (cm.isReadOnly()) {
                    cm.state.suppressEdits = true;
                }
                done = bound(cm, pos) != Pass;
            } finally {
                cm.state.suppressEdits = false;
            }
            return done;
        });
    }

    function configureMouse(cm, repeat, event) {
        var option = cm.getOption("configureMouse");
        var value = option ? option(cm, repeat, event) : {};
        if (value.unit == null) {
            var rect = chromeOS ? event.shiftKey && event.metaKey : event.altKey;
            value.unit = rect ? "rectangle" : repeat == "single" ? "char" : repeat == "double" ? "word" : "line";
        }
        if (value.extend == null || cm.doc.extend) {
            value.extend = cm.doc.extend || event.shiftKey;
        }
        if (value.addNew == null) {
            value.addNew = mac ? event.metaKey : event.ctrlKey;
        }
        if (value.moveOnDrag == null) {
            value.moveOnDrag = !(mac ? event.altKey : event.ctrlKey);
        }
        return value;
    }

    function leftButtonDown(cm, pos, repeat, event) {
        if (ie) {
            setTimeout(bind(ensureFocus, cm), 0);
        } else {
            cm.curOp.focus = activeElt();
        }

        var behavior = configureMouse(cm, repeat, event);

        var sel = cm.doc.sel,
            contained;
        if (cm.options.dragDrop && dragAndDrop && !cm.isReadOnly() && repeat == "single" && (contained = sel.contains(pos)) > -1 && (cmp((contained = sel.ranges[contained]).from(), pos) < 0 || pos.xRel > 0) && (cmp(contained.to(), pos) > 0 || pos.xRel < 0)) {
            leftButtonStartDrag(cm, event, pos, behavior);
        } else {
            leftButtonSelect(cm, event, pos, behavior);
        }
    }

    // Start a text drag. When it ends, see if any dragging actually
    // happen, and treat as a click if it didn't.
    function leftButtonStartDrag(cm, event, pos, behavior) {
        var display = cm.display,
            moved = false;
        var dragEnd = operation(cm, function (e) {
            if (webkit) {
                display.scroller.draggable = false;
            }
            cm.state.draggingText = false;
            off(display.wrapper.ownerDocument, "mouseup", dragEnd);
            off(display.wrapper.ownerDocument, "mousemove", mouseMove);
            off(display.scroller, "dragstart", dragStart);
            off(display.scroller, "drop", dragEnd);
            if (!moved) {
                e_preventDefault(e);
                if (!behavior.addNew) {
                    extendSelection(cm.doc, pos, null, null, behavior.extend);
                }
                // Work around unexplainable focus problem in IE9 (#2127) and Chrome (#3081)
                if (webkit || ie && ie_version == 9) {
                    setTimeout(function () {
                        display.wrapper.ownerDocument.body.focus();display.input.focus();
                    }, 20);
                } else {
                    display.input.focus();
                }
            }
        });
        var mouseMove = function mouseMove(e2) {
            moved = moved || Math.abs(event.clientX - e2.clientX) + Math.abs(event.clientY - e2.clientY) >= 10;
        };
        var dragStart = function dragStart() {
            return moved = true;
        };
        // Let the drag handler handle this.
        if (webkit) {
            display.scroller.draggable = true;
        }
        cm.state.draggingText = dragEnd;
        dragEnd.copy = !behavior.moveOnDrag;
        // IE's approach to draggable
        if (display.scroller.dragDrop) {
            display.scroller.dragDrop();
        }
        on(display.wrapper.ownerDocument, "mouseup", dragEnd);
        on(display.wrapper.ownerDocument, "mousemove", mouseMove);
        on(display.scroller, "dragstart", dragStart);
        on(display.scroller, "drop", dragEnd);

        delayBlurEvent(cm);
        setTimeout(function () {
            return display.input.focus();
        }, 20);
    }

    function rangeForUnit(cm, pos, unit) {
        if (unit == "char") {
            return new Range(pos, pos);
        }
        if (unit == "word") {
            return cm.findWordAt(pos);
        }
        if (unit == "line") {
            return new Range(Pos(pos.line, 0), _clipPos(cm.doc, Pos(pos.line + 1, 0)));
        }
        var result = unit(cm, pos);
        return new Range(result.from, result.to);
    }

    // Normal selection, as opposed to text dragging.
    function leftButtonSelect(cm, event, start, behavior) {
        var display = cm.display,
            doc = cm.doc;
        e_preventDefault(event);

        var ourRange,
            ourIndex,
            startSel = doc.sel,
            ranges = startSel.ranges;
        if (behavior.addNew && !behavior.extend) {
            ourIndex = doc.sel.contains(start);
            if (ourIndex > -1) {
                ourRange = ranges[ourIndex];
            } else {
                ourRange = new Range(start, start);
            }
        } else {
            ourRange = doc.sel.primary();
            ourIndex = doc.sel.primIndex;
        }

        if (behavior.unit == "rectangle") {
            if (!behavior.addNew) {
                ourRange = new Range(start, start);
            }
            start = posFromMouse(cm, event, true, true);
            ourIndex = -1;
        } else {
            var range = rangeForUnit(cm, start, behavior.unit);
            if (behavior.extend) {
                ourRange = extendRange(ourRange, range.anchor, range.head, behavior.extend);
            } else {
                ourRange = range;
            }
        }

        if (!behavior.addNew) {
            ourIndex = 0;
            setSelection(doc, new Selection([ourRange], 0), sel_mouse);
            startSel = doc.sel;
        } else if (ourIndex == -1) {
            ourIndex = ranges.length;
            setSelection(doc, normalizeSelection(cm, ranges.concat([ourRange]), ourIndex), { scroll: false, origin: "*mouse" });
        } else if (ranges.length > 1 && ranges[ourIndex].empty() && behavior.unit == "char" && !behavior.extend) {
            setSelection(doc, normalizeSelection(cm, ranges.slice(0, ourIndex).concat(ranges.slice(ourIndex + 1)), 0), { scroll: false, origin: "*mouse" });
            startSel = doc.sel;
        } else {
            replaceOneSelection(doc, ourIndex, ourRange, sel_mouse);
        }

        var lastPos = start;
        function extendTo(pos) {
            if (cmp(lastPos, pos) == 0) {
                return;
            }
            lastPos = pos;

            if (behavior.unit == "rectangle") {
                var ranges = [],
                    tabSize = cm.options.tabSize;
                var startCol = countColumn(getLine(doc, start.line).text, start.ch, tabSize);
                var posCol = countColumn(getLine(doc, pos.line).text, pos.ch, tabSize);
                var left = Math.min(startCol, posCol),
                    right = Math.max(startCol, posCol);
                for (var line = Math.min(start.line, pos.line), end = Math.min(cm.lastLine(), Math.max(start.line, pos.line)); line <= end; line++) {
                    var text = getLine(doc, line).text,
                        leftPos = findColumn(text, left, tabSize);
                    if (left == right) {
                        ranges.push(new Range(Pos(line, leftPos), Pos(line, leftPos)));
                    } else if (text.length > leftPos) {
                        ranges.push(new Range(Pos(line, leftPos), Pos(line, findColumn(text, right, tabSize))));
                    }
                }
                if (!ranges.length) {
                    ranges.push(new Range(start, start));
                }
                setSelection(doc, normalizeSelection(cm, startSel.ranges.slice(0, ourIndex).concat(ranges), ourIndex), { origin: "*mouse", scroll: false });
                cm.scrollIntoView(pos);
            } else {
                var oldRange = ourRange;
                var range = rangeForUnit(cm, pos, behavior.unit);
                var anchor = oldRange.anchor,
                    head;
                if (cmp(range.anchor, anchor) > 0) {
                    head = range.head;
                    anchor = minPos(oldRange.from(), range.anchor);
                } else {
                    head = range.anchor;
                    anchor = maxPos(oldRange.to(), range.head);
                }
                var ranges$1 = startSel.ranges.slice(0);
                ranges$1[ourIndex] = bidiSimplify(cm, new Range(_clipPos(doc, anchor), head));
                setSelection(doc, normalizeSelection(cm, ranges$1, ourIndex), sel_mouse);
            }
        }

        var editorSize = display.wrapper.getBoundingClientRect();
        // Used to ensure timeout re-tries don't fire when another extend
        // happened in the meantime (clearTimeout isn't reliable -- at
        // least on Chrome, the timeouts still happen even when cleared,
        // if the clear happens after their scheduled firing time).
        var counter = 0;

        function extend(e) {
            var curCount = ++counter;
            var cur = posFromMouse(cm, e, true, behavior.unit == "rectangle");
            if (!cur) {
                return;
            }
            if (cmp(cur, lastPos) != 0) {
                cm.curOp.focus = activeElt();
                extendTo(cur);
                var visible = visibleLines(display, doc);
                if (cur.line >= visible.to || cur.line < visible.from) {
                    setTimeout(operation(cm, function () {
                        if (counter == curCount) {
                            extend(e);
                        }
                    }), 150);
                }
            } else {
                var outside = e.clientY < editorSize.top ? -20 : e.clientY > editorSize.bottom ? 20 : 0;
                if (outside) {
                    setTimeout(operation(cm, function () {
                        if (counter != curCount) {
                            return;
                        }
                        display.scroller.scrollTop += outside;
                        extend(e);
                    }), 50);
                }
            }
        }

        function done(e) {
            cm.state.selectingText = false;
            counter = Infinity;
            // If e is null or undefined we interpret this as someone trying
            // to explicitly cancel the selection rather than the user
            // letting go of the mouse button.
            if (e) {
                e_preventDefault(e);
                display.input.focus();
            }
            off(display.wrapper.ownerDocument, "mousemove", move);
            off(display.wrapper.ownerDocument, "mouseup", up);
            doc.history.lastSelOrigin = null;
        }

        var move = operation(cm, function (e) {
            if (e.buttons === 0 || !e_button(e)) {
                done(e);
            } else {
                extend(e);
            }
        });
        var up = operation(cm, done);
        cm.state.selectingText = up;
        on(display.wrapper.ownerDocument, "mousemove", move);
        on(display.wrapper.ownerDocument, "mouseup", up);
    }

    // Used when mouse-selecting to adjust the anchor to the proper side
    // of a bidi jump depending on the visual position of the head.
    function bidiSimplify(cm, range) {
        var anchor = range.anchor;
        var head = range.head;
        var anchorLine = getLine(cm.doc, anchor.line);
        if (cmp(anchor, head) == 0 && anchor.sticky == head.sticky) {
            return range;
        }
        var order = getOrder(anchorLine);
        if (!order) {
            return range;
        }
        var index = getBidiPartAt(order, anchor.ch, anchor.sticky),
            part = order[index];
        if (part.from != anchor.ch && part.to != anchor.ch) {
            return range;
        }
        var boundary = index + (part.from == anchor.ch == (part.level != 1) ? 0 : 1);
        if (boundary == 0 || boundary == order.length) {
            return range;
        }

        // Compute the relative visual position of the head compared to the
        // anchor (<0 is to the left, >0 to the right)
        var leftSide;
        if (head.line != anchor.line) {
            leftSide = (head.line - anchor.line) * (cm.doc.direction == "ltr" ? 1 : -1) > 0;
        } else {
            var headIndex = getBidiPartAt(order, head.ch, head.sticky);
            var dir = headIndex - index || (head.ch - anchor.ch) * (part.level == 1 ? -1 : 1);
            if (headIndex == boundary - 1 || headIndex == boundary) {
                leftSide = dir < 0;
            } else {
                leftSide = dir > 0;
            }
        }

        var usePart = order[boundary + (leftSide ? -1 : 0)];
        var from = leftSide == (usePart.level == 1);
        var ch = from ? usePart.from : usePart.to,
            sticky = from ? "after" : "before";
        return anchor.ch == ch && anchor.sticky == sticky ? range : new Range(new Pos(anchor.line, ch, sticky), head);
    }

    // Determines whether an event happened in the gutter, and fires the
    // handlers for the corresponding event.
    function gutterEvent(cm, e, type, prevent) {
        var mX, mY;
        if (e.touches) {
            mX = e.touches[0].clientX;
            mY = e.touches[0].clientY;
        } else {
            try {
                mX = e.clientX;mY = e.clientY;
            } catch (e) {
                return false;
            }
        }
        if (mX >= Math.floor(cm.display.gutters.getBoundingClientRect().right)) {
            return false;
        }
        if (prevent) {
            e_preventDefault(e);
        }

        var display = cm.display;
        var lineBox = display.lineDiv.getBoundingClientRect();

        if (mY > lineBox.bottom || !hasHandler(cm, type)) {
            return e_defaultPrevented(e);
        }
        mY -= lineBox.top - display.viewOffset;

        for (var i = 0; i < cm.display.gutterSpecs.length; ++i) {
            var g = display.gutters.childNodes[i];
            if (g && g.getBoundingClientRect().right >= mX) {
                var line = _lineAtHeight(cm.doc, mY);
                var gutter = cm.display.gutterSpecs[i];
                signal(cm, type, cm, line, gutter.className, e);
                return e_defaultPrevented(e);
            }
        }
    }

    function clickInGutter(cm, e) {
        return gutterEvent(cm, e, "gutterClick", true);
    }

    // CONTEXT MENU HANDLING

    // To make the context menu work, we need to briefly unhide the
    // textarea (making it as unobtrusive as possible) to let the
    // right-click take effect on it.
    function onContextMenu(cm, e) {
        if (eventInWidget(cm.display, e) || contextMenuInGutter(cm, e)) {
            return;
        }
        if (signalDOMEvent(cm, e, "contextmenu")) {
            return;
        }
        if (!captureRightClick) {
            cm.display.input.onContextMenu(e);
        }
    }

    function contextMenuInGutter(cm, e) {
        if (!hasHandler(cm, "gutterContextMenu")) {
            return false;
        }
        return gutterEvent(cm, e, "gutterContextMenu", false);
    }

    function themeChanged(cm) {
        cm.display.wrapper.className = cm.display.wrapper.className.replace(/\s*cm-s-\S+/g, "") + cm.options.theme.replace(/(^|\s)\s*/g, " cm-s-");
        clearCaches(cm);
    }

    var Init = { toString: function toString() {
            return "CodeMirror.Init";
        } };

    var defaults$$1 = {};
    var optionHandlers = {};

    function defineOptions(CodeMirror) {
        var optionHandlers = CodeMirror.optionHandlers;

        function option(name, deflt, handle, notOnInit) {
            CodeMirror.defaults[name] = deflt;
            if (handle) {
                optionHandlers[name] = notOnInit ? function (cm, val, old) {
                    if (old != Init) {
                        handle(cm, val, old);
                    }
                } : handle;
            }
        }

        CodeMirror.defineOption = option;

        // Passed to option handlers when there is no old value.
        CodeMirror.Init = Init;

        // These two are, on init, called from the constructor because they
        // have to be initialized before the editor can start at all.
        option("value", "", function (cm, val) {
            return cm.setValue(val);
        }, true);
        option("mode", null, function (cm, val) {
            cm.doc.modeOption = val;
            loadMode(cm);
        }, true);

        option("indentUnit", 2, loadMode, true);
        option("indentWithTabs", false);
        option("smartIndent", true);
        option("tabSize", 4, function (cm) {
            resetModeState(cm);
            clearCaches(cm);
            regChange(cm);
        }, true);

        option("lineSeparator", null, function (cm, val) {
            cm.doc.lineSep = val;
            if (!val) {
                return;
            }
            var newBreaks = [],
                lineNo = cm.doc.first;
            cm.doc.iter(function (line) {
                for (var pos = 0;;) {
                    var found = line.text.indexOf(val, pos);
                    if (found == -1) {
                        break;
                    }
                    pos = found + val.length;
                    newBreaks.push(Pos(lineNo, found));
                }
                lineNo++;
            });
            for (var i = newBreaks.length - 1; i >= 0; i--) {
                _replaceRange(cm.doc, val, newBreaks[i], Pos(newBreaks[i].line, newBreaks[i].ch + val.length));
            }
        });
        option("specialChars", /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\ufff9-\ufffc]/g, function (cm, val, old) {
            cm.state.specialChars = new RegExp(val.source + (val.test("\t") ? "" : "|\t"), "g");
            if (old != Init) {
                cm.refresh();
            }
        });
        option("specialCharPlaceholder", defaultSpecialCharPlaceholder, function (cm) {
            return cm.refresh();
        }, true);
        option("electricChars", true);
        option("inputStyle", mobile ? "contenteditable" : "textarea", function () {
            throw new Error("inputStyle can not (yet) be changed in a running editor"); // FIXME
        }, true);
        option("spellcheck", false, function (cm, val) {
            return cm.getInputField().spellcheck = val;
        }, true);
        option("autocorrect", false, function (cm, val) {
            return cm.getInputField().autocorrect = val;
        }, true);
        option("autocapitalize", false, function (cm, val) {
            return cm.getInputField().autocapitalize = val;
        }, true);
        option("rtlMoveVisually", !windows);
        option("wholeLineUpdateBefore", true);

        option("theme", "default", function (cm) {
            themeChanged(cm);
            updateGutters(cm);
        }, true);
        option("keyMap", "default", function (cm, val, old) {
            var next = getKeyMap(val);
            var prev = old != Init && getKeyMap(old);
            if (prev && prev.detach) {
                prev.detach(cm, next);
            }
            if (next.attach) {
                next.attach(cm, prev || null);
            }
        });
        option("extraKeys", null);
        option("configureMouse", null);

        option("lineWrapping", false, wrappingChanged, true);
        option("gutters", [], function (cm, val) {
            cm.display.gutterSpecs = getGutters(val, cm.options.lineNumbers);
            updateGutters(cm);
        }, true);
        option("fixedGutter", true, function (cm, val) {
            cm.display.gutters.style.left = val ? compensateForHScroll(cm.display) + "px" : "0";
            cm.refresh();
        }, true);
        option("coverGutterNextToScrollbar", false, function (cm) {
            return updateScrollbars(cm);
        }, true);
        option("scrollbarStyle", "native", function (cm) {
            initScrollbars(cm);
            updateScrollbars(cm);
            cm.display.scrollbars.setScrollTop(cm.doc.scrollTop);
            cm.display.scrollbars.setScrollLeft(cm.doc.scrollLeft);
        }, true);
        option("lineNumbers", false, function (cm, val) {
            cm.display.gutterSpecs = getGutters(cm.options.gutters, val);
            updateGutters(cm);
        }, true);
        option("firstLineNumber", 1, updateGutters, true);
        option("lineNumberFormatter", function (integer) {
            return integer;
        }, updateGutters, true);
        option("showCursorWhenSelecting", false, updateSelection, true);

        option("resetSelectionOnContextMenu", true);
        option("lineWiseCopyCut", true);
        option("pasteLinesPerSelection", true);
        option("selectionsMayTouch", false);

        option("readOnly", false, function (cm, val) {
            if (val == "nocursor") {
                onBlur(cm);
                cm.display.input.blur();
            }
            cm.display.input.readOnlyChanged(val);
        });
        option("disableInput", false, function (cm, val) {
            if (!val) {
                cm.display.input.reset();
            }
        }, true);
        option("dragDrop", true, dragDropChanged);
        option("allowDropFileTypes", null);

        option("cursorBlinkRate", 530);
        option("cursorScrollMargin", 0);
        option("cursorHeight", 1, updateSelection, true);
        option("singleCursorHeightPerLine", true, updateSelection, true);
        option("workTime", 100);
        option("workDelay", 100);
        option("flattenSpans", true, resetModeState, true);
        option("addModeClass", false, resetModeState, true);
        option("pollInterval", 100);
        option("undoDepth", 200, function (cm, val) {
            return cm.doc.history.undoDepth = val;
        });
        option("historyEventDelay", 1250);
        option("viewportMargin", 10, function (cm) {
            return cm.refresh();
        }, true);
        option("maxHighlightLength", 10000, resetModeState, true);
        option("moveInputWithCursor", true, function (cm, val) {
            if (!val) {
                cm.display.input.resetPosition();
            }
        });

        option("tabindex", null, function (cm, val) {
            return cm.display.input.getField().tabIndex = val || "";
        });
        option("autofocus", null);
        option("direction", "ltr", function (cm, val) {
            return cm.doc.setDirection(val);
        }, true);
        option("phrases", null);
    }

    function dragDropChanged(cm, value, old) {
        var wasOn = old && old != Init;
        if (!value != !wasOn) {
            var funcs = cm.display.dragFunctions;
            var toggle = value ? on : off;
            toggle(cm.display.scroller, "dragstart", funcs.start);
            toggle(cm.display.scroller, "dragenter", funcs.enter);
            toggle(cm.display.scroller, "dragover", funcs.over);
            toggle(cm.display.scroller, "dragleave", funcs.leave);
            toggle(cm.display.scroller, "drop", funcs.drop);
        }
    }

    function wrappingChanged(cm) {
        if (cm.options.lineWrapping) {
            addClass(cm.display.wrapper, "CodeMirror-wrap");
            cm.display.sizer.style.minWidth = "";
            cm.display.sizerWidth = null;
        } else {
            rmClass(cm.display.wrapper, "CodeMirror-wrap");
            findMaxLine(cm);
        }
        estimateLineHeights(cm);
        regChange(cm);
        clearCaches(cm);
        setTimeout(function () {
            return updateScrollbars(cm);
        }, 100);
    }

    // A CodeMirror instance represents an editor. This is the object
    // that user code is usually dealing with.

    function CodeMirror(place, options) {
        var this$1 = this;

        if (!(this instanceof CodeMirror)) {
            return new CodeMirror(place, options);
        }

        this.options = options = options ? copyObj(options) : {};
        // Determine effective options based on given values and defaults.
        copyObj(defaults$$1, options, false);

        var doc = options.value;
        if (typeof doc == "string") {
            doc = new Doc(doc, options.mode, null, options.lineSeparator, options.direction);
        } else if (options.mode) {
            doc.modeOption = options.mode;
        }
        this.doc = doc;

        var input = new CodeMirror.inputStyles[options.inputStyle](this);
        var display = this.display = new Display(place, doc, input, options);
        display.wrapper.CodeMirror = this;
        themeChanged(this);
        if (options.lineWrapping) {
            this.display.wrapper.className += " CodeMirror-wrap";
        }
        initScrollbars(this);

        this.state = {
            keyMaps: [], // stores maps added by addKeyMap
            overlays: [], // highlighting overlays, as added by addOverlay
            modeGen: 0, // bumped when mode/overlay changes, used to invalidate highlighting info
            overwrite: false,
            delayingBlurEvent: false,
            focused: false,
            suppressEdits: false, // used to disable editing during key handlers when in readOnly mode
            pasteIncoming: -1, cutIncoming: -1, // help recognize paste/cut edits in input.poll
            selectingText: false,
            draggingText: false,
            highlight: new Delayed(), // stores highlight worker timeout
            keySeq: null, // Unfinished key sequence
            specialChars: null
        };

        if (options.autofocus && !mobile) {
            display.input.focus();
        }

        // Override magic textarea content restore that IE sometimes does
        // on our hidden textarea on reload
        if (ie && ie_version < 11) {
            setTimeout(function () {
                return this$1.display.input.reset(true);
            }, 20);
        }

        registerEventHandlers(this);
        ensureGlobalHandlers();

        _startOperation(this);
        this.curOp.forceUpdate = true;
        attachDoc(this, doc);

        if (options.autofocus && !mobile || this.hasFocus()) {
            setTimeout(bind(onFocus, this), 20);
        } else {
            onBlur(this);
        }

        for (var opt in optionHandlers) {
            if (optionHandlers.hasOwnProperty(opt)) {
                optionHandlers[opt](this, options[opt], Init);
            }
        }
        maybeUpdateLineNumberWidth(this);
        if (options.finishInit) {
            options.finishInit(this);
        }
        for (var i = 0; i < initHooks.length; ++i) {
            initHooks[i](this);
        }
        _endOperation(this);
        // Suppress optimizelegibility in Webkit, since it breaks text
        // measuring on line wrapping boundaries.
        if (webkit && options.lineWrapping && getComputedStyle(display.lineDiv).textRendering == "optimizelegibility") {
            display.lineDiv.style.textRendering = "auto";
        }
    }

    // The default configuration options.
    CodeMirror.defaults = defaults$$1;
    // Functions to run when options are changed.
    CodeMirror.optionHandlers = optionHandlers;

    // Attach the necessary event handlers when initializing the editor
    function registerEventHandlers(cm) {
        var d = cm.display;
        on(d.scroller, "mousedown", operation(cm, onMouseDown));
        // Older IE's will not fire a second mousedown for a double click
        if (ie && ie_version < 11) {
            on(d.scroller, "dblclick", operation(cm, function (e) {
                if (signalDOMEvent(cm, e)) {
                    return;
                }
                var pos = posFromMouse(cm, e);
                if (!pos || clickInGutter(cm, e) || eventInWidget(cm.display, e)) {
                    return;
                }
                e_preventDefault(e);
                var word = cm.findWordAt(pos);
                extendSelection(cm.doc, word.anchor, word.head);
            }));
        } else {
            on(d.scroller, "dblclick", function (e) {
                return signalDOMEvent(cm, e) || e_preventDefault(e);
            });
        }
        // Some browsers fire contextmenu *after* opening the menu, at
        // which point we can't mess with it anymore. Context menu is
        // handled in onMouseDown for these browsers.
        on(d.scroller, "contextmenu", function (e) {
            return onContextMenu(cm, e);
        });
        on(d.input.getField(), "contextmenu", function (e) {
            if (!d.scroller.contains(e.target)) {
                onContextMenu(cm, e);
            }
        });

        // Used to suppress mouse event handling when a touch happens
        var touchFinished,
            prevTouch = { end: 0 };
        function finishTouch() {
            if (d.activeTouch) {
                touchFinished = setTimeout(function () {
                    return d.activeTouch = null;
                }, 1000);
                prevTouch = d.activeTouch;
                prevTouch.end = +new Date();
            }
        }
        function isMouseLikeTouchEvent(e) {
            if (e.touches.length != 1) {
                return false;
            }
            var touch = e.touches[0];
            return touch.radiusX <= 1 && touch.radiusY <= 1;
        }
        function farAway(touch, other) {
            if (other.left == null) {
                return true;
            }
            var dx = other.left - touch.left,
                dy = other.top - touch.top;
            return dx * dx + dy * dy > 20 * 20;
        }
        on(d.scroller, "touchstart", function (e) {
            if (!signalDOMEvent(cm, e) && !isMouseLikeTouchEvent(e) && !clickInGutter(cm, e)) {
                d.input.ensurePolled();
                clearTimeout(touchFinished);
                var now = +new Date();
                d.activeTouch = { start: now, moved: false,
                    prev: now - prevTouch.end <= 300 ? prevTouch : null };
                if (e.touches.length == 1) {
                    d.activeTouch.left = e.touches[0].pageX;
                    d.activeTouch.top = e.touches[0].pageY;
                }
            }
        });
        on(d.scroller, "touchmove", function () {
            if (d.activeTouch) {
                d.activeTouch.moved = true;
            }
        });
        on(d.scroller, "touchend", function (e) {
            var touch = d.activeTouch;
            if (touch && !eventInWidget(d, e) && touch.left != null && !touch.moved && new Date() - touch.start < 300) {
                var pos = cm.coordsChar(d.activeTouch, "page"),
                    range;
                if (!touch.prev || farAway(touch, touch.prev)) // Single tap
                    {
                        range = new Range(pos, pos);
                    } else if (!touch.prev.prev || farAway(touch, touch.prev.prev)) // Double tap
                    {
                        range = cm.findWordAt(pos);
                    } else // Triple tap
                    {
                        range = new Range(Pos(pos.line, 0), _clipPos(cm.doc, Pos(pos.line + 1, 0)));
                    }
                cm.setSelection(range.anchor, range.head);
                cm.focus();
                e_preventDefault(e);
            }
            finishTouch();
        });
        on(d.scroller, "touchcancel", finishTouch);

        // Sync scrolling between fake scrollbars and real scrollable
        // area, ensure viewport is updated when scrolling.
        on(d.scroller, "scroll", function () {
            if (d.scroller.clientHeight) {
                updateScrollTop(cm, d.scroller.scrollTop);
                setScrollLeft(cm, d.scroller.scrollLeft, true);
                signal(cm, "scroll", cm);
            }
        });

        // Listen to wheel events in order to try and update the viewport on time.
        on(d.scroller, "mousewheel", function (e) {
            return onScrollWheel(cm, e);
        });
        on(d.scroller, "DOMMouseScroll", function (e) {
            return onScrollWheel(cm, e);
        });

        // Prevent wrapper from ever scrolling
        on(d.wrapper, "scroll", function () {
            return d.wrapper.scrollTop = d.wrapper.scrollLeft = 0;
        });

        d.dragFunctions = {
            enter: function enter(e) {
                if (!signalDOMEvent(cm, e)) {
                    e_stop(e);
                }
            },
            over: function over(e) {
                if (!signalDOMEvent(cm, e)) {
                    onDragOver(cm, e);e_stop(e);
                }
            },
            start: function start(e) {
                return onDragStart(cm, e);
            },
            drop: operation(cm, onDrop),
            leave: function leave(e) {
                if (!signalDOMEvent(cm, e)) {
                    clearDragCursor(cm);
                }
            }
        };

        var inp = d.input.getField();
        on(inp, "keyup", function (e) {
            return onKeyUp.call(cm, e);
        });
        on(inp, "keydown", operation(cm, onKeyDown));
        on(inp, "keypress", operation(cm, onKeyPress));
        on(inp, "focus", function (e) {
            return onFocus(cm, e);
        });
        on(inp, "blur", function (e) {
            return onBlur(cm, e);
        });
    }

    var initHooks = [];
    CodeMirror.defineInitHook = function (f) {
        return initHooks.push(f);
    };

    // Indent the given line. The how parameter can be "smart",
    // "add"/null, "subtract", or "prev". When aggressive is false
    // (typically set to true for forced single-line indents), empty
    // lines are not indented, and places where the mode returns Pass
    // are left alone.
    function indentLine(cm, n, how, aggressive) {
        var doc = cm.doc,
            state;
        if (how == null) {
            how = "add";
        }
        if (how == "smart") {
            // Fall back to "prev" when the mode doesn't have an indentation
            // method.
            if (!doc.mode.indent) {
                how = "prev";
            } else {
                state = getContextBefore(cm, n).state;
            }
        }

        var tabSize = cm.options.tabSize;
        var line = getLine(doc, n),
            curSpace = countColumn(line.text, null, tabSize);
        if (line.stateAfter) {
            line.stateAfter = null;
        }
        var curSpaceString = line.text.match(/^\s*/)[0],
            indentation;
        if (!aggressive && !/\S/.test(line.text)) {
            indentation = 0;
            how = "not";
        } else if (how == "smart") {
            indentation = doc.mode.indent(state, line.text.slice(curSpaceString.length), line.text);
            if (indentation == Pass || indentation > 150) {
                if (!aggressive) {
                    return;
                }
                how = "prev";
            }
        }
        if (how == "prev") {
            if (n > doc.first) {
                indentation = countColumn(getLine(doc, n - 1).text, null, tabSize);
            } else {
                indentation = 0;
            }
        } else if (how == "add") {
            indentation = curSpace + cm.options.indentUnit;
        } else if (how == "subtract") {
            indentation = curSpace - cm.options.indentUnit;
        } else if (typeof how == "number") {
            indentation = curSpace + how;
        }
        indentation = Math.max(0, indentation);

        var indentString = "",
            pos = 0;
        if (cm.options.indentWithTabs) {
            for (var i = Math.floor(indentation / tabSize); i; --i) {
                pos += tabSize;indentString += "\t";
            }
        }
        if (pos < indentation) {
            indentString += spaceStr(indentation - pos);
        }

        if (indentString != curSpaceString) {
            _replaceRange(doc, indentString, Pos(n, 0), Pos(n, curSpaceString.length), "+input");
            line.stateAfter = null;
            return true;
        } else {
            // Ensure that, if the cursor was in the whitespace at the start
            // of the line, it is moved to the end of that space.
            for (var i$1 = 0; i$1 < doc.sel.ranges.length; i$1++) {
                var range = doc.sel.ranges[i$1];
                if (range.head.line == n && range.head.ch < curSpaceString.length) {
                    var pos$1 = Pos(n, curSpaceString.length);
                    replaceOneSelection(doc, i$1, new Range(pos$1, pos$1));
                    break;
                }
            }
        }
    }

    // This will be set to a {lineWise: bool, text: [string]} object, so
    // that, when pasting, we know what kind of selections the copied
    // text was made out of.
    var lastCopied = null;

    function setLastCopied(newLastCopied) {
        lastCopied = newLastCopied;
    }

    function applyTextInput(cm, inserted, deleted, sel, origin) {
        var doc = cm.doc;
        cm.display.shift = false;
        if (!sel) {
            sel = doc.sel;
        }

        var recent = +new Date() - 200;
        var paste = origin == "paste" || cm.state.pasteIncoming > recent;
        var textLines = splitLinesAuto(inserted),
            multiPaste = null;
        // When pasting N lines into N selections, insert one line per selection
        if (paste && sel.ranges.length > 1) {
            if (lastCopied && lastCopied.text.join("\n") == inserted) {
                if (sel.ranges.length % lastCopied.text.length == 0) {
                    multiPaste = [];
                    for (var i = 0; i < lastCopied.text.length; i++) {
                        multiPaste.push(doc.splitLines(lastCopied.text[i]));
                    }
                }
            } else if (textLines.length == sel.ranges.length && cm.options.pasteLinesPerSelection) {
                multiPaste = map(textLines, function (l) {
                    return [l];
                });
            }
        }

        var updateInput = cm.curOp.updateInput;
        // Normal behavior is to insert the new text into every selection
        for (var i$1 = sel.ranges.length - 1; i$1 >= 0; i$1--) {
            var range = sel.ranges[i$1];
            var from = range.from(),
                to = range.to();
            if (range.empty()) {
                if (deleted && deleted > 0) // Handle deletion
                    {
                        from = Pos(from.line, from.ch - deleted);
                    } else if (cm.state.overwrite && !paste) // Handle overwrite
                    {
                        to = Pos(to.line, Math.min(getLine(doc, to.line).text.length, to.ch + lst(textLines).length));
                    } else if (paste && lastCopied && lastCopied.lineWise && lastCopied.text.join("\n") == inserted) {
                    from = to = Pos(from.line, 0);
                }
            }
            var changeEvent = { from: from, to: to, text: multiPaste ? multiPaste[i$1 % multiPaste.length] : textLines,
                origin: origin || (paste ? "paste" : cm.state.cutIncoming > recent ? "cut" : "+input") };
            makeChange(cm.doc, changeEvent);
            signalLater(cm, "inputRead", cm, changeEvent);
        }
        if (inserted && !paste) {
            triggerElectric(cm, inserted);
        }

        ensureCursorVisible(cm);
        if (cm.curOp.updateInput < 2) {
            cm.curOp.updateInput = updateInput;
        }
        cm.curOp.typing = true;
        cm.state.pasteIncoming = cm.state.cutIncoming = -1;
    }

    function handlePaste(e, cm) {
        var pasted = e.clipboardData && e.clipboardData.getData("Text");
        if (pasted) {
            e.preventDefault();
            if (!cm.isReadOnly() && !cm.options.disableInput) {
                runInOp(cm, function () {
                    return applyTextInput(cm, pasted, 0, null, "paste");
                });
            }
            return true;
        }
    }

    function triggerElectric(cm, inserted) {
        // When an 'electric' character is inserted, immediately trigger a reindent
        if (!cm.options.electricChars || !cm.options.smartIndent) {
            return;
        }
        var sel = cm.doc.sel;

        for (var i = sel.ranges.length - 1; i >= 0; i--) {
            var range = sel.ranges[i];
            if (range.head.ch > 100 || i && sel.ranges[i - 1].head.line == range.head.line) {
                continue;
            }
            var mode = cm.getModeAt(range.head);
            var indented = false;
            if (mode.electricChars) {
                for (var j = 0; j < mode.electricChars.length; j++) {
                    if (inserted.indexOf(mode.electricChars.charAt(j)) > -1) {
                        indented = indentLine(cm, range.head.line, "smart");
                        break;
                    }
                }
            } else if (mode.electricInput) {
                if (mode.electricInput.test(getLine(cm.doc, range.head.line).text.slice(0, range.head.ch))) {
                    indented = indentLine(cm, range.head.line, "smart");
                }
            }
            if (indented) {
                signalLater(cm, "electricInput", cm, range.head.line);
            }
        }
    }

    function copyableRanges(cm) {
        var text = [],
            ranges = [];
        for (var i = 0; i < cm.doc.sel.ranges.length; i++) {
            var line = cm.doc.sel.ranges[i].head.line;
            var lineRange = { anchor: Pos(line, 0), head: Pos(line + 1, 0) };
            ranges.push(lineRange);
            text.push(cm.getRange(lineRange.anchor, lineRange.head));
        }
        return { text: text, ranges: ranges };
    }

    function disableBrowserMagic(field, spellcheck, autocorrect, autocapitalize) {
        field.setAttribute("autocorrect", autocorrect ? "" : "off");
        field.setAttribute("autocapitalize", autocapitalize ? "" : "off");
        field.setAttribute("spellcheck", !!spellcheck);
    }

    function hiddenTextarea() {
        var te = elt("textarea", null, null, "position: absolute; bottom: -1em; padding: 0; width: 1px; height: 1em; outline: none");
        var div = elt("div", [te], null, "overflow: hidden; position: relative; width: 3px; height: 0px;");
        // The textarea is kept positioned near the cursor to prevent the
        // fact that it'll be scrolled into view on input from scrolling
        // our fake cursor out of view. On webkit, when wrap=off, paste is
        // very slow. So make the area wide instead.
        if (webkit) {
            te.style.width = "1000px";
        } else {
            te.setAttribute("wrap", "off");
        }
        // If border: 0; -- iOS fails to open keyboard (issue #1287)
        if (ios) {
            te.style.border = "1px solid black";
        }
        disableBrowserMagic(te);
        return div;
    }

    // The publicly visible API. Note that methodOp(f) means
    // 'wrap f in an operation, performed on its `this` parameter'.

    // This is not the complete set of editor methods. Most of the
    // methods defined on the Doc type are also injected into
    // CodeMirror.prototype, for backwards compatibility and
    // convenience.

    function addEditorMethods(CodeMirror) {
        var optionHandlers = CodeMirror.optionHandlers;

        var helpers = CodeMirror.helpers = {};

        CodeMirror.prototype = {
            constructor: CodeMirror,
            focus: function focus() {
                window.focus();this.display.input.focus();
            },

            setOption: function setOption(option, value) {
                var options = this.options,
                    old = options[option];
                if (options[option] == value && option != "mode") {
                    return;
                }
                options[option] = value;
                if (optionHandlers.hasOwnProperty(option)) {
                    operation(this, optionHandlers[option])(this, value, old);
                }
                signal(this, "optionChange", this, option);
            },

            getOption: function getOption(option) {
                return this.options[option];
            },
            getDoc: function getDoc() {
                return this.doc;
            },

            addKeyMap: function addKeyMap(map, bottom) {
                this.state.keyMaps[bottom ? "push" : "unshift"](getKeyMap(map));
            },
            removeKeyMap: function removeKeyMap(map) {
                var maps = this.state.keyMaps;
                for (var i = 0; i < maps.length; ++i) {
                    if (maps[i] == map || maps[i].name == map) {
                        maps.splice(i, 1);
                        return true;
                    }
                }
            },

            addOverlay: methodOp(function (spec, options) {
                var mode = spec.token ? spec : CodeMirror.getMode(this.options, spec);
                if (mode.startState) {
                    throw new Error("Overlays may not be stateful.");
                }
                insertSorted(this.state.overlays, { mode: mode, modeSpec: spec, opaque: options && options.opaque,
                    priority: options && options.priority || 0 }, function (overlay) {
                    return overlay.priority;
                });
                this.state.modeGen++;
                regChange(this);
            }),
            removeOverlay: methodOp(function (spec) {
                var overlays = this.state.overlays;
                for (var i = 0; i < overlays.length; ++i) {
                    var cur = overlays[i].modeSpec;
                    if (cur == spec || typeof spec == "string" && cur.name == spec) {
                        overlays.splice(i, 1);
                        this.state.modeGen++;
                        regChange(this);
                        return;
                    }
                }
            }),

            indentLine: methodOp(function (n, dir, aggressive) {
                if (typeof dir != "string" && typeof dir != "number") {
                    if (dir == null) {
                        dir = this.options.smartIndent ? "smart" : "prev";
                    } else {
                        dir = dir ? "add" : "subtract";
                    }
                }
                if (isLine(this.doc, n)) {
                    indentLine(this, n, dir, aggressive);
                }
            }),
            indentSelection: methodOp(function (how) {
                var ranges = this.doc.sel.ranges,
                    end = -1;
                for (var i = 0; i < ranges.length; i++) {
                    var range = ranges[i];
                    if (!range.empty()) {
                        var from = range.from(),
                            to = range.to();
                        var start = Math.max(end, from.line);
                        end = Math.min(this.lastLine(), to.line - (to.ch ? 0 : 1)) + 1;
                        for (var j = start; j < end; ++j) {
                            indentLine(this, j, how);
                        }
                        var newRanges = this.doc.sel.ranges;
                        if (from.ch == 0 && ranges.length == newRanges.length && newRanges[i].from().ch > 0) {
                            replaceOneSelection(this.doc, i, new Range(from, newRanges[i].to()), sel_dontScroll);
                        }
                    } else if (range.head.line > end) {
                        indentLine(this, range.head.line, how, true);
                        end = range.head.line;
                        if (i == this.doc.sel.primIndex) {
                            ensureCursorVisible(this);
                        }
                    }
                }
            }),

            // Fetch the parser token for a given character. Useful for hacks
            // that want to inspect the mode state (say, for completion).
            getTokenAt: function getTokenAt(pos, precise) {
                return takeToken(this, pos, precise);
            },

            getLineTokens: function getLineTokens(line, precise) {
                return takeToken(this, Pos(line), precise, true);
            },

            getTokenTypeAt: function getTokenTypeAt(pos) {
                pos = _clipPos(this.doc, pos);
                var styles = getLineStyles(this, getLine(this.doc, pos.line));
                var before = 0,
                    after = (styles.length - 1) / 2,
                    ch = pos.ch;
                var type;
                if (ch == 0) {
                    type = styles[2];
                } else {
                    for (;;) {
                        var mid = before + after >> 1;
                        if ((mid ? styles[mid * 2 - 1] : 0) >= ch) {
                            after = mid;
                        } else if (styles[mid * 2 + 1] < ch) {
                            before = mid + 1;
                        } else {
                            type = styles[mid * 2 + 2];break;
                        }
                    }
                }
                var cut = type ? type.indexOf("overlay ") : -1;
                return cut < 0 ? type : cut == 0 ? null : type.slice(0, cut - 1);
            },

            getModeAt: function getModeAt(pos) {
                var mode = this.doc.mode;
                if (!mode.innerMode) {
                    return mode;
                }
                return CodeMirror.innerMode(mode, this.getTokenAt(pos).state).mode;
            },

            getHelper: function getHelper(pos, type) {
                return this.getHelpers(pos, type)[0];
            },

            getHelpers: function getHelpers(pos, type) {
                var found = [];
                if (!helpers.hasOwnProperty(type)) {
                    return found;
                }
                var help = helpers[type],
                    mode = this.getModeAt(pos);
                if (typeof mode[type] == "string") {
                    if (help[mode[type]]) {
                        found.push(help[mode[type]]);
                    }
                } else if (mode[type]) {
                    for (var i = 0; i < mode[type].length; i++) {
                        var val = help[mode[type][i]];
                        if (val) {
                            found.push(val);
                        }
                    }
                } else if (mode.helperType && help[mode.helperType]) {
                    found.push(help[mode.helperType]);
                } else if (help[mode.name]) {
                    found.push(help[mode.name]);
                }
                for (var i$1 = 0; i$1 < help._global.length; i$1++) {
                    var cur = help._global[i$1];
                    if (cur.pred(mode, this) && indexOf(found, cur.val) == -1) {
                        found.push(cur.val);
                    }
                }
                return found;
            },

            getStateAfter: function getStateAfter(line, precise) {
                var doc = this.doc;
                line = clipLine(doc, line == null ? doc.first + doc.size - 1 : line);
                return getContextBefore(this, line + 1, precise).state;
            },

            cursorCoords: function cursorCoords(start, mode) {
                var pos,
                    range = this.doc.sel.primary();
                if (start == null) {
                    pos = range.head;
                } else if ((typeof start === "undefined" ? "undefined" : _typeof(start)) == "object") {
                    pos = _clipPos(this.doc, start);
                } else {
                    pos = start ? range.from() : range.to();
                }
                return _cursorCoords(this, pos, mode || "page");
            },

            charCoords: function charCoords(pos, mode) {
                return _charCoords(this, _clipPos(this.doc, pos), mode || "page");
            },

            coordsChar: function coordsChar(coords, mode) {
                coords = fromCoordSystem(this, coords, mode || "page");
                return _coordsChar(this, coords.left, coords.top);
            },

            lineAtHeight: function lineAtHeight(height, mode) {
                height = fromCoordSystem(this, { top: height, left: 0 }, mode || "page").top;
                return _lineAtHeight(this.doc, height + this.display.viewOffset);
            },
            heightAtLine: function heightAtLine(line, mode, includeWidgets) {
                var end = false,
                    lineObj;
                if (typeof line == "number") {
                    var last = this.doc.first + this.doc.size - 1;
                    if (line < this.doc.first) {
                        line = this.doc.first;
                    } else if (line > last) {
                        line = last;end = true;
                    }
                    lineObj = getLine(this.doc, line);
                } else {
                    lineObj = line;
                }
                return intoCoordSystem(this, lineObj, { top: 0, left: 0 }, mode || "page", includeWidgets || end).top + (end ? this.doc.height - _heightAtLine(lineObj) : 0);
            },

            defaultTextHeight: function defaultTextHeight() {
                return textHeight(this.display);
            },
            defaultCharWidth: function defaultCharWidth() {
                return charWidth(this.display);
            },

            getViewport: function getViewport() {
                return { from: this.display.viewFrom, to: this.display.viewTo };
            },

            addWidget: function addWidget(pos, node, scroll, vert, horiz) {
                var display = this.display;
                pos = _cursorCoords(this, _clipPos(this.doc, pos));
                var top = pos.bottom,
                    left = pos.left;
                node.style.position = "absolute";
                node.setAttribute("cm-ignore-events", "true");
                this.display.input.setUneditable(node);
                display.sizer.appendChild(node);
                if (vert == "over") {
                    top = pos.top;
                } else if (vert == "above" || vert == "near") {
                    var vspace = Math.max(display.wrapper.clientHeight, this.doc.height),
                        hspace = Math.max(display.sizer.clientWidth, display.lineSpace.clientWidth);
                    // Default to positioning above (if specified and possible); otherwise default to positioning below
                    if ((vert == 'above' || pos.bottom + node.offsetHeight > vspace) && pos.top > node.offsetHeight) {
                        top = pos.top - node.offsetHeight;
                    } else if (pos.bottom + node.offsetHeight <= vspace) {
                        top = pos.bottom;
                    }
                    if (left + node.offsetWidth > hspace) {
                        left = hspace - node.offsetWidth;
                    }
                }
                node.style.top = top + "px";
                node.style.left = node.style.right = "";
                if (horiz == "right") {
                    left = display.sizer.clientWidth - node.offsetWidth;
                    node.style.right = "0px";
                } else {
                    if (horiz == "left") {
                        left = 0;
                    } else if (horiz == "middle") {
                        left = (display.sizer.clientWidth - node.offsetWidth) / 2;
                    }
                    node.style.left = left + "px";
                }
                if (scroll) {
                    scrollIntoView(this, { left: left, top: top, right: left + node.offsetWidth, bottom: top + node.offsetHeight });
                }
            },

            triggerOnKeyDown: methodOp(onKeyDown),
            triggerOnKeyPress: methodOp(onKeyPress),
            triggerOnKeyUp: onKeyUp,
            triggerOnMouseDown: methodOp(onMouseDown),

            execCommand: function execCommand(cmd) {
                if (commands.hasOwnProperty(cmd)) {
                    return commands[cmd].call(null, this);
                }
            },

            triggerElectric: methodOp(function (text) {
                triggerElectric(this, text);
            }),

            findPosH: function findPosH(from, amount, unit, visually) {
                var dir = 1;
                if (amount < 0) {
                    dir = -1;amount = -amount;
                }
                var cur = _clipPos(this.doc, from);
                for (var i = 0; i < amount; ++i) {
                    cur = _findPosH(this.doc, cur, dir, unit, visually);
                    if (cur.hitSide) {
                        break;
                    }
                }
                return cur;
            },

            moveH: methodOp(function (dir, unit) {
                var this$1 = this;

                this.extendSelectionsBy(function (range) {
                    if (this$1.display.shift || this$1.doc.extend || range.empty()) {
                        return _findPosH(this$1.doc, range.head, dir, unit, this$1.options.rtlMoveVisually);
                    } else {
                        return dir < 0 ? range.from() : range.to();
                    }
                }, sel_move);
            }),

            deleteH: methodOp(function (dir, unit) {
                var sel = this.doc.sel,
                    doc = this.doc;
                if (sel.somethingSelected()) {
                    doc.replaceSelection("", null, "+delete");
                } else {
                    deleteNearSelection(this, function (range) {
                        var other = _findPosH(doc, range.head, dir, unit, false);
                        return dir < 0 ? { from: other, to: range.head } : { from: range.head, to: other };
                    });
                }
            }),

            findPosV: function findPosV(from, amount, unit, goalColumn) {
                var dir = 1,
                    x = goalColumn;
                if (amount < 0) {
                    dir = -1;amount = -amount;
                }
                var cur = _clipPos(this.doc, from);
                for (var i = 0; i < amount; ++i) {
                    var coords = _cursorCoords(this, cur, "div");
                    if (x == null) {
                        x = coords.left;
                    } else {
                        coords.left = x;
                    }
                    cur = _findPosV(this, coords, dir, unit);
                    if (cur.hitSide) {
                        break;
                    }
                }
                return cur;
            },

            moveV: methodOp(function (dir, unit) {
                var this$1 = this;

                var doc = this.doc,
                    goals = [];
                var collapse = !this.display.shift && !doc.extend && doc.sel.somethingSelected();
                doc.extendSelectionsBy(function (range) {
                    if (collapse) {
                        return dir < 0 ? range.from() : range.to();
                    }
                    var headPos = _cursorCoords(this$1, range.head, "div");
                    if (range.goalColumn != null) {
                        headPos.left = range.goalColumn;
                    }
                    goals.push(headPos.left);
                    var pos = _findPosV(this$1, headPos, dir, unit);
                    if (unit == "page" && range == doc.sel.primary()) {
                        addToScrollTop(this$1, _charCoords(this$1, pos, "div").top - headPos.top);
                    }
                    return pos;
                }, sel_move);
                if (goals.length) {
                    for (var i = 0; i < doc.sel.ranges.length; i++) {
                        doc.sel.ranges[i].goalColumn = goals[i];
                    }
                }
            }),

            // Find the word at the given position (as returned by coordsChar).
            findWordAt: function findWordAt(pos) {
                var doc = this.doc,
                    line = getLine(doc, pos.line).text;
                var start = pos.ch,
                    end = pos.ch;
                if (line) {
                    var helper = this.getHelper(pos, "wordChars");
                    if ((pos.sticky == "before" || end == line.length) && start) {
                        --start;
                    } else {
                        ++end;
                    }
                    var startChar = line.charAt(start);
                    var check = isWordChar(startChar, helper) ? function (ch) {
                        return isWordChar(ch, helper);
                    } : /\s/.test(startChar) ? function (ch) {
                        return (/\s/.test(ch)
                        );
                    } : function (ch) {
                        return !/\s/.test(ch) && !isWordChar(ch);
                    };
                    while (start > 0 && check(line.charAt(start - 1))) {
                        --start;
                    }
                    while (end < line.length && check(line.charAt(end))) {
                        ++end;
                    }
                }
                return new Range(Pos(pos.line, start), Pos(pos.line, end));
            },

            toggleOverwrite: function toggleOverwrite(value) {
                if (value != null && value == this.state.overwrite) {
                    return;
                }
                if (this.state.overwrite = !this.state.overwrite) {
                    addClass(this.display.cursorDiv, "CodeMirror-overwrite");
                } else {
                    rmClass(this.display.cursorDiv, "CodeMirror-overwrite");
                }

                signal(this, "overwriteToggle", this, this.state.overwrite);
            },
            hasFocus: function hasFocus() {
                return this.display.input.getField() == activeElt();
            },
            isReadOnly: function isReadOnly() {
                return !!(this.options.readOnly || this.doc.cantEdit);
            },

            scrollTo: methodOp(function (x, y) {
                scrollToCoords(this, x, y);
            }),
            getScrollInfo: function getScrollInfo() {
                var scroller = this.display.scroller;
                return { left: scroller.scrollLeft, top: scroller.scrollTop,
                    height: scroller.scrollHeight - scrollGap(this) - this.display.barHeight,
                    width: scroller.scrollWidth - scrollGap(this) - this.display.barWidth,
                    clientHeight: displayHeight(this), clientWidth: displayWidth(this) };
            },

            scrollIntoView: methodOp(function (range, margin) {
                if (range == null) {
                    range = { from: this.doc.sel.primary().head, to: null };
                    if (margin == null) {
                        margin = this.options.cursorScrollMargin;
                    }
                } else if (typeof range == "number") {
                    range = { from: Pos(range, 0), to: null };
                } else if (range.from == null) {
                    range = { from: range, to: null };
                }
                if (!range.to) {
                    range.to = range.from;
                }
                range.margin = margin || 0;

                if (range.from.line != null) {
                    scrollToRange(this, range);
                } else {
                    scrollToCoordsRange(this, range.from, range.to, range.margin);
                }
            }),

            setSize: methodOp(function (width, height) {
                var this$1 = this;

                var interpret = function interpret(val) {
                    return typeof val == "number" || /^\d+$/.test(String(val)) ? val + "px" : val;
                };
                if (width != null) {
                    this.display.wrapper.style.width = interpret(width);
                }
                if (height != null) {
                    this.display.wrapper.style.height = interpret(height);
                }
                if (this.options.lineWrapping) {
                    clearLineMeasurementCache(this);
                }
                var lineNo = this.display.viewFrom;
                this.doc.iter(lineNo, this.display.viewTo, function (line) {
                    if (line.widgets) {
                        for (var i = 0; i < line.widgets.length; i++) {
                            if (line.widgets[i].noHScroll) {
                                regLineChange(this$1, lineNo, "widget");break;
                            }
                        }
                    }
                    ++lineNo;
                });
                this.curOp.forceUpdate = true;
                signal(this, "refresh", this);
            }),

            operation: function operation(f) {
                return runInOp(this, f);
            },
            startOperation: function startOperation() {
                return _startOperation(this);
            },
            endOperation: function endOperation() {
                return _endOperation(this);
            },

            refresh: methodOp(function () {
                var oldHeight = this.display.cachedTextHeight;
                regChange(this);
                this.curOp.forceUpdate = true;
                clearCaches(this);
                scrollToCoords(this, this.doc.scrollLeft, this.doc.scrollTop);
                updateGutterSpace(this.display);
                if (oldHeight == null || Math.abs(oldHeight - textHeight(this.display)) > .5) {
                    estimateLineHeights(this);
                }
                signal(this, "refresh", this);
            }),

            swapDoc: methodOp(function (doc) {
                var old = this.doc;
                old.cm = null;
                // Cancel the current text selection if any (#5821)
                if (this.state.selectingText) {
                    this.state.selectingText();
                }
                attachDoc(this, doc);
                clearCaches(this);
                this.display.input.reset();
                scrollToCoords(this, doc.scrollLeft, doc.scrollTop);
                this.curOp.forceScroll = true;
                signalLater(this, "swapDoc", this, old);
                return old;
            }),

            phrase: function phrase(phraseText) {
                var phrases = this.options.phrases;
                return phrases && Object.prototype.hasOwnProperty.call(phrases, phraseText) ? phrases[phraseText] : phraseText;
            },

            getInputField: function getInputField() {
                return this.display.input.getField();
            },
            getWrapperElement: function getWrapperElement() {
                return this.display.wrapper;
            },
            getScrollerElement: function getScrollerElement() {
                return this.display.scroller;
            },
            getGutterElement: function getGutterElement() {
                return this.display.gutters;
            }
        };
        eventMixin(CodeMirror);

        CodeMirror.registerHelper = function (type, name, value) {
            if (!helpers.hasOwnProperty(type)) {
                helpers[type] = CodeMirror[type] = { _global: [] };
            }
            helpers[type][name] = value;
        };
        CodeMirror.registerGlobalHelper = function (type, name, predicate, value) {
            CodeMirror.registerHelper(type, name, value);
            helpers[type]._global.push({ pred: predicate, val: value });
        };
    }

    // Used for horizontal relative motion. Dir is -1 or 1 (left or
    // right), unit can be "char", "column" (like char, but doesn't
    // cross line boundaries), "word" (across next word), or "group" (to
    // the start of next group of word or non-word-non-whitespace
    // chars). The visually param controls whether, in right-to-left
    // text, direction 1 means to move towards the next index in the
    // string, or towards the character to the right of the current
    // position. The resulting position will have a hitSide=true
    // property if it reached the end of the document.
    function _findPosH(doc, pos, dir, unit, visually) {
        var oldPos = pos;
        var origDir = dir;
        var lineObj = getLine(doc, pos.line);
        var lineDir = visually && doc.cm && doc.cm.getOption("direction") == "rtl" ? -dir : dir;
        function findNextLine() {
            var l = pos.line + lineDir;
            if (l < doc.first || l >= doc.first + doc.size) {
                return false;
            }
            pos = new Pos(l, pos.ch, pos.sticky);
            return lineObj = getLine(doc, l);
        }
        function moveOnce(boundToLine) {
            var next;
            if (visually) {
                next = moveVisually(doc.cm, lineObj, pos, dir);
            } else {
                next = moveLogically(lineObj, pos, dir);
            }
            if (next == null) {
                if (!boundToLine && findNextLine()) {
                    pos = endOfLine(visually, doc.cm, lineObj, pos.line, lineDir);
                } else {
                    return false;
                }
            } else {
                pos = next;
            }
            return true;
        }

        if (unit == "char") {
            moveOnce();
        } else if (unit == "column") {
            moveOnce(true);
        } else if (unit == "word" || unit == "group") {
            var sawType = null,
                group = unit == "group";
            var helper = doc.cm && doc.cm.getHelper(pos, "wordChars");
            for (var first = true;; first = false) {
                if (dir < 0 && !moveOnce(!first)) {
                    break;
                }
                var cur = lineObj.text.charAt(pos.ch) || "\n";
                var type = isWordChar(cur, helper) ? "w" : group && cur == "\n" ? "n" : !group || /\s/.test(cur) ? null : "p";
                if (group && !first && !type) {
                    type = "s";
                }
                if (sawType && sawType != type) {
                    if (dir < 0) {
                        dir = 1;moveOnce();pos.sticky = "after";
                    }
                    break;
                }

                if (type) {
                    sawType = type;
                }
                if (dir > 0 && !moveOnce(!first)) {
                    break;
                }
            }
        }
        var result = skipAtomic(doc, pos, oldPos, origDir, true);
        if (equalCursorPos(oldPos, result)) {
            result.hitSide = true;
        }
        return result;
    }

    // For relative vertical movement. Dir may be -1 or 1. Unit can be
    // "page" or "line". The resulting position will have a hitSide=true
    // property if it reached the end of the document.
    function _findPosV(cm, pos, dir, unit) {
        var doc = cm.doc,
            x = pos.left,
            y;
        if (unit == "page") {
            var pageSize = Math.min(cm.display.wrapper.clientHeight, window.innerHeight || document.documentElement.clientHeight);
            var moveAmount = Math.max(pageSize - .5 * textHeight(cm.display), 3);
            y = (dir > 0 ? pos.bottom : pos.top) + dir * moveAmount;
        } else if (unit == "line") {
            y = dir > 0 ? pos.bottom + 3 : pos.top - 3;
        }
        var target;
        for (;;) {
            target = _coordsChar(cm, x, y);
            if (!target.outside) {
                break;
            }
            if (dir < 0 ? y <= 0 : y >= doc.height) {
                target.hitSide = true;break;
            }
            y += dir * 5;
        }
        return target;
    }

    // CONTENTEDITABLE INPUT STYLE

    var ContentEditableInput = function ContentEditableInput(cm) {
        this.cm = cm;
        this.lastAnchorNode = this.lastAnchorOffset = this.lastFocusNode = this.lastFocusOffset = null;
        this.polling = new Delayed();
        this.composing = null;
        this.gracePeriod = false;
        this.readDOMTimeout = null;
    };

    ContentEditableInput.prototype.init = function (display) {
        var this$1 = this;

        var input = this,
            cm = input.cm;
        var div = input.div = display.lineDiv;
        disableBrowserMagic(div, cm.options.spellcheck, cm.options.autocorrect, cm.options.autocapitalize);

        on(div, "paste", function (e) {
            if (signalDOMEvent(cm, e) || handlePaste(e, cm)) {
                return;
            }
            // IE doesn't fire input events, so we schedule a read for the pasted content in this way
            if (ie_version <= 11) {
                setTimeout(operation(cm, function () {
                    return this$1.updateFromDOM();
                }), 20);
            }
        });

        on(div, "compositionstart", function (e) {
            this$1.composing = { data: e.data, done: false };
        });
        on(div, "compositionupdate", function (e) {
            if (!this$1.composing) {
                this$1.composing = { data: e.data, done: false };
            }
        });
        on(div, "compositionend", function (e) {
            if (this$1.composing) {
                if (e.data != this$1.composing.data) {
                    this$1.readFromDOMSoon();
                }
                this$1.composing.done = true;
            }
        });

        on(div, "touchstart", function () {
            return input.forceCompositionEnd();
        });

        on(div, "input", function () {
            if (!this$1.composing) {
                this$1.readFromDOMSoon();
            }
        });

        function onCopyCut(e) {
            if (signalDOMEvent(cm, e)) {
                return;
            }
            if (cm.somethingSelected()) {
                setLastCopied({ lineWise: false, text: cm.getSelections() });
                if (e.type == "cut") {
                    cm.replaceSelection("", null, "cut");
                }
            } else if (!cm.options.lineWiseCopyCut) {
                return;
            } else {
                var ranges = copyableRanges(cm);
                setLastCopied({ lineWise: true, text: ranges.text });
                if (e.type == "cut") {
                    cm.operation(function () {
                        cm.setSelections(ranges.ranges, 0, sel_dontScroll);
                        cm.replaceSelection("", null, "cut");
                    });
                }
            }
            if (e.clipboardData) {
                e.clipboardData.clearData();
                var content = lastCopied.text.join("\n");
                // iOS exposes the clipboard API, but seems to discard content inserted into it
                e.clipboardData.setData("Text", content);
                if (e.clipboardData.getData("Text") == content) {
                    e.preventDefault();
                    return;
                }
            }
            // Old-fashioned briefly-focus-a-textarea hack
            var kludge = hiddenTextarea(),
                te = kludge.firstChild;
            cm.display.lineSpace.insertBefore(kludge, cm.display.lineSpace.firstChild);
            te.value = lastCopied.text.join("\n");
            var hadFocus = document.activeElement;
            selectInput(te);
            setTimeout(function () {
                cm.display.lineSpace.removeChild(kludge);
                hadFocus.focus();
                if (hadFocus == div) {
                    input.showPrimarySelection();
                }
            }, 50);
        }
        on(div, "copy", onCopyCut);
        on(div, "cut", onCopyCut);
    };

    ContentEditableInput.prototype.prepareSelection = function () {
        var result = prepareSelection(this.cm, false);
        result.focus = this.cm.state.focused;
        return result;
    };

    ContentEditableInput.prototype.showSelection = function (info, takeFocus) {
        if (!info || !this.cm.display.view.length) {
            return;
        }
        if (info.focus || takeFocus) {
            this.showPrimarySelection();
        }
        this.showMultipleSelections(info);
    };

    ContentEditableInput.prototype.getSelection = function () {
        return this.cm.display.wrapper.ownerDocument.getSelection();
    };

    ContentEditableInput.prototype.showPrimarySelection = function () {
        var sel = this.getSelection(),
            cm = this.cm,
            prim = cm.doc.sel.primary();
        var from = prim.from(),
            to = prim.to();

        if (cm.display.viewTo == cm.display.viewFrom || from.line >= cm.display.viewTo || to.line < cm.display.viewFrom) {
            sel.removeAllRanges();
            return;
        }

        var curAnchor = domToPos(cm, sel.anchorNode, sel.anchorOffset);
        var curFocus = domToPos(cm, sel.focusNode, sel.focusOffset);
        if (curAnchor && !curAnchor.bad && curFocus && !curFocus.bad && cmp(minPos(curAnchor, curFocus), from) == 0 && cmp(maxPos(curAnchor, curFocus), to) == 0) {
            return;
        }

        var view = cm.display.view;
        var start = from.line >= cm.display.viewFrom && posToDOM(cm, from) || { node: view[0].measure.map[2], offset: 0 };
        var end = to.line < cm.display.viewTo && posToDOM(cm, to);
        if (!end) {
            var measure = view[view.length - 1].measure;
            var map = measure.maps ? measure.maps[measure.maps.length - 1] : measure.map;
            end = { node: map[map.length - 1], offset: map[map.length - 2] - map[map.length - 3] };
        }

        if (!start || !end) {
            sel.removeAllRanges();
            return;
        }

        var old = sel.rangeCount && sel.getRangeAt(0),
            rng;
        try {
            rng = range(start.node, start.offset, end.offset, end.node);
        } catch (e) {} // Our model of the DOM might be outdated, in which case the range we try to set can be impossible
        if (rng) {
            if (!gecko && cm.state.focused) {
                sel.collapse(start.node, start.offset);
                if (!rng.collapsed) {
                    sel.removeAllRanges();
                    sel.addRange(rng);
                }
            } else {
                sel.removeAllRanges();
                sel.addRange(rng);
            }
            if (old && sel.anchorNode == null) {
                sel.addRange(old);
            } else if (gecko) {
                this.startGracePeriod();
            }
        }
        this.rememberSelection();
    };

    ContentEditableInput.prototype.startGracePeriod = function () {
        var this$1 = this;

        clearTimeout(this.gracePeriod);
        this.gracePeriod = setTimeout(function () {
            this$1.gracePeriod = false;
            if (this$1.selectionChanged()) {
                this$1.cm.operation(function () {
                    return this$1.cm.curOp.selectionChanged = true;
                });
            }
        }, 20);
    };

    ContentEditableInput.prototype.showMultipleSelections = function (info) {
        removeChildrenAndAdd(this.cm.display.cursorDiv, info.cursors);
        removeChildrenAndAdd(this.cm.display.selectionDiv, info.selection);
    };

    ContentEditableInput.prototype.rememberSelection = function () {
        var sel = this.getSelection();
        this.lastAnchorNode = sel.anchorNode;this.lastAnchorOffset = sel.anchorOffset;
        this.lastFocusNode = sel.focusNode;this.lastFocusOffset = sel.focusOffset;
    };

    ContentEditableInput.prototype.selectionInEditor = function () {
        var sel = this.getSelection();
        if (!sel.rangeCount) {
            return false;
        }
        var node = sel.getRangeAt(0).commonAncestorContainer;
        return contains(this.div, node);
    };

    ContentEditableInput.prototype.focus = function () {
        if (this.cm.options.readOnly != "nocursor") {
            if (!this.selectionInEditor()) {
                this.showSelection(this.prepareSelection(), true);
            }
            this.div.focus();
        }
    };
    ContentEditableInput.prototype.blur = function () {
        this.div.blur();
    };
    ContentEditableInput.prototype.getField = function () {
        return this.div;
    };

    ContentEditableInput.prototype.supportsTouch = function () {
        return true;
    };

    ContentEditableInput.prototype.receivedFocus = function () {
        var input = this;
        if (this.selectionInEditor()) {
            this.pollSelection();
        } else {
            runInOp(this.cm, function () {
                return input.cm.curOp.selectionChanged = true;
            });
        }

        function poll() {
            if (input.cm.state.focused) {
                input.pollSelection();
                input.polling.set(input.cm.options.pollInterval, poll);
            }
        }
        this.polling.set(this.cm.options.pollInterval, poll);
    };

    ContentEditableInput.prototype.selectionChanged = function () {
        var sel = this.getSelection();
        return sel.anchorNode != this.lastAnchorNode || sel.anchorOffset != this.lastAnchorOffset || sel.focusNode != this.lastFocusNode || sel.focusOffset != this.lastFocusOffset;
    };

    ContentEditableInput.prototype.pollSelection = function () {
        if (this.readDOMTimeout != null || this.gracePeriod || !this.selectionChanged()) {
            return;
        }
        var sel = this.getSelection(),
            cm = this.cm;
        // On Android Chrome (version 56, at least), backspacing into an
        // uneditable block element will put the cursor in that element,
        // and then, because it's not editable, hide the virtual keyboard.
        // Because Android doesn't allow us to actually detect backspace
        // presses in a sane way, this code checks for when that happens
        // and simulates a backspace press in this case.
        if (android && chrome && this.cm.display.gutterSpecs.length && isInGutter(sel.anchorNode)) {
            this.cm.triggerOnKeyDown({ type: "keydown", keyCode: 8, preventDefault: Math.abs });
            this.blur();
            this.focus();
            return;
        }
        if (this.composing) {
            return;
        }
        this.rememberSelection();
        var anchor = domToPos(cm, sel.anchorNode, sel.anchorOffset);
        var head = domToPos(cm, sel.focusNode, sel.focusOffset);
        if (anchor && head) {
            runInOp(cm, function () {
                setSelection(cm.doc, simpleSelection(anchor, head), sel_dontScroll);
                if (anchor.bad || head.bad) {
                    cm.curOp.selectionChanged = true;
                }
            });
        }
    };

    ContentEditableInput.prototype.pollContent = function () {
        if (this.readDOMTimeout != null) {
            clearTimeout(this.readDOMTimeout);
            this.readDOMTimeout = null;
        }

        var cm = this.cm,
            display = cm.display,
            sel = cm.doc.sel.primary();
        var from = sel.from(),
            to = sel.to();
        if (from.ch == 0 && from.line > cm.firstLine()) {
            from = Pos(from.line - 1, getLine(cm.doc, from.line - 1).length);
        }
        if (to.ch == getLine(cm.doc, to.line).text.length && to.line < cm.lastLine()) {
            to = Pos(to.line + 1, 0);
        }
        if (from.line < display.viewFrom || to.line > display.viewTo - 1) {
            return false;
        }

        var fromIndex, fromLine, fromNode;
        if (from.line == display.viewFrom || (fromIndex = findViewIndex(cm, from.line)) == 0) {
            fromLine = lineNo(display.view[0].line);
            fromNode = display.view[0].node;
        } else {
            fromLine = lineNo(display.view[fromIndex].line);
            fromNode = display.view[fromIndex - 1].node.nextSibling;
        }
        var toIndex = findViewIndex(cm, to.line);
        var toLine, toNode;
        if (toIndex == display.view.length - 1) {
            toLine = display.viewTo - 1;
            toNode = display.lineDiv.lastChild;
        } else {
            toLine = lineNo(display.view[toIndex + 1].line) - 1;
            toNode = display.view[toIndex + 1].node.previousSibling;
        }

        if (!fromNode) {
            return false;
        }
        var newText = cm.doc.splitLines(domTextBetween(cm, fromNode, toNode, fromLine, toLine));
        var oldText = getBetween(cm.doc, Pos(fromLine, 0), Pos(toLine, getLine(cm.doc, toLine).text.length));
        while (newText.length > 1 && oldText.length > 1) {
            if (lst(newText) == lst(oldText)) {
                newText.pop();oldText.pop();toLine--;
            } else if (newText[0] == oldText[0]) {
                newText.shift();oldText.shift();fromLine++;
            } else {
                break;
            }
        }

        var cutFront = 0,
            cutEnd = 0;
        var newTop = newText[0],
            oldTop = oldText[0],
            maxCutFront = Math.min(newTop.length, oldTop.length);
        while (cutFront < maxCutFront && newTop.charCodeAt(cutFront) == oldTop.charCodeAt(cutFront)) {
            ++cutFront;
        }
        var newBot = lst(newText),
            oldBot = lst(oldText);
        var maxCutEnd = Math.min(newBot.length - (newText.length == 1 ? cutFront : 0), oldBot.length - (oldText.length == 1 ? cutFront : 0));
        while (cutEnd < maxCutEnd && newBot.charCodeAt(newBot.length - cutEnd - 1) == oldBot.charCodeAt(oldBot.length - cutEnd - 1)) {
            ++cutEnd;
        }
        // Try to move start of change to start of selection if ambiguous
        if (newText.length == 1 && oldText.length == 1 && fromLine == from.line) {
            while (cutFront && cutFront > from.ch && newBot.charCodeAt(newBot.length - cutEnd - 1) == oldBot.charCodeAt(oldBot.length - cutEnd - 1)) {
                cutFront--;
                cutEnd++;
            }
        }

        newText[newText.length - 1] = newBot.slice(0, newBot.length - cutEnd).replace(/^\u200b+/, "");
        newText[0] = newText[0].slice(cutFront).replace(/\u200b+$/, "");

        var chFrom = Pos(fromLine, cutFront);
        var chTo = Pos(toLine, oldText.length ? lst(oldText).length - cutEnd : 0);
        if (newText.length > 1 || newText[0] || cmp(chFrom, chTo)) {
            _replaceRange(cm.doc, newText, chFrom, chTo, "+input");
            return true;
        }
    };

    ContentEditableInput.prototype.ensurePolled = function () {
        this.forceCompositionEnd();
    };
    ContentEditableInput.prototype.reset = function () {
        this.forceCompositionEnd();
    };
    ContentEditableInput.prototype.forceCompositionEnd = function () {
        if (!this.composing) {
            return;
        }
        clearTimeout(this.readDOMTimeout);
        this.composing = null;
        this.updateFromDOM();
        this.div.blur();
        this.div.focus();
    };
    ContentEditableInput.prototype.readFromDOMSoon = function () {
        var this$1 = this;

        if (this.readDOMTimeout != null) {
            return;
        }
        this.readDOMTimeout = setTimeout(function () {
            this$1.readDOMTimeout = null;
            if (this$1.composing) {
                if (this$1.composing.done) {
                    this$1.composing = null;
                } else {
                    return;
                }
            }
            this$1.updateFromDOM();
        }, 80);
    };

    ContentEditableInput.prototype.updateFromDOM = function () {
        var this$1 = this;

        if (this.cm.isReadOnly() || !this.pollContent()) {
            runInOp(this.cm, function () {
                return regChange(this$1.cm);
            });
        }
    };

    ContentEditableInput.prototype.setUneditable = function (node) {
        node.contentEditable = "false";
    };

    ContentEditableInput.prototype.onKeyPress = function (e) {
        if (e.charCode == 0 || this.composing) {
            return;
        }
        e.preventDefault();
        if (!this.cm.isReadOnly()) {
            operation(this.cm, applyTextInput)(this.cm, String.fromCharCode(e.charCode == null ? e.keyCode : e.charCode), 0);
        }
    };

    ContentEditableInput.prototype.readOnlyChanged = function (val) {
        this.div.contentEditable = String(val != "nocursor");
    };

    ContentEditableInput.prototype.onContextMenu = function () {};
    ContentEditableInput.prototype.resetPosition = function () {};

    ContentEditableInput.prototype.needsContentAttribute = true;

    function posToDOM(cm, pos) {
        var view = findViewForLine(cm, pos.line);
        if (!view || view.hidden) {
            return null;
        }
        var line = getLine(cm.doc, pos.line);
        var info = mapFromLineView(view, line, pos.line);

        var order = getOrder(line, cm.doc.direction),
            side = "left";
        if (order) {
            var partPos = getBidiPartAt(order, pos.ch);
            side = partPos % 2 ? "right" : "left";
        }
        var result = nodeAndOffsetInLineMap(info.map, pos.ch, side);
        result.offset = result.collapse == "right" ? result.end : result.start;
        return result;
    }

    function isInGutter(node) {
        for (var scan = node; scan; scan = scan.parentNode) {
            if (/CodeMirror-gutter-wrapper/.test(scan.className)) {
                return true;
            }
        }
        return false;
    }

    function badPos(pos, bad) {
        if (bad) {
            pos.bad = true;
        }return pos;
    }

    function domTextBetween(cm, from, to, fromLine, toLine) {
        var text = "",
            closing = false,
            lineSep = cm.doc.lineSeparator(),
            extraLinebreak = false;
        function recognizeMarker(id) {
            return function (marker) {
                return marker.id == id;
            };
        }
        function close() {
            if (closing) {
                text += lineSep;
                if (extraLinebreak) {
                    text += lineSep;
                }
                closing = extraLinebreak = false;
            }
        }
        function addText(str) {
            if (str) {
                close();
                text += str;
            }
        }
        function walk(node) {
            if (node.nodeType == 1) {
                var cmText = node.getAttribute("cm-text");
                if (cmText) {
                    addText(cmText);
                    return;
                }
                var markerID = node.getAttribute("cm-marker"),
                    range;
                if (markerID) {
                    var found = cm.findMarks(Pos(fromLine, 0), Pos(toLine + 1, 0), recognizeMarker(+markerID));
                    if (found.length && (range = found[0].find(0))) {
                        addText(getBetween(cm.doc, range.from, range.to).join(lineSep));
                    }
                    return;
                }
                if (node.getAttribute("contenteditable") == "false") {
                    return;
                }
                var isBlock = /^(pre|div|p|li|table|br)$/i.test(node.nodeName);
                if (!/^br$/i.test(node.nodeName) && node.textContent.length == 0) {
                    return;
                }

                if (isBlock) {
                    close();
                }
                for (var i = 0; i < node.childNodes.length; i++) {
                    walk(node.childNodes[i]);
                }

                if (/^(pre|p)$/i.test(node.nodeName)) {
                    extraLinebreak = true;
                }
                if (isBlock) {
                    closing = true;
                }
            } else if (node.nodeType == 3) {
                addText(node.nodeValue.replace(/\u200b/g, "").replace(/\u00a0/g, " "));
            }
        }
        for (;;) {
            walk(from);
            if (from == to) {
                break;
            }
            from = from.nextSibling;
            extraLinebreak = false;
        }
        return text;
    }

    function domToPos(cm, node, offset) {
        var lineNode;
        if (node == cm.display.lineDiv) {
            lineNode = cm.display.lineDiv.childNodes[offset];
            if (!lineNode) {
                return badPos(cm.clipPos(Pos(cm.display.viewTo - 1)), true);
            }
            node = null;offset = 0;
        } else {
            for (lineNode = node;; lineNode = lineNode.parentNode) {
                if (!lineNode || lineNode == cm.display.lineDiv) {
                    return null;
                }
                if (lineNode.parentNode && lineNode.parentNode == cm.display.lineDiv) {
                    break;
                }
            }
        }
        for (var i = 0; i < cm.display.view.length; i++) {
            var lineView = cm.display.view[i];
            if (lineView.node == lineNode) {
                return locateNodeInLineView(lineView, node, offset);
            }
        }
    }

    function locateNodeInLineView(lineView, node, offset) {
        var wrapper = lineView.text.firstChild,
            bad = false;
        if (!node || !contains(wrapper, node)) {
            return badPos(Pos(lineNo(lineView.line), 0), true);
        }
        if (node == wrapper) {
            bad = true;
            node = wrapper.childNodes[offset];
            offset = 0;
            if (!node) {
                var line = lineView.rest ? lst(lineView.rest) : lineView.line;
                return badPos(Pos(lineNo(line), line.text.length), bad);
            }
        }

        var textNode = node.nodeType == 3 ? node : null,
            topNode = node;
        if (!textNode && node.childNodes.length == 1 && node.firstChild.nodeType == 3) {
            textNode = node.firstChild;
            if (offset) {
                offset = textNode.nodeValue.length;
            }
        }
        while (topNode.parentNode != wrapper) {
            topNode = topNode.parentNode;
        }
        var measure = lineView.measure,
            maps = measure.maps;

        function find(textNode, topNode, offset) {
            for (var i = -1; i < (maps ? maps.length : 0); i++) {
                var map = i < 0 ? measure.map : maps[i];
                for (var j = 0; j < map.length; j += 3) {
                    var curNode = map[j + 2];
                    if (curNode == textNode || curNode == topNode) {
                        var line = lineNo(i < 0 ? lineView.line : lineView.rest[i]);
                        var ch = map[j] + offset;
                        if (offset < 0 || curNode != textNode) {
                            ch = map[j + (offset ? 1 : 0)];
                        }
                        return Pos(line, ch);
                    }
                }
            }
        }
        var found = find(textNode, topNode, offset);
        if (found) {
            return badPos(found, bad);
        }

        // FIXME this is all really shaky. might handle the few cases it needs to handle, but likely to cause problems
        for (var after = topNode.nextSibling, dist = textNode ? textNode.nodeValue.length - offset : 0; after; after = after.nextSibling) {
            found = find(after, after.firstChild, 0);
            if (found) {
                return badPos(Pos(found.line, found.ch - dist), bad);
            } else {
                dist += after.textContent.length;
            }
        }
        for (var before = topNode.previousSibling, dist$1 = offset; before; before = before.previousSibling) {
            found = find(before, before.firstChild, -1);
            if (found) {
                return badPos(Pos(found.line, found.ch + dist$1), bad);
            } else {
                dist$1 += before.textContent.length;
            }
        }
    }

    // TEXTAREA INPUT STYLE

    var TextareaInput = function TextareaInput(cm) {
        this.cm = cm;
        // See input.poll and input.reset
        this.prevInput = "";

        // Flag that indicates whether we expect input to appear real soon
        // now (after some event like 'keypress' or 'input') and are
        // polling intensively.
        this.pollingFast = false;
        // Self-resetting timeout for the poller
        this.polling = new Delayed();
        // Used to work around IE issue with selection being forgotten when focus moves away from textarea
        this.hasSelection = false;
        this.composing = null;
    };

    TextareaInput.prototype.init = function (display) {
        var this$1 = this;

        var input = this,
            cm = this.cm;
        this.createField(display);
        var te = this.textarea;

        display.wrapper.insertBefore(this.wrapper, display.wrapper.firstChild);

        // Needed to hide big blue blinking cursor on Mobile Safari (doesn't seem to work in iOS 8 anymore)
        if (ios) {
            te.style.width = "0px";
        }

        on(te, "input", function () {
            if (ie && ie_version >= 9 && this$1.hasSelection) {
                this$1.hasSelection = null;
            }
            input.poll();
        });

        on(te, "paste", function (e) {
            if (signalDOMEvent(cm, e) || handlePaste(e, cm)) {
                return;
            }

            cm.state.pasteIncoming = +new Date();
            input.fastPoll();
        });

        function prepareCopyCut(e) {
            if (signalDOMEvent(cm, e)) {
                return;
            }
            if (cm.somethingSelected()) {
                setLastCopied({ lineWise: false, text: cm.getSelections() });
            } else if (!cm.options.lineWiseCopyCut) {
                return;
            } else {
                var ranges = copyableRanges(cm);
                setLastCopied({ lineWise: true, text: ranges.text });
                if (e.type == "cut") {
                    cm.setSelections(ranges.ranges, null, sel_dontScroll);
                } else {
                    input.prevInput = "";
                    te.value = ranges.text.join("\n");
                    selectInput(te);
                }
            }
            if (e.type == "cut") {
                cm.state.cutIncoming = +new Date();
            }
        }
        on(te, "cut", prepareCopyCut);
        on(te, "copy", prepareCopyCut);

        on(display.scroller, "paste", function (e) {
            if (eventInWidget(display, e) || signalDOMEvent(cm, e)) {
                return;
            }
            if (!te.dispatchEvent) {
                cm.state.pasteIncoming = +new Date();
                input.focus();
                return;
            }

            // Pass the `paste` event to the textarea so it's handled by its event listener.
            var event = new Event("paste");
            event.clipboardData = e.clipboardData;
            te.dispatchEvent(event);
        });

        // Prevent normal selection in the editor (we handle our own)
        on(display.lineSpace, "selectstart", function (e) {
            if (!eventInWidget(display, e)) {
                e_preventDefault(e);
            }
        });

        on(te, "compositionstart", function () {
            var start = cm.getCursor("from");
            if (input.composing) {
                input.composing.range.clear();
            }
            input.composing = {
                start: start,
                range: cm.markText(start, cm.getCursor("to"), { className: "CodeMirror-composing" })
            };
        });
        on(te, "compositionend", function () {
            if (input.composing) {
                input.poll();
                input.composing.range.clear();
                input.composing = null;
            }
        });
    };

    TextareaInput.prototype.createField = function (_display) {
        // Wraps and hides input textarea
        this.wrapper = hiddenTextarea();
        // The semihidden textarea that is focused when the editor is
        // focused, and receives input.
        this.textarea = this.wrapper.firstChild;
    };

    TextareaInput.prototype.prepareSelection = function () {
        // Redraw the selection and/or cursor
        var cm = this.cm,
            display = cm.display,
            doc = cm.doc;
        var result = prepareSelection(cm);

        // Move the hidden textarea near the cursor to prevent scrolling artifacts
        if (cm.options.moveInputWithCursor) {
            var headPos = _cursorCoords(cm, doc.sel.primary().head, "div");
            var wrapOff = display.wrapper.getBoundingClientRect(),
                lineOff = display.lineDiv.getBoundingClientRect();
            result.teTop = Math.max(0, Math.min(display.wrapper.clientHeight - 10, headPos.top + lineOff.top - wrapOff.top));
            result.teLeft = Math.max(0, Math.min(display.wrapper.clientWidth - 10, headPos.left + lineOff.left - wrapOff.left));
        }

        return result;
    };

    TextareaInput.prototype.showSelection = function (drawn) {
        var cm = this.cm,
            display = cm.display;
        removeChildrenAndAdd(display.cursorDiv, drawn.cursors);
        removeChildrenAndAdd(display.selectionDiv, drawn.selection);
        if (drawn.teTop != null) {
            this.wrapper.style.top = drawn.teTop + "px";
            this.wrapper.style.left = drawn.teLeft + "px";
        }
    };

    // Reset the input to correspond to the selection (or to be empty,
    // when not typing and nothing is selected)
    TextareaInput.prototype.reset = function (typing) {
        if (this.contextMenuPending || this.composing) {
            return;
        }
        var cm = this.cm;
        if (cm.somethingSelected()) {
            this.prevInput = "";
            var content = cm.getSelection();
            this.textarea.value = content;
            if (cm.state.focused) {
                selectInput(this.textarea);
            }
            if (ie && ie_version >= 9) {
                this.hasSelection = content;
            }
        } else if (!typing) {
            this.prevInput = this.textarea.value = "";
            if (ie && ie_version >= 9) {
                this.hasSelection = null;
            }
        }
    };

    TextareaInput.prototype.getField = function () {
        return this.textarea;
    };

    TextareaInput.prototype.supportsTouch = function () {
        return false;
    };

    TextareaInput.prototype.focus = function () {
        if (this.cm.options.readOnly != "nocursor" && (!mobile || activeElt() != this.textarea)) {
            try {
                this.textarea.focus();
            } catch (e) {} // IE8 will throw if the textarea is display: none or not in DOM
        }
    };

    TextareaInput.prototype.blur = function () {
        this.textarea.blur();
    };

    TextareaInput.prototype.resetPosition = function () {
        this.wrapper.style.top = this.wrapper.style.left = 0;
    };

    TextareaInput.prototype.receivedFocus = function () {
        this.slowPoll();
    };

    // Poll for input changes, using the normal rate of polling. This
    // runs as long as the editor is focused.
    TextareaInput.prototype.slowPoll = function () {
        var this$1 = this;

        if (this.pollingFast) {
            return;
        }
        this.polling.set(this.cm.options.pollInterval, function () {
            this$1.poll();
            if (this$1.cm.state.focused) {
                this$1.slowPoll();
            }
        });
    };

    // When an event has just come in that is likely to add or change
    // something in the input textarea, we poll faster, to ensure that
    // the change appears on the screen quickly.
    TextareaInput.prototype.fastPoll = function () {
        var missed = false,
            input = this;
        input.pollingFast = true;
        function p() {
            var changed = input.poll();
            if (!changed && !missed) {
                missed = true;input.polling.set(60, p);
            } else {
                input.pollingFast = false;input.slowPoll();
            }
        }
        input.polling.set(20, p);
    };

    // Read input from the textarea, and update the document to match.
    // When something is selected, it is present in the textarea, and
    // selected (unless it is huge, in which case a placeholder is
    // used). When nothing is selected, the cursor sits after previously
    // seen text (can be empty), which is stored in prevInput (we must
    // not reset the textarea when typing, because that breaks IME).
    TextareaInput.prototype.poll = function () {
        var this$1 = this;

        var cm = this.cm,
            input = this.textarea,
            prevInput = this.prevInput;
        // Since this is called a *lot*, try to bail out as cheaply as
        // possible when it is clear that nothing happened. hasSelection
        // will be the case when there is a lot of text in the textarea,
        // in which case reading its value would be expensive.
        if (this.contextMenuPending || !cm.state.focused || hasSelection(input) && !prevInput && !this.composing || cm.isReadOnly() || cm.options.disableInput || cm.state.keySeq) {
            return false;
        }

        var text = input.value;
        // If nothing changed, bail.
        if (text == prevInput && !cm.somethingSelected()) {
            return false;
        }
        // Work around nonsensical selection resetting in IE9/10, and
        // inexplicable appearance of private area unicode characters on
        // some key combos in Mac (#2689).
        if (ie && ie_version >= 9 && this.hasSelection === text || mac && /[\uf700-\uf7ff]/.test(text)) {
            cm.display.input.reset();
            return false;
        }

        if (cm.doc.sel == cm.display.selForContextMenu) {
            var first = text.charCodeAt(0);
            if (first == 0x200b && !prevInput) {
                prevInput = "\u200B";
            }
            if (first == 0x21da) {
                this.reset();return this.cm.execCommand("undo");
            }
        }
        // Find the part of the input that is actually new
        var same = 0,
            l = Math.min(prevInput.length, text.length);
        while (same < l && prevInput.charCodeAt(same) == text.charCodeAt(same)) {
            ++same;
        }

        runInOp(cm, function () {
            applyTextInput(cm, text.slice(same), prevInput.length - same, null, this$1.composing ? "*compose" : null);

            // Don't leave long text in the textarea, since it makes further polling slow
            if (text.length > 1000 || text.indexOf("\n") > -1) {
                input.value = this$1.prevInput = "";
            } else {
                this$1.prevInput = text;
            }

            if (this$1.composing) {
                this$1.composing.range.clear();
                this$1.composing.range = cm.markText(this$1.composing.start, cm.getCursor("to"), { className: "CodeMirror-composing" });
            }
        });
        return true;
    };

    TextareaInput.prototype.ensurePolled = function () {
        if (this.pollingFast && this.poll()) {
            this.pollingFast = false;
        }
    };

    TextareaInput.prototype.onKeyPress = function () {
        if (ie && ie_version >= 9) {
            this.hasSelection = null;
        }
        this.fastPoll();
    };

    TextareaInput.prototype.onContextMenu = function (e) {
        var input = this,
            cm = input.cm,
            display = cm.display,
            te = input.textarea;
        if (input.contextMenuPending) {
            input.contextMenuPending();
        }
        var pos = posFromMouse(cm, e),
            scrollPos = display.scroller.scrollTop;
        if (!pos || presto) {
            return;
        } // Opera is difficult.

        // Reset the current text selection only if the click is done outside of the selection
        // and 'resetSelectionOnContextMenu' option is true.
        var reset = cm.options.resetSelectionOnContextMenu;
        if (reset && cm.doc.sel.contains(pos) == -1) {
            operation(cm, setSelection)(cm.doc, simpleSelection(pos), sel_dontScroll);
        }

        var oldCSS = te.style.cssText,
            oldWrapperCSS = input.wrapper.style.cssText;
        var wrapperBox = input.wrapper.offsetParent.getBoundingClientRect();
        input.wrapper.style.cssText = "position: static";
        te.style.cssText = "position: absolute; width: 30px; height: 30px;\n      top: " + (e.clientY - wrapperBox.top - 5) + "px; left: " + (e.clientX - wrapperBox.left - 5) + "px;\n      z-index: 1000; background: " + (ie ? "rgba(255, 255, 255, .05)" : "transparent") + ";\n      outline: none; border-width: 0; outline: none; overflow: hidden; opacity: .05; filter: alpha(opacity=5);";
        var oldScrollY;
        if (webkit) {
            oldScrollY = window.scrollY;
        } // Work around Chrome issue (#2712)
        display.input.focus();
        if (webkit) {
            window.scrollTo(null, oldScrollY);
        }
        display.input.reset();
        // Adds "Select all" to context menu in FF
        if (!cm.somethingSelected()) {
            te.value = input.prevInput = " ";
        }
        input.contextMenuPending = rehide;
        display.selForContextMenu = cm.doc.sel;
        clearTimeout(display.detectingSelectAll);

        // Select-all will be greyed out if there's nothing to select, so
        // this adds a zero-width space so that we can later check whether
        // it got selected.
        function prepareSelectAllHack() {
            if (te.selectionStart != null) {
                var selected = cm.somethingSelected();
                var extval = "\u200B" + (selected ? te.value : "");
                te.value = "\u21DA"; // Used to catch context-menu undo
                te.value = extval;
                input.prevInput = selected ? "" : "\u200B";
                te.selectionStart = 1;te.selectionEnd = extval.length;
                // Re-set this, in case some other handler touched the
                // selection in the meantime.
                display.selForContextMenu = cm.doc.sel;
            }
        }
        function rehide() {
            if (input.contextMenuPending != rehide) {
                return;
            }
            input.contextMenuPending = false;
            input.wrapper.style.cssText = oldWrapperCSS;
            te.style.cssText = oldCSS;
            if (ie && ie_version < 9) {
                display.scrollbars.setScrollTop(display.scroller.scrollTop = scrollPos);
            }

            // Try to detect the user choosing select-all
            if (te.selectionStart != null) {
                if (!ie || ie && ie_version < 9) {
                    prepareSelectAllHack();
                }
                var i = 0,
                    poll = function poll() {
                    if (display.selForContextMenu == cm.doc.sel && te.selectionStart == 0 && te.selectionEnd > 0 && input.prevInput == "\u200B") {
                        operation(cm, selectAll)(cm);
                    } else if (i++ < 10) {
                        display.detectingSelectAll = setTimeout(poll, 500);
                    } else {
                        display.selForContextMenu = null;
                        display.input.reset();
                    }
                };
                display.detectingSelectAll = setTimeout(poll, 200);
            }
        }

        if (ie && ie_version >= 9) {
            prepareSelectAllHack();
        }
        if (captureRightClick) {
            e_stop(e);
            var mouseup = function mouseup() {
                off(window, "mouseup", mouseup);
                setTimeout(rehide, 20);
            };
            on(window, "mouseup", mouseup);
        } else {
            setTimeout(rehide, 50);
        }
    };

    TextareaInput.prototype.readOnlyChanged = function (val) {
        if (!val) {
            this.reset();
        }
        this.textarea.disabled = val == "nocursor";
    };

    TextareaInput.prototype.setUneditable = function () {};

    TextareaInput.prototype.needsContentAttribute = false;

    function fromTextArea(textarea, options) {
        options = options ? copyObj(options) : {};
        options.value = textarea.value;
        if (!options.tabindex && textarea.tabIndex) {
            options.tabindex = textarea.tabIndex;
        }
        if (!options.placeholder && textarea.placeholder) {
            options.placeholder = textarea.placeholder;
        }
        // Set autofocus to true if this textarea is focused, or if it has
        // autofocus and no other element is focused.
        if (options.autofocus == null) {
            var hasFocus = activeElt();
            options.autofocus = hasFocus == textarea || textarea.getAttribute("autofocus") != null && hasFocus == document.body;
        }

        function save() {
            textarea.value = cm.getValue();
        }

        var realSubmit;
        if (textarea.form) {
            on(textarea.form, "submit", save);
            // Deplorable hack to make the submit method do the right thing.
            if (!options.leaveSubmitMethodAlone) {
                var form = textarea.form;
                realSubmit = form.submit;
                try {
                    var wrappedSubmit = form.submit = function () {
                        save();
                        form.submit = realSubmit;
                        form.submit();
                        form.submit = wrappedSubmit;
                    };
                } catch (e) {}
            }
        }

        options.finishInit = function (cm) {
            cm.save = save;
            cm.getTextArea = function () {
                return textarea;
            };
            cm.toTextArea = function () {
                cm.toTextArea = isNaN; // Prevent this from being ran twice
                save();
                textarea.parentNode.removeChild(cm.getWrapperElement());
                textarea.style.display = "";
                if (textarea.form) {
                    off(textarea.form, "submit", save);
                    if (!options.leaveSubmitMethodAlone && typeof textarea.form.submit == "function") {
                        textarea.form.submit = realSubmit;
                    }
                }
            };
        };

        textarea.style.display = "none";
        var cm = CodeMirror(function (node) {
            return textarea.parentNode.insertBefore(node, textarea.nextSibling);
        }, options);
        return cm;
    }

    function addLegacyProps(CodeMirror) {
        CodeMirror.off = off;
        CodeMirror.on = on;
        CodeMirror.wheelEventPixels = wheelEventPixels;
        CodeMirror.Doc = Doc;
        CodeMirror.splitLines = splitLinesAuto;
        CodeMirror.countColumn = countColumn;
        CodeMirror.findColumn = findColumn;
        CodeMirror.isWordChar = isWordCharBasic;
        CodeMirror.Pass = Pass;
        CodeMirror.signal = signal;
        CodeMirror.Line = Line;
        CodeMirror.changeEnd = changeEnd;
        CodeMirror.scrollbarModel = scrollbarModel;
        CodeMirror.Pos = Pos;
        CodeMirror.cmpPos = cmp;
        CodeMirror.modes = modes;
        CodeMirror.mimeModes = mimeModes;
        CodeMirror.resolveMode = resolveMode;
        CodeMirror.getMode = getMode;
        CodeMirror.modeExtensions = modeExtensions;
        CodeMirror.extendMode = extendMode;
        CodeMirror.copyState = copyState;
        CodeMirror.startState = startState;
        CodeMirror.innerMode = innerMode;
        CodeMirror.commands = commands;
        CodeMirror.keyMap = keyMap;
        CodeMirror.keyName = keyName;
        CodeMirror.isModifierKey = isModifierKey;
        CodeMirror.lookupKey = lookupKey;
        CodeMirror.normalizeKeyMap = normalizeKeyMap;
        CodeMirror.StringStream = StringStream;
        CodeMirror.SharedTextMarker = SharedTextMarker;
        CodeMirror.TextMarker = TextMarker;
        CodeMirror.LineWidget = LineWidget;
        CodeMirror.e_preventDefault = e_preventDefault;
        CodeMirror.e_stopPropagation = e_stopPropagation;
        CodeMirror.e_stop = e_stop;
        CodeMirror.addClass = addClass;
        CodeMirror.contains = contains;
        CodeMirror.rmClass = rmClass;
        CodeMirror.keyNames = keyNames;
    }

    // EDITOR CONSTRUCTOR

    defineOptions(CodeMirror);

    addEditorMethods(CodeMirror);

    // Set up methods on CodeMirror's prototype to redirect to the editor's document.
    var dontDelegate = "iter insert remove copy getEditor constructor".split(" ");
    for (var prop in Doc.prototype) {
        if (Doc.prototype.hasOwnProperty(prop) && indexOf(dontDelegate, prop) < 0) {
            CodeMirror.prototype[prop] = function (method) {
                return function () {
                    return method.apply(this.doc, arguments);
                };
            }(Doc.prototype[prop]);
        }
    }

    eventMixin(Doc);
    CodeMirror.inputStyles = { "textarea": TextareaInput, "contenteditable": ContentEditableInput };

    // Extra arguments are stored as the mode's dependencies, which is
    // used by (legacy) mechanisms like loadmode.js to automatically
    // load a mode. (Preferred mechanism is the require/define calls.)
    CodeMirror.defineMode = function (name /*, mode, …*/) {
        if (!CodeMirror.defaults.mode && name != "null") {
            CodeMirror.defaults.mode = name;
        }
        defineMode.apply(this, arguments);
    };

    CodeMirror.defineMIME = defineMIME;

    // Minimal default mode.
    CodeMirror.defineMode("null", function () {
        return { token: function token(stream) {
                return stream.skipToEnd();
            } };
    });
    CodeMirror.defineMIME("text/plain", "null");

    // EXTENSIONS

    CodeMirror.defineExtension = function (name, func) {
        CodeMirror.prototype[name] = func;
    };
    CodeMirror.defineDocExtension = function (name, func) {
        Doc.prototype[name] = func;
    };

    CodeMirror.fromTextArea = fromTextArea;

    addLegacyProps(CodeMirror);

    CodeMirror.version = "5.51.0";

    return CodeMirror;
}

var CodeMirror = codemirror();

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

function xml(CodeMirror) {
  "use strict";

  var htmlConfig = {
    autoSelfClosers: { 'area': true, 'base': true, 'br': true, 'col': true, 'command': true,
      'embed': true, 'frame': true, 'hr': true, 'img': true, 'input': true,
      'keygen': true, 'link': true, 'meta': true, 'param': true, 'source': true,
      'track': true, 'wbr': true, 'menuitem': true },
    implicitlyClosed: { 'dd': true, 'li': true, 'optgroup': true, 'option': true, 'p': true,
      'rp': true, 'rt': true, 'tbody': true, 'td': true, 'tfoot': true,
      'th': true, 'tr': true },
    contextGrabbers: {
      'dd': { 'dd': true, 'dt': true },
      'dt': { 'dd': true, 'dt': true },
      'li': { 'li': true },
      'option': { 'option': true, 'optgroup': true },
      'optgroup': { 'optgroup': true },
      'p': { 'address': true, 'article': true, 'aside': true, 'blockquote': true, 'dir': true,
        'div': true, 'dl': true, 'fieldset': true, 'footer': true, 'form': true,
        'h1': true, 'h2': true, 'h3': true, 'h4': true, 'h5': true, 'h6': true,
        'header': true, 'hgroup': true, 'hr': true, 'menu': true, 'nav': true, 'ol': true,
        'p': true, 'pre': true, 'section': true, 'table': true, 'ul': true },
      'rp': { 'rp': true, 'rt': true },
      'rt': { 'rp': true, 'rt': true },
      'tbody': { 'tbody': true, 'tfoot': true },
      'td': { 'td': true, 'th': true },
      'tfoot': { 'tbody': true },
      'th': { 'td': true, 'th': true },
      'thead': { 'tbody': true, 'tfoot': true },
      'tr': { 'tr': true }
    },
    doNotIndent: { "pre": true },
    allowUnquoted: true,
    allowMissing: true,
    caseFold: true
  };

  var xmlConfig = {
    autoSelfClosers: {},
    implicitlyClosed: {},
    contextGrabbers: {},
    doNotIndent: {},
    allowUnquoted: false,
    allowMissing: false,
    allowMissingTagName: false,
    caseFold: false
  };

  CodeMirror.defineMode("xml", function (editorConf, config_) {
    var indentUnit = editorConf.indentUnit;
    var config = {};
    var defaults = config_.htmlMode ? htmlConfig : xmlConfig;
    for (var prop in defaults) {
      config[prop] = defaults[prop];
    }for (var prop in config_) {
      config[prop] = config_[prop];
    } // Return variables for tokenizers
    var type, setStyle;

    function inText(stream, state) {
      function chain(parser) {
        state.tokenize = parser;
        return parser(stream, state);
      }

      var ch = stream.next();
      if (ch == "<") {
        if (stream.eat("!")) {
          if (stream.eat("[")) {
            if (stream.match("CDATA[")) return chain(inBlock("atom", "]]>"));else return null;
          } else if (stream.match("--")) {
            return chain(inBlock("comment", "-->"));
          } else if (stream.match("DOCTYPE", true, true)) {
            stream.eatWhile(/[\w\._\-]/);
            return chain(doctype(1));
          } else {
            return null;
          }
        } else if (stream.eat("?")) {
          stream.eatWhile(/[\w\._\-]/);
          state.tokenize = inBlock("meta", "?>");
          return "meta";
        } else {
          type = stream.eat("/") ? "closeTag" : "openTag";
          state.tokenize = inTag;
          return "tag bracket";
        }
      } else if (ch == "&") {
        var ok;
        if (stream.eat("#")) {
          if (stream.eat("x")) {
            ok = stream.eatWhile(/[a-fA-F\d]/) && stream.eat(";");
          } else {
            ok = stream.eatWhile(/[\d]/) && stream.eat(";");
          }
        } else {
          ok = stream.eatWhile(/[\w\.\-:]/) && stream.eat(";");
        }
        return ok ? "atom" : "error";
      } else {
        stream.eatWhile(/[^&<]/);
        return null;
      }
    }
    inText.isInText = true;

    function inTag(stream, state) {
      var ch = stream.next();
      if (ch == ">" || ch == "/" && stream.eat(">")) {
        state.tokenize = inText;
        type = ch == ">" ? "endTag" : "selfcloseTag";
        return "tag bracket";
      } else if (ch == "=") {
        type = "equals";
        return null;
      } else if (ch == "<") {
        state.tokenize = inText;
        state.state = baseState;
        state.tagName = state.tagStart = null;
        var next = state.tokenize(stream, state);
        return next ? next + " tag error" : "tag error";
      } else if (/[\'\"]/.test(ch)) {
        state.tokenize = inAttribute(ch);
        state.stringStartCol = stream.column();
        return state.tokenize(stream, state);
      } else {
        stream.match(/^[^\s\u00a0=<>\"\']*[^\s\u00a0=<>\"\'\/]/);
        return "word";
      }
    }

    function inAttribute(quote) {
      var closure = function closure(stream, state) {
        while (!stream.eol()) {
          if (stream.next() == quote) {
            state.tokenize = inTag;
            break;
          }
        }
        return "string";
      };
      closure.isInAttribute = true;
      return closure;
    }

    function inBlock(style, terminator) {
      return function (stream, state) {
        while (!stream.eol()) {
          if (stream.match(terminator)) {
            state.tokenize = inText;
            break;
          }
          stream.next();
        }
        return style;
      };
    }

    function doctype(depth) {
      return function (stream, state) {
        var ch;
        while ((ch = stream.next()) != null) {
          if (ch == "<") {
            state.tokenize = doctype(depth + 1);
            return state.tokenize(stream, state);
          } else if (ch == ">") {
            if (depth == 1) {
              state.tokenize = inText;
              break;
            } else {
              state.tokenize = doctype(depth - 1);
              return state.tokenize(stream, state);
            }
          }
        }
        return "meta";
      };
    }

    function Context(state, tagName, startOfLine) {
      this.prev = state.context;
      this.tagName = tagName;
      this.indent = state.indented;
      this.startOfLine = startOfLine;
      if (config.doNotIndent.hasOwnProperty(tagName) || state.context && state.context.noIndent) this.noIndent = true;
    }
    function popContext(state) {
      if (state.context) state.context = state.context.prev;
    }
    function maybePopContext(state, nextTagName) {
      var parentTagName;
      while (true) {
        if (!state.context) {
          return;
        }
        parentTagName = state.context.tagName;
        if (!config.contextGrabbers.hasOwnProperty(parentTagName) || !config.contextGrabbers[parentTagName].hasOwnProperty(nextTagName)) {
          return;
        }
        popContext(state);
      }
    }

    function baseState(type, stream, state) {
      if (type == "openTag") {
        state.tagStart = stream.column();
        return tagNameState;
      } else if (type == "closeTag") {
        return closeTagNameState;
      } else {
        return baseState;
      }
    }
    function tagNameState(type, stream, state) {
      if (type == "word") {
        state.tagName = stream.current();
        setStyle = "tag";
        return attrState;
      } else if (config.allowMissingTagName && type == "endTag") {
        setStyle = "tag bracket";
        return attrState(type, stream, state);
      } else {
        setStyle = "error";
        return tagNameState;
      }
    }
    function closeTagNameState(type, stream, state) {
      if (type == "word") {
        var tagName = stream.current();
        if (state.context && state.context.tagName != tagName && config.implicitlyClosed.hasOwnProperty(state.context.tagName)) popContext(state);
        if (state.context && state.context.tagName == tagName || config.matchClosing === false) {
          setStyle = "tag";
          return closeState;
        } else {
          setStyle = "tag error";
          return closeStateErr;
        }
      } else if (config.allowMissingTagName && type == "endTag") {
        setStyle = "tag bracket";
        return closeState(type, stream, state);
      } else {
        setStyle = "error";
        return closeStateErr;
      }
    }

    function closeState(type, _stream, state) {
      if (type != "endTag") {
        setStyle = "error";
        return closeState;
      }
      popContext(state);
      return baseState;
    }
    function closeStateErr(type, stream, state) {
      setStyle = "error";
      return closeState(type, stream, state);
    }

    function attrState(type, _stream, state) {
      if (type == "word") {
        setStyle = "attribute";
        return attrEqState;
      } else if (type == "endTag" || type == "selfcloseTag") {
        var tagName = state.tagName,
            tagStart = state.tagStart;
        state.tagName = state.tagStart = null;
        if (type == "selfcloseTag" || config.autoSelfClosers.hasOwnProperty(tagName)) {
          maybePopContext(state, tagName);
        } else {
          maybePopContext(state, tagName);
          state.context = new Context(state, tagName, tagStart == state.indented);
        }
        return baseState;
      }
      setStyle = "error";
      return attrState;
    }
    function attrEqState(type, stream, state) {
      if (type == "equals") return attrValueState;
      if (!config.allowMissing) setStyle = "error";
      return attrState(type, stream, state);
    }
    function attrValueState(type, stream, state) {
      if (type == "string") return attrContinuedState;
      if (type == "word" && config.allowUnquoted) {
        setStyle = "string";return attrState;
      }
      setStyle = "error";
      return attrState(type, stream, state);
    }
    function attrContinuedState(type, stream, state) {
      if (type == "string") return attrContinuedState;
      return attrState(type, stream, state);
    }

    return {
      startState: function startState(baseIndent) {
        var state = { tokenize: inText,
          state: baseState,
          indented: baseIndent || 0,
          tagName: null, tagStart: null,
          context: null };
        if (baseIndent != null) state.baseIndent = baseIndent;
        return state;
      },

      token: function token(stream, state) {
        if (!state.tagName && stream.sol()) state.indented = stream.indentation();

        if (stream.eatSpace()) return null;
        type = null;
        var style = state.tokenize(stream, state);
        if ((style || type) && style != "comment") {
          setStyle = null;
          state.state = state.state(type || style, stream, state);
          if (setStyle) style = setStyle == "error" ? style + " error" : setStyle;
        }
        return style;
      },

      indent: function indent(state, textAfter, fullLine) {
        var context = state.context;
        // Indent multi-line strings (e.g. css).
        if (state.tokenize.isInAttribute) {
          if (state.tagStart == state.indented) return state.stringStartCol + 1;else return state.indented + indentUnit;
        }
        if (context && context.noIndent) return CodeMirror.Pass;
        if (state.tokenize != inTag && state.tokenize != inText) return fullLine ? fullLine.match(/^(\s*)/)[0].length : 0;
        // Indent the starts of attribute names.
        if (state.tagName) {
          if (config.multilineTagIndentPastTag !== false) return state.tagStart + state.tagName.length + 2;else return state.tagStart + indentUnit * (config.multilineTagIndentFactor || 1);
        }
        if (config.alignCDATA && /<!\[CDATA\[/.test(textAfter)) return 0;
        var tagAfter = textAfter && /^<(\/)?([\w_:\.-]*)/.exec(textAfter);
        if (tagAfter && tagAfter[1]) {
          // Closing tag spotted
          while (context) {
            if (context.tagName == tagAfter[2]) {
              context = context.prev;
              break;
            } else if (config.implicitlyClosed.hasOwnProperty(context.tagName)) {
              context = context.prev;
            } else {
              break;
            }
          }
        } else if (tagAfter) {
          // Opening tag spotted
          while (context) {
            var grabbers = config.contextGrabbers[context.tagName];
            if (grabbers && grabbers.hasOwnProperty(tagAfter[2])) context = context.prev;else break;
          }
        }
        while (context && context.prev && !context.startOfLine) {
          context = context.prev;
        }if (context) return context.indent + indentUnit;else return state.baseIndent || 0;
      },

      electricInput: /<\/[\s\w:]+>$/,
      blockCommentStart: "<!--",
      blockCommentEnd: "-->",

      configuration: config.htmlMode ? "html" : "xml",
      helperType: config.htmlMode ? "html" : "xml",

      skipAttribute: function skipAttribute(state) {
        if (state.state == attrValueState) state.state = attrState;
      },

      xmlCurrentTag: function xmlCurrentTag(state) {
        return state.tagName ? { name: state.tagName, close: state.type == "closeTag" } : null;
      },

      xmlCurrentContext: function xmlCurrentContext(state) {
        var context = [];
        for (var cx = state.context; cx; cx = cx.prev) {
          if (cx.tagName) context.push(cx.tagName);
        }return context.reverse();
      }
    };
  });

  CodeMirror.defineMIME("text/xml", "xml");
  CodeMirror.defineMIME("application/xml", "xml");
  if (!CodeMirror.mimeModes.hasOwnProperty("text/html")) CodeMirror.defineMIME("text/html", { name: "xml", htmlMode: true });
}

/*
    编辑器构造函数
*/

// 引入codemirror
xml(CodeMirror);

// id，累加
var editorId = 1;

// 构造函数
function Editor(toolbarSelector, textSelector) {
    if (toolbarSelector == null) {
        // 没有传入任何参数，报错
        throw new Error('错误：初始化编辑器时候未传入任何参数，请查阅文档');
    }
    // id，用以区分单个页面不同的编辑器对象
    this.id = 'wangEditor-' + editorId++;

    this.toolbarSelector = toolbarSelector;
    this.textSelector = textSelector;

    // 自定义配置
    this.customConfig = {};
}

// 修改原型
Editor.prototype = {
    constructor: Editor,

    // 初始化配置
    _initConfig: function _initConfig() {
        // _config 是默认配置，this.customConfig 是用户自定义配置，将它们 merge 之后再赋值
        var target = {};
        this.config = Object.assign(target, config, this.customConfig);

        // 将语言配置，生成正则表达式
        var langConfig = this.config.lang || {};
        var langArgs = [];
        objForEach(langConfig, function (key, val) {
            // key 即需要生成正则表达式的规则，如“插入链接”
            // val 即需要被替换成的语言，如“insert link”
            langArgs.push({
                reg: new RegExp(key, 'img'),
                val: val

            });
        });
        this.config.langArgs = langArgs;
    },

    // 初始化 DOM
    _initDom: function _initDom() {
        var _this = this;

        var toolbarSelector = this.toolbarSelector;
        var $toolbarSelector = $(toolbarSelector);
        var textSelector = this.textSelector;

        var config$$1 = this.config;
        var zIndex = config$$1.zIndex;
        var that = this;

        // 定义变量
        var $toolbarElem = void 0,
            $textContainerElem = void 0,
            $textElem = void 0,
            $soundCodeElem = void 0,
            $children = void 0;

        if (textSelector == null) {
            // 只传入一个参数，即是容器的选择器或元素，toolbar 和 text 的元素自行创建
            $toolbarElem = $('<div></div>');
            $textContainerElem = $('<div></div>');

            // 将编辑器区域原有的内容，暂存起来
            $children = $toolbarSelector.children();

            // 添加到 DOM 结构中
            $toolbarSelector.append($toolbarElem).append($textContainerElem);

            // 自行创建的，需要配置默认的样式
            $toolbarElem.css('background-color', '#f1f1f1').css('border', '1px solid #ccc');
            $textContainerElem.css('border', '1px solid #ccc').css('border-top', 'none').css('height', '300px');
        } else {
            // toolbar 和 text 的选择器都有值，记录属性
            $toolbarElem = $toolbarSelector;
            $textContainerElem = $(textSelector);
            // 将编辑器区域原有的内容，暂存起来
            $children = $textContainerElem.children();
        }

        // 编辑区域
        $textElem = $('<div></div>');
        $textElem.attr('contenteditable', 'true').css('width', '100%').css('height', '100%');
        // 源码编辑区域
        $soundCodeElem = $('<textarea id="codeMirrorBox"></textarea>');
        $soundCodeElem.css('display', 'none').css('width', '100%').css('height', '100%').css('outline', 'none');

        // 监听源码编辑区域事件
        $soundCodeElem[0].addEventListener('blur', function () {
            // 源码编辑器失焦时触发
            var editorValue = $soundCodeElem[0].value; // 获取源码容器内源码value(string)
            that.txt.html(editorValue);
        }, true);

        // 初始化编辑区域内容
        if ($children && $children.length) {
            $textElem.append($children);
        } else {
            $textElem.append($('<p class="p"><br></p>'));
        }

        // 编辑区域加入DOM
        $textContainerElem.append($textElem);
        $textContainerElem.append($soundCodeElem);

        // 设置通用的 class
        $toolbarElem.addClass('w-e-toolbar');
        $textContainerElem.addClass('w-e-text-container');
        $textContainerElem.css('z-index', zIndex);
        $textElem.addClass('w-e-text');
        $soundCodeElem.addClass('w-e-soundCode');

        // 添加 ID
        var toolbarElemId = getRandom('toolbar-elem');
        $toolbarElem.attr('id', toolbarElemId);
        var textElemId = getRandom('text-elem');
        $textElem.attr('id', textElemId);

        // 记录属性
        this.$toolbarElem = $toolbarElem;
        this.$textContainerElem = $textContainerElem;
        this.$textElem = $textElem;
        this.$soundCodeElem = $soundCodeElem;
        this.toolbarElemId = toolbarElemId;
        this.textElemId = textElemId;
        this.codeMirror = CodeMirror.fromTextArea(document.getElementById('codeMirrorBox'), {
            indentUnit: 0, // 缩进
            mode: 'xml',
            htmlMode: true,
            lineNumbers: true,
            lineWrapping: true
        });

        // 设置源码编辑区域隐藏
        var $codeMirrorContent = document.querySelector('.CodeMirror');
        $codeMirrorContent.setAttribute('style', 'visibility: hidden');

        // 记录输入法的开始和结束
        var compositionEnd = true;
        $textContainerElem.on('compositionstart', function () {
            // 输入法开始输入
            compositionEnd = false;
        });
        $textContainerElem.on('compositionend', function () {
            // 输入法结束输入
            compositionEnd = true;
        });

        // 绑定 onchange
        $textContainerElem.on('click keyup', function () {
            // 输入法结束才出发 onchange
            compositionEnd && _this.change && _this.change();
        });
        $toolbarElem.on('click', function () {
            this.change && this.change();
        });

        //绑定 onfocus 与 onblur 事件
        if (config$$1.onfocus || config$$1.onblur) {
            // 当前编辑器是否是焦点状态
            this.isFocus = false;

            $(document).on('click', function (e) {
                //判断当前点击元素是否在编辑器内
                var isChild = $textElem.isContain($(e.target));

                //判断当前点击元素是否为工具栏
                var isToolbar = $toolbarElem.isContain($(e.target));
                var isMenu = $toolbarElem[0] == e.target ? true : false;

                if (!isChild) {
                    //若为选择工具栏中的功能，则不视为成blur操作
                    if (isToolbar && !isMenu) {
                        return;
                    }

                    if (_this.isFocus) {
                        _this.onblur && _this.onblur();
                    }
                    _this.isFocus = false;
                } else {
                    if (!_this.isFocus) {
                        _this.onfocus && _this.onfocus();
                    }
                    _this.isFocus = true;
                }
            });
        }
    },

    // 封装 command
    _initCommand: function _initCommand() {
        this.cmd = new Command(this);
    },

    // 封装 selection range API
    _initSelectionAPI: function _initSelectionAPI() {
        this.selection = new API(this);
    },

    // 添加图片上传
    _initUploadImg: function _initUploadImg() {
        this.uploadImg = new UploadImg(this);
    },

    // 初始化菜单
    _initMenus: function _initMenus() {
        this.menus = new Menus(this);
        this.menus.init();
    },

    // 添加 text 区域
    _initText: function _initText() {
        this.txt = new Text(this);
        this.txt.init();
    },

    // 初始化选区，将光标定位到内容尾部
    initSelection: function initSelection(newLine) {
        var $textElem = this.$textElem;
        var $children = $textElem.children();
        if (!$children.length) {
            // 如果编辑器区域无内容，添加一个空行，重新设置选区
            $textElem.append($('<p class="p"><br></p>'));
            this.initSelection();
            return;
        }

        var $last = $children.last();

        if (newLine) {
            // 新增一个空行
            var html = $last.html().toLowerCase();
            var nodeName = $last.getNodeName();
            if (html !== '<br>' && html !== '<br\/>' || nodeName !== 'P') {
                // 最后一个元素不是 <p><br></p>，添加一个空行，重新设置选区
                $textElem.append($('<p class="p"><br></p>'));
                this.initSelection();
                return;
            }
        }

        this.selection.createRangeByElem($last, false, true);
        this.selection.restoreSelection();
    },

    // 绑定事件
    _bindEvent: function _bindEvent() {
        // -------- 绑定 onchange 事件 --------
        var onChangeTimeoutId = 0;
        var beforeChangeHtml = this.txt.html();
        var config$$1 = this.config;

        // onchange 触发延迟时间
        var onchangeTimeout = config$$1.onchangeTimeout;
        onchangeTimeout = parseInt(onchangeTimeout, 10);
        if (!onchangeTimeout || onchangeTimeout <= 0) {
            onchangeTimeout = 200;
        }

        var onchange = config$$1.onchange;
        if (onchange && typeof onchange === 'function') {
            // 触发 change 的有三个场景：
            // 1. $textContainerElem.on('click keyup')
            // 2. $toolbarElem.on('click')
            // 3. editor.cmd.do()
            this.change = function () {
                // 判断是否有变化
                var currentHtml = this.txt.html();

                if (currentHtml.length === beforeChangeHtml.length) {
                    // 需要比较每一个字符
                    if (currentHtml === beforeChangeHtml) {
                        return;
                    }
                }

                // 执行，使用节流
                if (onChangeTimeoutId) {
                    clearTimeout(onChangeTimeoutId);
                }
                onChangeTimeoutId = setTimeout(function () {
                    // 触发配置的 onchange 函数
                    onchange(currentHtml);
                    beforeChangeHtml = currentHtml;
                }, onchangeTimeout);
            };
        }

        // -------- 绑定 onblur 事件 --------
        var onblur = config$$1.onblur;
        if (onblur && typeof onblur === 'function') {
            this.onblur = function () {
                var currentHtml = this.txt.html();
                onblur(currentHtml);
            };
        }

        // -------- 绑定 onfocus 事件 --------
        var onfocus = config$$1.onfocus;
        if (onfocus && typeof onfocus === 'function') {
            this.onfocus = function () {
                onfocus();
            };
        }
    },

    // 创建编辑器
    create: function create() {
        // 初始化配置信息
        this._initConfig();

        // 初始化 DOM
        this._initDom();

        // 封装 command API
        this._initCommand();

        // 封装 selection range API
        this._initSelectionAPI();

        // 添加 text
        this._initText();

        // 初始化菜单
        this._initMenus();

        // 添加 图片上传
        this._initUploadImg();

        // 初始化选区，将光标定位到内容尾部
        this.initSelection(true);

        // 绑定事件
        this._bindEvent();
    },

    // 解绑所有事件（暂时不对外开放）
    _offAllEvent: function _offAllEvent() {
        $.offAll();
    }
};

// 检验是否浏览器环境
try {
    document;
} catch (ex) {
    throw new Error('请在浏览器环境下运行');
}

// polyfill
polyfill();

// 这里的 `inlinecss` 将被替换成 css 代码的内容，详情可去 ./gulpfile.js 中搜索 `inlinecss` 关键字
var inlinecss = '/* BASICS */.CodeMirror {  /* Set height, width, borders, and global font properties here */  font-family: monospace;  height: 300px;  color: black;  direction: ltr;}/* PADDING */.CodeMirror-lines {  padding: 4px 0;  /* Vertical padding around content */}.CodeMirror pre.CodeMirror-line,.CodeMirror pre.CodeMirror-line-like {  padding: 0 4px;  /* Horizontal padding of content */}.CodeMirror-scrollbar-filler,.CodeMirror-gutter-filler {  background-color: white;  /* The little square between H and V scrollbars */}/* GUTTER */.CodeMirror-gutters {  border-right: 1px solid #ddd;  background-color: #f7f7f7;  white-space: nowrap;}.CodeMirror-linenumber {  padding: 0 3px 0 5px;  min-width: 20px;  text-align: right;  color: #999;  white-space: nowrap;}.CodeMirror-guttermarker {  color: black;}.CodeMirror-guttermarker-subtle {  color: #999;}/* CURSOR */.CodeMirror-cursor {  border-left: 1px solid black;  border-right: none;  width: 0;}/* Shown when moving in bi-directional text */.CodeMirror div.CodeMirror-secondarycursor {  border-left: 1px solid silver;}.cm-fat-cursor .CodeMirror-cursor {  width: auto;  border: 0 !important;  background: #7e7;}.cm-fat-cursor div.CodeMirror-cursors {  z-index: 1;}.cm-fat-cursor-mark {  background-color: rgba(20, 255, 20, 0.5);  filter: progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#7f14ff14\', endColorstr=\'#7f14ff14\');  animation: blink 1.06s steps(1) infinite;}:root .cm-fat-cursor-mark {  filter: none\\9;}.cm-animate-fat-cursor {  width: auto;  border: 0;  animation: blink 1.06s steps(1) infinite;  background-color: #7e7;}@keyframes blink {  50% {    background-color: transparent;  }}/* Can style cursor different in overwrite (non-insert) mode */.cm-tab {  display: inline-block;  *display: inline;  *zoom: 1;  text-decoration: inherit;}.CodeMirror-rulers {  position: absolute;  left: 0;  right: 0;  top: -50px;  bottom: 0;  overflow: hidden;}.CodeMirror-ruler {  border-left: 1px solid #ccc;  top: 0;  bottom: 0;  position: absolute;}/* DEFAULT THEME */.cm-s-default .cm-header {  color: blue;}.cm-s-default .cm-quote {  color: #090;}.cm-negative {  color: #d44;}.cm-positive {  color: #292;}.cm-header,.cm-strong {  font-weight: bold;}.cm-em {  font-style: italic;}.cm-link {  text-decoration: underline;}.cm-strikethrough {  text-decoration: line-through;}.cm-s-default .cm-keyword {  color: #708;}.cm-s-default .cm-atom {  color: #219;}.cm-s-default .cm-number {  color: #164;}.cm-s-default .cm-def {  color: #00f;}.cm-s-default .cm-variable-2 {  color: #05a;}.cm-s-default .cm-variable-3,.cm-s-default .cm-type {  color: #085;}.cm-s-default .cm-comment {  color: #a50;}.cm-s-default .cm-string {  color: #a11;}.cm-s-default .cm-string-2 {  color: #f50;}.cm-s-default .cm-meta {  color: #555;}.cm-s-default .cm-qualifier {  color: #555;}.cm-s-default .cm-builtin {  color: #30a;}.cm-s-default .cm-bracket {  color: #997;}.cm-s-default .cm-tag {  color: #170;}.cm-s-default .cm-attribute {  color: #00c;}.cm-s-default .cm-hr {  color: #999;}.cm-s-default .cm-link {  color: #00c;}.cm-s-default .cm-error {  color: #f00;}.cm-invalidchar {  color: #f00;}.CodeMirror-composing {  border-bottom: 2px solid;}/* Default styles for common addons */div.CodeMirror span.CodeMirror-matchingbracket {  color: #0b0;}div.CodeMirror span.CodeMirror-nonmatchingbracket {  color: #a22;}.CodeMirror-matchingtag {  background: rgba(255, 150, 0, 0.3);  filter: progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#4cff9600\', endColorstr=\'#4cff9600\');}:root .CodeMirror-matchingtag {  filter: none\\9;}.CodeMirror-activeline-background {  background: #e8f2ff;}/* STOP *//* The rest of this file contains styles related to the mechanics of   the editor. You probably shouldn\'t touch them. */.CodeMirror {  position: relative;  overflow: hidden;  background: white;}.CodeMirror-scroll {  overflow: scroll !important;  /* Things will break if this is overridden */  /* 30px is the magic margin used to hide the element\'s real scrollbars */  /* See overflow: hidden in .CodeMirror */  margin-bottom: -30px;  margin-right: -30px;  padding-bottom: 30px;  height: 100%;  outline: none;  /* Prevent dragging from highlighting the element */  position: relative;}.CodeMirror-sizer {  position: relative;  border-right: 30px solid transparent;}/* The fake, visible scrollbars. Used to force redraw during scrolling   before actual scrolling happens, thus preventing shaking and   flickering artifacts. */.CodeMirror-vscrollbar,.CodeMirror-hscrollbar,.CodeMirror-scrollbar-filler,.CodeMirror-gutter-filler {  position: absolute;  z-index: 6;  display: none;}.CodeMirror-vscrollbar {  right: 0;  top: 0;  overflow-x: hidden;  overflow-y: scroll;}.CodeMirror-hscrollbar {  bottom: 0;  left: 0;  overflow-y: hidden;  overflow-x: scroll;}.CodeMirror-scrollbar-filler {  right: 0;  bottom: 0;}.CodeMirror-gutter-filler {  left: 0;  bottom: 0;}.CodeMirror-gutters {  position: absolute;  left: 0;  top: 0;  min-height: 100%;  z-index: 3;}.CodeMirror-gutter {  white-space: normal;  height: 100%;  display: inline-block;  *display: inline;  *zoom: 1;  vertical-align: top;  margin-bottom: -30px;}.CodeMirror-gutter-wrapper {  position: absolute;  z-index: 4;  background: none !important;  border: none !important;}.CodeMirror-gutter-background {  position: absolute;  top: 0;  bottom: 0;  z-index: 4;}.CodeMirror-gutter-elt {  position: absolute;  cursor: default;  z-index: 4;}.CodeMirror-gutter-wrapper ::-moz-selection {  background-color: transparent;}.CodeMirror-gutter-wrapper ::selection {  background-color: transparent;}.CodeMirror-gutter-wrapper ::-moz-selection {  background-color: transparent;}.CodeMirror-lines {  cursor: text;  min-height: 1px;  /* prevents collapsing before first draw */}.CodeMirror pre.CodeMirror-line,.CodeMirror pre.CodeMirror-line-like {  /* Reset some styles that the rest of the page might have set */  border-radius: 0;  border-width: 0;  background: transparent;  font-family: inherit;  font-size: inherit;  margin: 0;  white-space: pre;  word-wrap: normal;  line-height: inherit;  color: inherit;  z-index: 2;  position: relative;  overflow: visible;  -webkit-tap-highlight-color: transparent;  font-variant-ligatures: contextual;}.CodeMirror-wrap pre.CodeMirror-line,.CodeMirror-wrap pre.CodeMirror-line-like {  word-wrap: break-word;  white-space: pre-wrap;  word-break: normal;}.CodeMirror-linebackground {  position: absolute;  left: 0;  right: 0;  top: 0;  bottom: 0;  z-index: 0;}.CodeMirror-linewidget {  position: relative;  z-index: 2;  padding: 0.1px;  /* Force widget margins to stay inside of the container */}.CodeMirror-rtl pre {  direction: rtl;}.CodeMirror-code {  outline: none;}/* Force content-box sizing for the elements where we expect it */.CodeMirror-scroll,.CodeMirror-sizer,.CodeMirror-gutter,.CodeMirror-gutters,.CodeMirror-linenumber {  box-sizing: content-box;}.CodeMirror-measure {  position: absolute;  width: 100%;  height: 0;  overflow: hidden;  visibility: hidden;}.CodeMirror-cursor {  position: absolute;  pointer-events: none;}.CodeMirror-measure pre {  position: static;}div.CodeMirror-cursors {  visibility: hidden;  position: relative;  z-index: 3;}div.CodeMirror-dragcursors {  visibility: visible;}.CodeMirror-focused div.CodeMirror-cursors {  visibility: visible;}.CodeMirror-selected {  background: #d9d9d9;}.CodeMirror-focused .CodeMirror-selected {  background: #d7d4f0;}.CodeMirror-crosshair {  cursor: crosshair;}.CodeMirror-line::-moz-selection,.CodeMirror-line > span::-moz-selection,.CodeMirror-line > span > span::-moz-selection {  background: #d7d4f0;}.CodeMirror-line::selection,.CodeMirror-line > span::selection,.CodeMirror-line > span > span::selection {  background: #d7d4f0;}.CodeMirror-line::-moz-selection,.CodeMirror-line > span::-moz-selection,.CodeMirror-line > span > span::-moz-selection {  background: #d7d4f0;}.cm-searching {  background-color: #ffa;  background-color: rgba(255, 255, 0, 0.4);  filter: progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#66ffff00\', endColorstr=\'#66ffff00\');}:root .cm-searching {  filter: none\\9;}/* Used to force a border model for a node */.cm-force-border {  padding-right: .1px;}@media print {  /* Hide the cursor when printing */  .CodeMirror div.CodeMirror-cursors {    visibility: hidden;  }}/* See issue #2901 */.cm-tab-wrap-hack:after {  content: \'\';}/* Help users use markselection to safely style text background */span.CodeMirror-selectedtext {  background: none;}.w-e-toolbar,.w-e-text-container,.w-e-menu-panel {  padding: 0;  margin: 0;  box-sizing: border-box;}.w-e-toolbar *,.w-e-text-container *,.w-e-menu-panel * {  padding: 0;  margin: 0;  box-sizing: border-box;}.w-e-clear-fix:after {  content: "";  display: table;  clear: both;}.w-e-soundCode {  border: none;  padding: 0 10px;  font-size: 16px;}.w-e-toolbar .w-e-droplist {  position: absolute;  left: 0;  top: 0;  background-color: #fff;  border: 1px solid #f1f1f1;  border-right-color: #ccc;  border-bottom-color: #ccc;}.w-e-toolbar .w-e-droplist .w-e-dp-title {  text-align: center;  color: #999;  line-height: 2;  border-bottom: 1px solid #f1f1f1;  font-size: 13px;}.w-e-toolbar .w-e-droplist ul.w-e-list {  list-style: none;  line-height: 1;}.w-e-toolbar .w-e-droplist ul.w-e-list li.w-e-item {  color: #333;  padding: 5px 0;}.w-e-toolbar .w-e-droplist ul.w-e-list li.w-e-item:hover {  background-color: #f1f1f1;}.w-e-toolbar .w-e-droplist ul.w-e-block {  list-style: none;  text-align: left;  padding: 5px;}.w-e-toolbar .w-e-droplist ul.w-e-block li.w-e-item {  display: inline-block;  *display: inline;  *zoom: 1;  padding: 3px 5px;}.w-e-toolbar .w-e-droplist ul.w-e-block li.w-e-item:hover {  background-color: #f1f1f1;}@font-face {  font-family: "w-e-icon";  src: url(data:application/x-font-eot;charset=utf-8;base64,JBcAAHwWAAABAAIAAAAAAAIABQMAAAAAAAABAJABAAAAAExQAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAC6dkRQAAAAAAAAAAAAAAAAAAAAAAABAAdwAtAGUALQBpAGMAbwBuAAAADgBSAGUAZwB1AGwAYQByAAAAFgBWAGUAcgBzAGkAbwBuACAAMQAuADAAAAAQAHcALQBlAC0AaQBjAG8AbgAAAAAAAAEAAAALAIAAAwAwR1NVQrD+s+0AAAE4AAAAQk9TLzI8dk+CAAABfAAAAFZjbWFw75C93QAAAkQAAAOEZ2x5ZpVmQXwAAAYEAAAMuGhlYWQYNrIJAAAA4AAAADZoaGVhCDQERQAAALwAAAAkaG10eHCpAAAAAAHUAAAAcGxvY2EvpCwiAAAFyAAAADptYXhwATAAawAAARgAAAAgbmFtZaDNlQEAABK8AAACbXBvc3S3TjRPAAAVLAAAAU8AAQAAA4D/gABcBKgAAAAABFYAAQAAAAAAAAAAAAAAAAAAABwAAQAAAAEAAEVkpwtfDzz1AAsEAAAAAADaYLcGAAAAANpgtwYAAP++BFYDQgAAAAgAAgAAAAAAAAABAAAAHABfAAoAAAAAAAIAAAAKAAoAAAD/AAAAAAAAAAEAAAAKAB4ALAABREZMVAAIAAQAAAAAAAAAAQAAAAFsaWdhAAgAAAABAAAAAQAEAAQAAAABAAgAAQAGAAAAAQAAAAAAAQQGAZAABQAIAokCzAAAAI8CiQLMAAAB6wAyAQgAAAIABQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUGZFZABA5gDtigOA/4AAXAOAAIAAAAABAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAEAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAASoAAAEAAAABAAAAAQAAAAEAAAABAAAAAAAAAUAAAADAAAALAAAAAQAAAIwAAEAAAAAASoAAwABAAAALAADAAoAAAIwAAQA/gAAAC4AIAAEAA7mAeYP5iPmKOYy5lPmW+ah5qbm4uc250znV+eg56jnvOfu6Bvofuke63jtiv//AADmAOYO5iPmKOYy5lLmWuah5qbm4uc250znVueg56jnvOfu6Bvofuke63jtiv//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAuADAAMgAyADIAMgA0ADYANgA2ADYANgA2ADgAOAA4ADgAOAA4ADgAOAA4AAAAEAAJABoAGwAWABIACwAVAAUADQAKABgADAARABkACAAOAA8AAQACAAMABAAGAAcAFwATABQAAAEGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAVQAAAAAAAAAGwAA5gAAAOYAAAAAEAAA5gEAAOYBAAAACQAA5g4AAOYOAAAAGgAA5g8AAOYPAAAAGwAA5iMAAOYjAAAAFgAA5igAAOYoAAAAEgAA5jIAAOYyAAAACwAA5lIAAOZSAAAAFQAA5lMAAOZTAAAABQAA5loAAOZaAAAADQAA5lsAAOZbAAAACgAA5qEAAOahAAAAGAAA5qYAAOamAAAADAAA5uIAAObiAAAAEQAA5zYAAOc2AAAAGQAA50wAAOdMAAAACAAA51YAAOdWAAAADgAA51cAAOdXAAAADwAA56AAAOegAAAAAQAA56gAAOeoAAAAAgAA57wAAOe8AAAAAwAA5+4AAOfuAAAABAAA6BsAAOgbAAAABgAA6H4AAOh+AAAABwAA6R4AAOkeAAAAFwAA63gAAOt4AAAAEwAA7YoAAO2KAAAAFAAAAAAAOACSANQBEgFGAYwBzAH6AkgCjALqAywDVgN8A6ID1AQABCAEWgSQBPIFEAWYBewGHAZEBlwAAAABAAAAAAMqAvMAIAAAAS4BJw4BFRQWMy4BJz4BNxYCBxUzEzM3IzceARcWNjcGAtAvTzGjnTU0BAkBAUg2Amh+5U6PIJslIT0cIjkRKQLnAQoBBJRjNywHHidtVAEi/fRWEgFzXbIHCgECLEwNAAAABQAAAAADcwLzAAsAFwAjACwANQAAJT4BNy4BJw4BBx4BEx4BFw4BBy4BJz4BEzI2Nw4BBy4BJx4BJzQ2MhYUBiImJTQ2MhYUBiImAgCe0QQE0Z6e0QQE0Z6AqgMDqoCAqgMDqoA/djMKgV1dgQozdnoaKBoaKBoBFhooGhooGg0E0Z6e0QQE0Z6e0QKcA6qAgKoDA6qAgKr+lyAeZIADA4FjHiCzHSgoOycnHh0oKDsnJwAABAAAAAADpgLyAAUAFgAfACYAAAEwMREhESUhIgYHER4BMyEyNjcRLgEjBw4BIiY0NjIWEyE1GwEzNwNx/R4C4v0eFh4BAR4WAuIWHgEBHhZpAS1DLS1DLTX9iLjTNbgCvP2IAng1Hhf9iBceHhcCeBceuCItLUMtLf4eagE8/vmeAAAABgAAAAADcwLzAAMABwALABEAHQApAAAlIRUhESEVIREhFSEnFSM1IzUTFTMVIzU3NSM1Mx0CIzUzNSM1MzUjNQGjAdD+MAHQ/jAB0P4wiy4uLl2LXFyLi1xcXFyYXAFyXAFyXIu6iy/+gyQvaislLmqs6C8uLi8uAAAAAAIAAAAAA2oC8wAKABsAAAEmIgcBHgEXATY0AS4BJw4BBzEOAQczFhc+ATcDTxxJHf77LkMRAQUb/pEBRTQ0RAIBQTgBNkNoigMC2Bsb/vsRQy4BBR1J/k40RQEBRTREbyAgAQOKZwAAAgAAAAADwwLEABQAKQAAAR4BFw4BBy4BLwE+ATcVIgYHBgc2IR4BFw4BBy4BLwE+ATcVIgYHBgc2AQRTcAICcFNUbwIBBN6oOWYoDw0PAgpUbwICb1RUbwIBBN+nOWYoDw0PAeMCb1RUbwICb1Qcp98EcSooDxIDAm9UVG8CAm9UHKffBHEqKA8SAwAKAAAAAAOmAvIAAwAHAAsADwATABcAGwAfACMAJwAAExEhEQE1Mx0CIzUTFSM1IxUjNRUzFSMlMxUjPQEzFQEzFSMhNTMVWgNM/fHS0tLSNdPT0wIP09PT/R7T0wIP0wLx/R4C4v4mnp41np4Bpp+fn5/Tnp6e0p+f/vmenp4AAAYAAAAAA8wC6AADAAcACwAPABMAFwAAExEhEQUVITURNSEVBTMVIykBNSE1IREhSAOE/iD+mAFo/pjw8AMM/iAB4P6YAWgC6P0wAtA8eHj+mLS0PLS0PAFoAAAABgAAAAADcwL1AAMABwALABcAIwAvAAABIRUhFSEVIRUhFSEBND4BMh4BFQ4BIiYHND4BMh4BFQ4BIiYHND4BMh4BFQ4BIiYBowHQ/jAB0P4wAdD+MP7qGCwyLBgCNE40AhgsMiwYAjRONAIYLDIsGAI0TjQCxFy6XLpcAloaKxoaKxonMzPvGisaGisaJzMz7xksGhorGiczMwAAAgAAAAAD1wL+ABMAJwAAASYiBwEGFB8BHgEzITI2NwE2NCcBDgEjISImLwEmND8BNjIfARYUBwKVBg8G/bMFBXMGEggBbwgRBgGDBQX+WQYSCP7kCBIGNgUF2AYPBtYFBQL4Bgb9tAYPBnIGBwcGAYMFDwb+qQYHBwY2BQ8G2AUF1wUPBgAAAAMAAAAAA3EC8gAXADAAPAAAAQcGIiY0PwE2NCYiDwEGFBYyPwE2NCYiASYiDwEGFBYyPwE2MhYUDwEGFBYyPwE2NAE3NjQmIg8BBhQWMgIZlCBZPyCSChIYCZMyYosxlAgRGQEeMYoykwgRGQiTIVk/IJMJERkJlDD+e1QJEhgJVAkSGAEBkyBAWSCTCRgSCZMyimIxkwkZEQG3MTGUCBkRCJQgQFofkwkYEgmTMor+sVQJGBIJVAkYEgAAAgAAAAADvALpABcAJwAAATkBNCcxAS4BDgIWFwkBBh4BMjcxATYFISIGHQEUFjMhMjY3NS4BAd4Q/s0KGxsTBgkLAQz+8Q8BHigQATMQAbP+eBMYGBMBiBIYAQEYAYAWDwEzCgYIFBwaCv70/vAQKB4OATMP6hkSERIYGBIREhkAAAAAAQAAAAADoQL4ABUAABMBFjY3NTYWFxY2NQIkBzUuAQcBBhRnARUPIQGM3mwHFiv+hU0BIQ/+6wgBrf7sDQ0UpQmGwQoHDAF3sBGjFA4N/usJFwAAAwAAAAADYQLyAAMACwATAAAlIxEzASE1ITUhNSEDESE1ITUhNQNgKSn+DgGf/ooBdv5hzgJt/bwCRA8C4v6uKdYq/pn+1yrWKQAAAAMAAAAAA2EC8gADAAsAEwAAEzMRIwEhFSEVIRUhBRUhFSEVIRGgKSkB8v5hAXb+igGf/mECRP28Am0C8f0eArkq1ik+KdYqASkAAAAHAAAAAAN3AvcAAwAHAAsADwATABcAGwAAJTMVIxEzFSMRMxUjASEVITchNSETIRUhNxUhNQIALy8vLy8v/rgCv/1BLwJh/Z9dAab+Wi8BSZaNAaaNAdWN/ufqL4wBd+q7jIwAAQAAAAAC/AL6ABsAAAEhETQ2MhYVERQGIiY1ESERFAYiJjURNDYyFhUBWAFQGCMYGCMY/rAYIxgYIxgBqgElEhgYEv1iEhgYEgEl/tsSGBgSAp4SGBgSAAIAAAAAAvsC8gADABEAACU1JRUDECMiNREzERQzMjURMwEGAfQX6d9OmJRODDIEMgF7/wD3AW/+lbawAXEAAAACAAAAAAPCAvgADwAgAAABIQ4BBxEeARchPgE3ES4BAwUGIiciJjURNDcyNhcFFhQC//4CU24CAm5TAf5TbgICbqT+8gUJAQQFCQUIAgEOBQL3Am5T/phTbgICblMBaFNu/n+0BAQHBQFoCwECArQEEAAAAAEAAP/3BAADCwAdAAAJASYHBh0BBAIHFRQWFzY3NiQ3FRQWMxY3AT4BNCYD+f4iCwYK/wD+AgkIEAEJARTBBQULBgHeAwQEAdIBMwUFBAq7Ff6YtgQFCAEBETLcFLwFCQUFAVYCCAYIAAAAAAYAAAAAA44DDgACABQAGAAbADQAOAAANxcjFyMiJj0BNDcBNzYfARYHAQYjJzMnHQEzJzcXATYvASYPAQEXATYyFhQHARcBNjIWFAcnFwcnmEtL4eEGCQQBnUI5OoMsLf4jBQaQbK4YGJ01AdEfHn8nJkD+bjYBkgULCQT+bjcBkgQMCQSM4SvhYksPCQbhBwQBnEEtLYM5Ov4jBR6ubEIYJDYB0Scmfx8fP/5uNgGSBQkMBf5uNgGSBAkMBbfhKuEAAAACAAD/vgRWA0IABwAPAAATMxEzETM1IRMVIREzESE1PpZLlv6JlQF4lgF1ATX+iQF3SwHClv0SAu6WAAADAAD//gPCAwIADwAyAF4AAAEyFh0BFAYjISImPQE0NjM3JicmNTQ2MzIXFhcWFxYVFA8BLwEmJyYjIgYVFBYXFhcWFwczFhUUBwYHBgcGBwYjIi8BJicmPQE0JyY/ATU3HwEWFx4CMzI+ATU0JyYDsgcJCQf8nAcJCQfjDgwYhoMZOiI3BQYHAwYqBxkbLD05REJrIzQdE3fPAxQMGBMkKCUoPjkpRh0HBAEBAQEzDwwDAxEtPCUgTC8pEQGACQcgBwkJByAHCSASFjEuW4AKBhITKD4eCQ4BAwFLHC06LCVDIAoXDgyAFBs3MxwYEhcYCQsMFAgGBAcHNhgPExMWASQcCgQcJRUaPSIqJQ4AAAQAAAAAA1YDAAAOABcAJgAvAAABIS4BJxE+ATMhHgEXDgElIT4BNy4BJyEBISImJxE+ATchHgEXDgElIT4BNy4BJyECVf6rExcBARcTAVVceAICeP56ASo4RwEBRzj+1gFV/oATFwEBFxMBgFx3AgJ3/k8BVThHAQFHOP6rAVUBFxMBVRQXAnhbXHhUAUc4N0cC/VUXFAFVExcBAnhcW3hTAkc3OEcBAAUAAAAAA4ADAAADAAoAEQAVABkAAAEhFSEHFSM1IzcXAzMHJzM1MxchFSEDIRUhAdUBq/5V1VWAqquAgKuqgFXVAav+VVUCAP4AAtVVK6qqq6v+VqurqtVVAYBWAAAAAAMAAAAAA6YC+wAGAA0AEQAAAScHFwcXNyUPARc3JzcbARcDA3CjNqKiNtn9jaM22TaiogzMSswBtaM2o6M22dmjNtk2o6P99gLjFf0dAAAAAQAA//oC3QMCAAsAAAE1IxUzAyMVMzUjEwLd1Dq+T9M6vgK7Rkb9hkZGAnoAAAAAAAASAN4AAQAAAAAAAAAVAAAAAQAAAAAAAQAIABUAAQAAAAAAAgAHAB0AAQAAAAAAAwAIACQAAQAAAAAABAAIACwAAQAAAAAABQALADQAAQAAAAAABgAIAD8AAQAAAAAACgArAEcAAQAAAAAACwATAHIAAwABBAkAAAAqAIUAAwABBAkAAQAQAK8AAwABBAkAAgAOAL8AAwABBAkAAwAQAM0AAwABBAkABAAQAN0AAwABBAkABQAWAO0AAwABBAkABgAQAQMAAwABBAkACgBWARMAAwABBAkACwAmAWkKQ3JlYXRlZCBieSBpY29uZm9udAp3LWUtaWNvblJlZ3VsYXJ3LWUtaWNvbnctZS1pY29uVmVyc2lvbiAxLjB3LWUtaWNvbkdlbmVyYXRlZCBieSBzdmcydHRmIGZyb20gRm9udGVsbG8gcHJvamVjdC5odHRwOi8vZm9udGVsbG8uY29tAAoAQwByAGUAYQB0AGUAZAAgAGIAeQAgAGkAYwBvAG4AZgBvAG4AdAAKAHcALQBlAC0AaQBjAG8AbgBSAGUAZwB1AGwAYQByAHcALQBlAC0AaQBjAG8AbgB3AC0AZQAtAGkAYwBvAG4AVgBlAHIAcwBpAG8AbgAgADEALgAwAHcALQBlAC0AaQBjAG8AbgBHAGUAbgBlAHIAYQB0AGUAZAAgAGIAeQAgAHMAdgBnADIAdAB0AGYAIABmAHIAbwBtACAARgBvAG4AdABlAGwAbABvACAAcAByAG8AagBlAGMAdAAuAGgAdAB0AHAAOgAvAC8AZgBvAG4AdABlAGwAbABvAC4AYwBvAG0AAAAAAgAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAQIBAwEEAQUBBgEHAQgBCQEKAQsBDAENAQ4BDwEQAREBEgETARQBFQEWARcBGAEZARoBGwEcAR0ABGZvbnQFaGFwcHkFaW1hZ2UMbGlzdG51bWJlcmVkC3BhaW50LWJydXNoCnF1b3Rlc2xlZnQGdGFibGUyBmlmcmFtZQVsaXN0MgZmb3JtYXQEbGluawh0ZXJtaW5hbAR1bmRvD3BhcmFncmFwaC1yaWdodA5wYXJhZ3JhcGgtbGVmdBBwYXJhZ3JhcGgtY2VudGVyBmhlYWRlcgl1bmRlcmxpbmUEUGxheQRyZWRvB3BlbmNpbDIKdGV4dC1oZWlnaA1zdHJpa2V0aHJvdWdoBGJvbGQLbGluZS1oZWlnaHQKc291bmQtY29kZQZpdGFsaWMAAAA=);  /* IE9 */  src: url(data:application/x-font-eot;charset=utf-8;base64,JBcAAHwWAAABAAIAAAAAAAIABQMAAAAAAAABAJABAAAAAExQAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAC6dkRQAAAAAAAAAAAAAAAAAAAAAAABAAdwAtAGUALQBpAGMAbwBuAAAADgBSAGUAZwB1AGwAYQByAAAAFgBWAGUAcgBzAGkAbwBuACAAMQAuADAAAAAQAHcALQBlAC0AaQBjAG8AbgAAAAAAAAEAAAALAIAAAwAwR1NVQrD+s+0AAAE4AAAAQk9TLzI8dk+CAAABfAAAAFZjbWFw75C93QAAAkQAAAOEZ2x5ZpVmQXwAAAYEAAAMuGhlYWQYNrIJAAAA4AAAADZoaGVhCDQERQAAALwAAAAkaG10eHCpAAAAAAHUAAAAcGxvY2EvpCwiAAAFyAAAADptYXhwATAAawAAARgAAAAgbmFtZaDNlQEAABK8AAACbXBvc3S3TjRPAAAVLAAAAU8AAQAAA4D/gABcBKgAAAAABFYAAQAAAAAAAAAAAAAAAAAAABwAAQAAAAEAAEVkpwtfDzz1AAsEAAAAAADaYLcGAAAAANpgtwYAAP++BFYDQgAAAAgAAgAAAAAAAAABAAAAHABfAAoAAAAAAAIAAAAKAAoAAAD/AAAAAAAAAAEAAAAKAB4ALAABREZMVAAIAAQAAAAAAAAAAQAAAAFsaWdhAAgAAAABAAAAAQAEAAQAAAABAAgAAQAGAAAAAQAAAAAAAQQGAZAABQAIAokCzAAAAI8CiQLMAAAB6wAyAQgAAAIABQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUGZFZABA5gDtigOA/4AAXAOAAIAAAAABAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAEAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAASoAAAEAAAABAAAAAQAAAAEAAAABAAAAAAAAAUAAAADAAAALAAAAAQAAAIwAAEAAAAAASoAAwABAAAALAADAAoAAAIwAAQA/gAAAC4AIAAEAA7mAeYP5iPmKOYy5lPmW+ah5qbm4uc250znV+eg56jnvOfu6Bvofuke63jtiv//AADmAOYO5iPmKOYy5lLmWuah5qbm4uc250znVueg56jnvOfu6Bvofuke63jtiv//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAuADAAMgAyADIAMgA0ADYANgA2ADYANgA2ADgAOAA4ADgAOAA4ADgAOAA4AAAAEAAJABoAGwAWABIACwAVAAUADQAKABgADAARABkACAAOAA8AAQACAAMABAAGAAcAFwATABQAAAEGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAVQAAAAAAAAAGwAA5gAAAOYAAAAAEAAA5gEAAOYBAAAACQAA5g4AAOYOAAAAGgAA5g8AAOYPAAAAGwAA5iMAAOYjAAAAFgAA5igAAOYoAAAAEgAA5jIAAOYyAAAACwAA5lIAAOZSAAAAFQAA5lMAAOZTAAAABQAA5loAAOZaAAAADQAA5lsAAOZbAAAACgAA5qEAAOahAAAAGAAA5qYAAOamAAAADAAA5uIAAObiAAAAEQAA5zYAAOc2AAAAGQAA50wAAOdMAAAACAAA51YAAOdWAAAADgAA51cAAOdXAAAADwAA56AAAOegAAAAAQAA56gAAOeoAAAAAgAA57wAAOe8AAAAAwAA5+4AAOfuAAAABAAA6BsAAOgbAAAABgAA6H4AAOh+AAAABwAA6R4AAOkeAAAAFwAA63gAAOt4AAAAEwAA7YoAAO2KAAAAFAAAAAAAOACSANQBEgFGAYwBzAH6AkgCjALqAywDVgN8A6ID1AQABCAEWgSQBPIFEAWYBewGHAZEBlwAAAABAAAAAAMqAvMAIAAAAS4BJw4BFRQWMy4BJz4BNxYCBxUzEzM3IzceARcWNjcGAtAvTzGjnTU0BAkBAUg2Amh+5U6PIJslIT0cIjkRKQLnAQoBBJRjNywHHidtVAEi/fRWEgFzXbIHCgECLEwNAAAABQAAAAADcwLzAAsAFwAjACwANQAAJT4BNy4BJw4BBx4BEx4BFw4BBy4BJz4BEzI2Nw4BBy4BJx4BJzQ2MhYUBiImJTQ2MhYUBiImAgCe0QQE0Z6e0QQE0Z6AqgMDqoCAqgMDqoA/djMKgV1dgQozdnoaKBoaKBoBFhooGhooGg0E0Z6e0QQE0Z6e0QKcA6qAgKoDA6qAgKr+lyAeZIADA4FjHiCzHSgoOycnHh0oKDsnJwAABAAAAAADpgLyAAUAFgAfACYAAAEwMREhESUhIgYHER4BMyEyNjcRLgEjBw4BIiY0NjIWEyE1GwEzNwNx/R4C4v0eFh4BAR4WAuIWHgEBHhZpAS1DLS1DLTX9iLjTNbgCvP2IAng1Hhf9iBceHhcCeBceuCItLUMtLf4eagE8/vmeAAAABgAAAAADcwLzAAMABwALABEAHQApAAAlIRUhESEVIREhFSEnFSM1IzUTFTMVIzU3NSM1Mx0CIzUzNSM1MzUjNQGjAdD+MAHQ/jAB0P4wiy4uLl2LXFyLi1xcXFyYXAFyXAFyXIu6iy/+gyQvaislLmqs6C8uLi8uAAAAAAIAAAAAA2oC8wAKABsAAAEmIgcBHgEXATY0AS4BJw4BBzEOAQczFhc+ATcDTxxJHf77LkMRAQUb/pEBRTQ0RAIBQTgBNkNoigMC2Bsb/vsRQy4BBR1J/k40RQEBRTREbyAgAQOKZwAAAgAAAAADwwLEABQAKQAAAR4BFw4BBy4BLwE+ATcVIgYHBgc2IR4BFw4BBy4BLwE+ATcVIgYHBgc2AQRTcAICcFNUbwIBBN6oOWYoDw0PAgpUbwICb1RUbwIBBN+nOWYoDw0PAeMCb1RUbwICb1Qcp98EcSooDxIDAm9UVG8CAm9UHKffBHEqKA8SAwAKAAAAAAOmAvIAAwAHAAsADwATABcAGwAfACMAJwAAExEhEQE1Mx0CIzUTFSM1IxUjNRUzFSMlMxUjPQEzFQEzFSMhNTMVWgNM/fHS0tLSNdPT0wIP09PT/R7T0wIP0wLx/R4C4v4mnp41np4Bpp+fn5/Tnp6e0p+f/vmenp4AAAYAAAAAA8wC6AADAAcACwAPABMAFwAAExEhEQUVITURNSEVBTMVIykBNSE1IREhSAOE/iD+mAFo/pjw8AMM/iAB4P6YAWgC6P0wAtA8eHj+mLS0PLS0PAFoAAAABgAAAAADcwL1AAMABwALABcAIwAvAAABIRUhFSEVIRUhFSEBND4BMh4BFQ4BIiYHND4BMh4BFQ4BIiYHND4BMh4BFQ4BIiYBowHQ/jAB0P4wAdD+MP7qGCwyLBgCNE40AhgsMiwYAjRONAIYLDIsGAI0TjQCxFy6XLpcAloaKxoaKxonMzPvGisaGisaJzMz7xksGhorGiczMwAAAgAAAAAD1wL+ABMAJwAAASYiBwEGFB8BHgEzITI2NwE2NCcBDgEjISImLwEmND8BNjIfARYUBwKVBg8G/bMFBXMGEggBbwgRBgGDBQX+WQYSCP7kCBIGNgUF2AYPBtYFBQL4Bgb9tAYPBnIGBwcGAYMFDwb+qQYHBwY2BQ8G2AUF1wUPBgAAAAMAAAAAA3EC8gAXADAAPAAAAQcGIiY0PwE2NCYiDwEGFBYyPwE2NCYiASYiDwEGFBYyPwE2MhYUDwEGFBYyPwE2NAE3NjQmIg8BBhQWMgIZlCBZPyCSChIYCZMyYosxlAgRGQEeMYoykwgRGQiTIVk/IJMJERkJlDD+e1QJEhgJVAkSGAEBkyBAWSCTCRgSCZMyimIxkwkZEQG3MTGUCBkRCJQgQFofkwkYEgmTMor+sVQJGBIJVAkYEgAAAgAAAAADvALpABcAJwAAATkBNCcxAS4BDgIWFwkBBh4BMjcxATYFISIGHQEUFjMhMjY3NS4BAd4Q/s0KGxsTBgkLAQz+8Q8BHigQATMQAbP+eBMYGBMBiBIYAQEYAYAWDwEzCgYIFBwaCv70/vAQKB4OATMP6hkSERIYGBIREhkAAAAAAQAAAAADoQL4ABUAABMBFjY3NTYWFxY2NQIkBzUuAQcBBhRnARUPIQGM3mwHFiv+hU0BIQ/+6wgBrf7sDQ0UpQmGwQoHDAF3sBGjFA4N/usJFwAAAwAAAAADYQLyAAMACwATAAAlIxEzASE1ITUhNSEDESE1ITUhNQNgKSn+DgGf/ooBdv5hzgJt/bwCRA8C4v6uKdYq/pn+1yrWKQAAAAMAAAAAA2EC8gADAAsAEwAAEzMRIwEhFSEVIRUhBRUhFSEVIRGgKSkB8v5hAXb+igGf/mECRP28Am0C8f0eArkq1ik+KdYqASkAAAAHAAAAAAN3AvcAAwAHAAsADwATABcAGwAAJTMVIxEzFSMRMxUjASEVITchNSETIRUhNxUhNQIALy8vLy8v/rgCv/1BLwJh/Z9dAab+Wi8BSZaNAaaNAdWN/ufqL4wBd+q7jIwAAQAAAAAC/AL6ABsAAAEhETQ2MhYVERQGIiY1ESERFAYiJjURNDYyFhUBWAFQGCMYGCMY/rAYIxgYIxgBqgElEhgYEv1iEhgYEgEl/tsSGBgSAp4SGBgSAAIAAAAAAvsC8gADABEAACU1JRUDECMiNREzERQzMjURMwEGAfQX6d9OmJRODDIEMgF7/wD3AW/+lbawAXEAAAACAAAAAAPCAvgADwAgAAABIQ4BBxEeARchPgE3ES4BAwUGIiciJjURNDcyNhcFFhQC//4CU24CAm5TAf5TbgICbqT+8gUJAQQFCQUIAgEOBQL3Am5T/phTbgICblMBaFNu/n+0BAQHBQFoCwECArQEEAAAAAEAAP/3BAADCwAdAAAJASYHBh0BBAIHFRQWFzY3NiQ3FRQWMxY3AT4BNCYD+f4iCwYK/wD+AgkIEAEJARTBBQULBgHeAwQEAdIBMwUFBAq7Ff6YtgQFCAEBETLcFLwFCQUFAVYCCAYIAAAAAAYAAAAAA44DDgACABQAGAAbADQAOAAANxcjFyMiJj0BNDcBNzYfARYHAQYjJzMnHQEzJzcXATYvASYPAQEXATYyFhQHARcBNjIWFAcnFwcnmEtL4eEGCQQBnUI5OoMsLf4jBQaQbK4YGJ01AdEfHn8nJkD+bjYBkgULCQT+bjcBkgQMCQSM4SvhYksPCQbhBwQBnEEtLYM5Ov4jBR6ubEIYJDYB0Scmfx8fP/5uNgGSBQkMBf5uNgGSBAkMBbfhKuEAAAACAAD/vgRWA0IABwAPAAATMxEzETM1IRMVIREzESE1PpZLlv6JlQF4lgF1ATX+iQF3SwHClv0SAu6WAAADAAD//gPCAwIADwAyAF4AAAEyFh0BFAYjISImPQE0NjM3JicmNTQ2MzIXFhcWFxYVFA8BLwEmJyYjIgYVFBYXFhcWFwczFhUUBwYHBgcGBwYjIi8BJicmPQE0JyY/ATU3HwEWFx4CMzI+ATU0JyYDsgcJCQf8nAcJCQfjDgwYhoMZOiI3BQYHAwYqBxkbLD05REJrIzQdE3fPAxQMGBMkKCUoPjkpRh0HBAEBAQEzDwwDAxEtPCUgTC8pEQGACQcgBwkJByAHCSASFjEuW4AKBhITKD4eCQ4BAwFLHC06LCVDIAoXDgyAFBs3MxwYEhcYCQsMFAgGBAcHNhgPExMWASQcCgQcJRUaPSIqJQ4AAAQAAAAAA1YDAAAOABcAJgAvAAABIS4BJxE+ATMhHgEXDgElIT4BNy4BJyEBISImJxE+ATchHgEXDgElIT4BNy4BJyECVf6rExcBARcTAVVceAICeP56ASo4RwEBRzj+1gFV/oATFwEBFxMBgFx3AgJ3/k8BVThHAQFHOP6rAVUBFxMBVRQXAnhbXHhUAUc4N0cC/VUXFAFVExcBAnhcW3hTAkc3OEcBAAUAAAAAA4ADAAADAAoAEQAVABkAAAEhFSEHFSM1IzcXAzMHJzM1MxchFSEDIRUhAdUBq/5V1VWAqquAgKuqgFXVAav+VVUCAP4AAtVVK6qqq6v+VqurqtVVAYBWAAAAAAMAAAAAA6YC+wAGAA0AEQAAAScHFwcXNyUPARc3JzcbARcDA3CjNqKiNtn9jaM22TaiogzMSswBtaM2o6M22dmjNtk2o6P99gLjFf0dAAAAAQAA//oC3QMCAAsAAAE1IxUzAyMVMzUjEwLd1Dq+T9M6vgK7Rkb9hkZGAnoAAAAAAAASAN4AAQAAAAAAAAAVAAAAAQAAAAAAAQAIABUAAQAAAAAAAgAHAB0AAQAAAAAAAwAIACQAAQAAAAAABAAIACwAAQAAAAAABQALADQAAQAAAAAABgAIAD8AAQAAAAAACgArAEcAAQAAAAAACwATAHIAAwABBAkAAAAqAIUAAwABBAkAAQAQAK8AAwABBAkAAgAOAL8AAwABBAkAAwAQAM0AAwABBAkABAAQAN0AAwABBAkABQAWAO0AAwABBAkABgAQAQMAAwABBAkACgBWARMAAwABBAkACwAmAWkKQ3JlYXRlZCBieSBpY29uZm9udAp3LWUtaWNvblJlZ3VsYXJ3LWUtaWNvbnctZS1pY29uVmVyc2lvbiAxLjB3LWUtaWNvbkdlbmVyYXRlZCBieSBzdmcydHRmIGZyb20gRm9udGVsbG8gcHJvamVjdC5odHRwOi8vZm9udGVsbG8uY29tAAoAQwByAGUAYQB0AGUAZAAgAGIAeQAgAGkAYwBvAG4AZgBvAG4AdAAKAHcALQBlAC0AaQBjAG8AbgBSAGUAZwB1AGwAYQByAHcALQBlAC0AaQBjAG8AbgB3AC0AZQAtAGkAYwBvAG4AVgBlAHIAcwBpAG8AbgAgADEALgAwAHcALQBlAC0AaQBjAG8AbgBHAGUAbgBlAHIAYQB0AGUAZAAgAGIAeQAgAHMAdgBnADIAdAB0AGYAIABmAHIAbwBtACAARgBvAG4AdABlAGwAbABvACAAcAByAG8AagBlAGMAdAAuAGgAdAB0AHAAOgAvAC8AZgBvAG4AdABlAGwAbABvAC4AYwBvAG0AAAAAAgAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAQIBAwEEAQUBBgEHAQgBCQEKAQsBDAENAQ4BDwEQAREBEgETARQBFQEWARcBGAEZARoBGwEcAR0ABGZvbnQFaGFwcHkFaW1hZ2UMbGlzdG51bWJlcmVkC3BhaW50LWJydXNoCnF1b3Rlc2xlZnQGdGFibGUyBmlmcmFtZQVsaXN0MgZmb3JtYXQEbGluawh0ZXJtaW5hbAR1bmRvD3BhcmFncmFwaC1yaWdodA5wYXJhZ3JhcGgtbGVmdBBwYXJhZ3JhcGgtY2VudGVyBmhlYWRlcgl1bmRlcmxpbmUEUGxheQRyZWRvB3BlbmNpbDIKdGV4dC1oZWlnaA1zdHJpa2V0aHJvdWdoBGJvbGQLbGluZS1oZWlnaHQKc291bmQtY29kZQZpdGFsaWMAAAA=) format(\'embedded-opentype\'), /* IE6-IE8 */ url(\'data:application/x-font-woff2;charset=utf-8;base64,d09GMgABAAAAAAvcAAsAAAAAFnwAAAuOAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHEIGVgCHBAqZOJQ8ATYCJANwCzoABCAFhG0Hgk8b/RIjEaZ0VZbsrxJ4GTrLFzMQJUJw8PTETZzA4YwYZttHx5cR17bmV2LGM8Hz//t920fe8+8+CfMGjUqisaaxOqFrgtSIRK+EovHe0cSizueB/2Pv/ZkDmn7a8VEC7XxaVOgDGniUQJR+Hw3XVh0AP/9t2p/LIAmDRInVDOpUPWbMME1InEDNh032lWE1nVkNFlPiFVWaImuRsk80zfOvTfzeqWYuAAWInRfD0C7azWX7a1Szp8sqgID/2+9XFbMoOnhoHE4ndX1vvl7eDHDxQX3FLdK2RDFMLW4WSymv2XD2w0yggYrnOjEZHwJKS1dIR1cqATmnOxMgM5PGYshzmbzGUeSpqdBvPJX3JOTRt9oA3oU/Xh65FclBJTH0hJ4836GHRwHOWQv7QI8FwvIE0OoPDFwBDm0RK6SGxXAlVErp4N0F16y55o2EVtiFeUEdNEEXWoIrBOK9mBqp2By74s04ejQ7Onk85dR0zu7/AwTZtHGzQ24stA9LXyiuueGWiXvHvZgf/FcetBWmZoa6KgOJhtJYrWMi19QilHGpzEhPH5IEF9YA6VaNMwRggjYCIigQZARTBLkKbCaQIdg8IF0wNZAKLBvIAEwDJAHLBdIA0wEpwVqAjMFcQGqwAAg6iCsJJoipBDmilqCJSCEtsGYgAtYFRMFuAjGwURA4juKQNGQnQZDheArBCKcmgh7O2WvoA5i7fh6AZ2Dn4Ndo/lsViORaBDVQEo3B2kIYFWRE5NJydEmeNNc6cFGknSLzeKR1XXUGA5enaK3fH0/qcXvoee6rqaW5N9udpXXdJhW17d2VVmHQswXJvNydk4S+7Iv3eIB5hTtqp/j9CQ2/EIDrcEpMXXo0+9Ib6mKp30/5fFqPh/B6C30gIzl7nt+fw/lTOp0+82otZ7h+po89XUobWmFBfJngoIztiubXdONyrjdOUNsjJupvsrctd7hbOTKky8GpUilIMC7VghgZkQN4CFQsAQEcQzzyih52nv6ad6Gx16Jv9cU/9ExDHk8i/ozctDTjJkFs7iOB9ay3RTvlFScK+aGCQ0u10AGIma4MDgJQHw6FhnI6zZVFIEE8JIWicl2oBEnRFsLeNgf+efZYztzgrvVDvZsdINKVoB1sxDEbE0naO3Ap1xlldFoUelu7WMK6FNkOSxTl5OSxMRFHiS52wDKfclp62AjCzXg5DQY0DrCZhI3p5qKoG9xbZp5X9MCin4zSCIwIWRTI4HC1d1XXRJbpbQ31LSGjs1jCdgEw3WudcW8cqu3RldmvxCG/l7R3op8CBKq9HKG3MRViAa7fMbpzHe/kyZEMyVEhzhfv3cmOi0AOMpBjpTiIMQZ9ETZNBrrasVEgRUYpZunluoHPdLE9CJPwQkVQ7qkUlULuJ2IWYTiPwbkAack5Ad6pAWl/pTCfb2eRjVWwDoRZojhnZLGdqTA4ImwAnh8IYOyRzri2X6kIcfuhO81pcVCk2MiTGqDpGKk3aeS9zXqbWItrAXAVlWU8s0h7fXWmXqGTO6jacG5acr1Wh/NwDEcSHUj5uECKKjg7AGMThyzoNCdO1caex/D9OLfjUlLN5BZgIiJWKnyq22LWA4yXrBhdx2wCrwFmSfW8rtVXl18Usyu1LsV8c411xMWhhMkx9sjuW89wzv8AWTa6jkpcPbFYXS8uvQrrSqRP/DOv2grJbgkrxTSXXlcpxPXYAkXuxAktjnCy1HyuHGQV2kySyKIOEEHLGi2VX0jm0UgMeB5vHxIXvvnjSHowtGL11tJVKctXfi2EfQmazFAj/jsy7A9pR76dmlc365zw2dlQLiTlK5iQNGBuN9ZgJCfb29LT6sy87m4e9GYl4zbV3K5Nx6cuDC5lzHk8U8swwSUL851+dH6yc55znWOeI3JyPBlYFXYTwBQwvV8eUAwKTcJBRdiw6wp6uU1NYPl7054r6waEK640QKvTnec+wsNh2euLuEWLF348K38xt0enmp23KCjt+zO3WMlKds3D8n/9cD3pOZ/v3rpV6i1PX9KBc9j27UuWbNseDrBt8wEzKtwKRt6pUzwDYIFsdPAA0kACZDfhQNovjrkGhzqxw2vKlPTovYBYkIzkHtPUug8NuVqEnLFAakD2Y+NA4wq+7G1H00DTiqZ3qu5d4ztZg4WBDL4XNi3kjc1Awp/cn7mH15l2KYOLzRnXjV0ck4xcHFm/SwtofbB3/Dr/a2RObPk19bXyWIU6XY1GM/YxFcMF2/9JOZmaskO+48hhUhF0MEhIfvLJ9qalS1s3KUhBkjjT7yfkhNcXjxiiwVo1kfMhZ+L7quro0OjKqqpQtriYE1o0xUDM5MvAhlRZ6b6eDkYnz/mQO15VVRmNYiqtVf9kP0vXaCpnUGMGMGgGUIyDWl3T0TlTd6obx2XyD6LBeb8Vmx0//5fKcFNYaBgdXsm7jkKRCQx9EeF/l2AdXNDg53vv7tZKVCfKz6SGtGHSv0dEmKJgJciVAeU/s5qUJ3wnVE2vDMr9qu2+7UpoGpMcrzap6pRNjRuUrXTVfpwxYV/89WKXMvTOMSH6zl/vjBZ/VZx3wvVX16LrXyV9BVR35uwweiYd1uienJ2bPghw9b8xtaIc/jL8/5S+93K17ezhdBj/33g22r8fZe/ypeCNbEQ9tjHSC9uCMX68YBfOCA6Hesc8BDZ9PzCobies4hsTEb8Z0SW+4MtDY2AJ//lu+E1BoqCdGCSnrxKuAmdxcnLKiOy9sFL4XrSsvm7L5q/qP/nk6rNfftku/Hbyvv7+fVuj6fqZO9zuP3pPnjxQMP799yTVbscrJctJXwZcJolrucsjI92IABuWO+gU2tGz7Z7DNOoYPe6AddMZUaVoGnN9+E0Fpr69dGiR7nPzpzE1kcVbqf1TghdmVhVFJ/fe3LBm25oFs7ds3TNVufLV/BPmNzPjVqlv0NNX0onlG9dwO8KflC0TiVaKZDyeYtqvN5Qz8YcXZ09Lifn7DNVnUiAIcpqBR2KGcFKHaBrlIp277HON6lB8vEhIwzisInqYcANG8gzTGB06QSOrz6XLzmaTh+PjhSLq9hAJHk8v2etR9ZA9THePzjN3M8qiu0chK7sjzKAFWIUutbaSLa0tqP/hhyM/tAaq7Gl48ItAUgS3Cr9cj/fEr731UUb8O2obzBMTY1qA1fRf03S56Z4+5fkUml7o97qihh5NY/zqfKkXfBHOh3rvvKkffFDShk7r0Xdv/dEv/o2U82lD7N+d5cSGFfN1x16PtZHPn52bSlAoHsKO9vSb/Zdemf4rtsfdkdy4Q3nr/6DcL+VbP4s+zki7vAJyrQxkSfQ/MMMPKNfrQ63Omsf79+DniUgPBc9xANXafeYOKRsUlOlt/4ElXX+3kQ+mVv8h80HqpzILP5M7MHTTK36Jyh2/VO6hX+myxwNXel5gJF4Al7z0/ETbBz/V9AlMMv0BDtM/fomhc30K24j5lZ5K0zArk825e/VEkIxetA9huxSVfxavbhWqzMWf0Bcvqa0Na39BxaJanBYtKZ58QwQto4dy1Q2zEopSEK8Lmxi8TyJT+kPHtWHO5+Nig6SvMdIwWG0jSEYvtA8X3XYpqit5RVfAWvH7f0JfvKSau+bhF4IKKAqE08/7XacwfFPiVHfdlivLVTfYCCX4RkpBeN06AU8NSchyW3/ouGbmqMtnR3qamlap18vDLcK5EO+h+57niYlLIqlkkkvxm0E/gun3b4/tocOGjxhZMep7spWx40462eRo7/bUyJwfUxukxsbbwvESWhD6dZY2ctXSpZjV/yUxiofiGcvWo5ntViQDplNPv5kZEgXJE2+jWzAo2Cj95BL7tM+SpPbflU1FVhve5emCHjv0RIc41xUzA9mDlm0ELepMTN69fEw2pec0z4id9c3qGO5cGWBU28JkHdhQumgzaZPv1zOoa8p4VdIyeqm61GNmWXrbDQYA\') format(\'woff2\'), url(data:application/x-font-woff;charset=utf-8;base64,) format(\'woff\'), url(data:application/x-font-ttf;charset=utf-8;base64,AAEAAAALAIAAAwAwR1NVQrD+s+0AAAE4AAAAQk9TLzI8dk+CAAABfAAAAFZjbWFw75C93QAAAkQAAAOEZ2x5ZpVmQXwAAAYEAAAMuGhlYWQYNrIJAAAA4AAAADZoaGVhCDQERQAAALwAAAAkaG10eHCpAAAAAAHUAAAAcGxvY2EvpCwiAAAFyAAAADptYXhwATAAawAAARgAAAAgbmFtZaDNlQEAABK8AAACbXBvc3S3TjRPAAAVLAAAAU8AAQAAA4D/gABcBKgAAAAABFYAAQAAAAAAAAAAAAAAAAAAABwAAQAAAAEAAEVkWhtfDzz1AAsEAAAAAADaYLcGAAAAANpgtwYAAP++BFYDQgAAAAgAAgAAAAAAAAABAAAAHABfAAoAAAAAAAIAAAAKAAoAAAD/AAAAAAAAAAEAAAAKAB4ALAABREZMVAAIAAQAAAAAAAAAAQAAAAFsaWdhAAgAAAABAAAAAQAEAAQAAAABAAgAAQAGAAAAAQAAAAAAAQQGAZAABQAIAokCzAAAAI8CiQLMAAAB6wAyAQgAAAIABQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUGZFZABA5gDtigOA/4AAXAOAAIAAAAABAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAEAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAASoAAAEAAAABAAAAAQAAAAEAAAABAAAAAAAAAUAAAADAAAALAAAAAQAAAIwAAEAAAAAASoAAwABAAAALAADAAoAAAIwAAQA/gAAAC4AIAAEAA7mAeYP5iPmKOYy5lPmW+ah5qbm4uc250znV+eg56jnvOfu6Bvofuke63jtiv//AADmAOYO5iPmKOYy5lLmWuah5qbm4uc250znVueg56jnvOfu6Bvofuke63jtiv//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAuADAAMgAyADIAMgA0ADYANgA2ADYANgA2ADgAOAA4ADgAOAA4ADgAOAA4AAAAEAAJABoAGwAWABIACwAVAAUADQAKABgADAARABkACAAOAA8AAQACAAMABAAGAAcAFwATABQAAAEGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAVQAAAAAAAAAGwAA5gAAAOYAAAAAEAAA5gEAAOYBAAAACQAA5g4AAOYOAAAAGgAA5g8AAOYPAAAAGwAA5iMAAOYjAAAAFgAA5igAAOYoAAAAEgAA5jIAAOYyAAAACwAA5lIAAOZSAAAAFQAA5lMAAOZTAAAABQAA5loAAOZaAAAADQAA5lsAAOZbAAAACgAA5qEAAOahAAAAGAAA5qYAAOamAAAADAAA5uIAAObiAAAAEQAA5zYAAOc2AAAAGQAA50wAAOdMAAAACAAA51YAAOdWAAAADgAA51cAAOdXAAAADwAA56AAAOegAAAAAQAA56gAAOeoAAAAAgAA57wAAOe8AAAAAwAA5+4AAOfuAAAABAAA6BsAAOgbAAAABgAA6H4AAOh+AAAABwAA6R4AAOkeAAAAFwAA63gAAOt4AAAAEwAA7YoAAO2KAAAAFAAAAAAAOACSANQBEgFGAYwBzAH6AkgCjALqAywDVgN8A6ID1AQABCAEWgSQBPIFEAWYBewGHAZEBlwAAAABAAAAAAMqAvMAIAAAAS4BJw4BFRQWMy4BJz4BNxYCBxUzEzM3IzceARcWNjcGAtAvTzGjnTU0BAkBAUg2Amh+5U6PIJslIT0cIjkRKQLnAQoBBJRjNywHHidtVAEi/fRWEgFzXbIHCgECLEwNAAAABQAAAAADcwLzAAsAFwAjACwANQAAJT4BNy4BJw4BBx4BEx4BFw4BBy4BJz4BEzI2Nw4BBy4BJx4BJzQ2MhYUBiImJTQ2MhYUBiImAgCe0QQE0Z6e0QQE0Z6AqgMDqoCAqgMDqoA/djMKgV1dgQozdnoaKBoaKBoBFhooGhooGg0E0Z6e0QQE0Z6e0QKcA6qAgKoDA6qAgKr+lyAeZIADA4FjHiCzHSgoOycnHh0oKDsnJwAABAAAAAADpgLyAAUAFgAfACYAAAEwMREhESUhIgYHER4BMyEyNjcRLgEjBw4BIiY0NjIWEyE1GwEzNwNx/R4C4v0eFh4BAR4WAuIWHgEBHhZpAS1DLS1DLTX9iLjTNbgCvP2IAng1Hhf9iBceHhcCeBceuCItLUMtLf4eagE8/vmeAAAABgAAAAADcwLzAAMABwALABEAHQApAAAlIRUhESEVIREhFSEnFSM1IzUTFTMVIzU3NSM1Mx0CIzUzNSM1MzUjNQGjAdD+MAHQ/jAB0P4wiy4uLl2LXFyLi1xcXFyYXAFyXAFyXIu6iy/+gyQvaislLmqs6C8uLi8uAAAAAAIAAAAAA2oC8wAKABsAAAEmIgcBHgEXATY0AS4BJw4BBzEOAQczFhc+ATcDTxxJHf77LkMRAQUb/pEBRTQ0RAIBQTgBNkNoigMC2Bsb/vsRQy4BBR1J/k40RQEBRTREbyAgAQOKZwAAAgAAAAADwwLEABQAKQAAAR4BFw4BBy4BLwE+ATcVIgYHBgc2IR4BFw4BBy4BLwE+ATcVIgYHBgc2AQRTcAICcFNUbwIBBN6oOWYoDw0PAgpUbwICb1RUbwIBBN+nOWYoDw0PAeMCb1RUbwICb1Qcp98EcSooDxIDAm9UVG8CAm9UHKffBHEqKA8SAwAKAAAAAAOmAvIAAwAHAAsADwATABcAGwAfACMAJwAAExEhEQE1Mx0CIzUTFSM1IxUjNRUzFSMlMxUjPQEzFQEzFSMhNTMVWgNM/fHS0tLSNdPT0wIP09PT/R7T0wIP0wLx/R4C4v4mnp41np4Bpp+fn5/Tnp6e0p+f/vmenp4AAAYAAAAAA8wC6AADAAcACwAPABMAFwAAExEhEQUVITURNSEVBTMVIykBNSE1IREhSAOE/iD+mAFo/pjw8AMM/iAB4P6YAWgC6P0wAtA8eHj+mLS0PLS0PAFoAAAABgAAAAADcwL1AAMABwALABcAIwAvAAABIRUhFSEVIRUhFSEBND4BMh4BFQ4BIiYHND4BMh4BFQ4BIiYHND4BMh4BFQ4BIiYBowHQ/jAB0P4wAdD+MP7qGCwyLBgCNE40AhgsMiwYAjRONAIYLDIsGAI0TjQCxFy6XLpcAloaKxoaKxonMzPvGisaGisaJzMz7xksGhorGiczMwAAAgAAAAAD1wL+ABMAJwAAASYiBwEGFB8BHgEzITI2NwE2NCcBDgEjISImLwEmND8BNjIfARYUBwKVBg8G/bMFBXMGEggBbwgRBgGDBQX+WQYSCP7kCBIGNgUF2AYPBtYFBQL4Bgb9tAYPBnIGBwcGAYMFDwb+qQYHBwY2BQ8G2AUF1wUPBgAAAAMAAAAAA3EC8gAXADAAPAAAAQcGIiY0PwE2NCYiDwEGFBYyPwE2NCYiASYiDwEGFBYyPwE2MhYUDwEGFBYyPwE2NAE3NjQmIg8BBhQWMgIZlCBZPyCSChIYCZMyYosxlAgRGQEeMYoykwgRGQiTIVk/IJMJERkJlDD+e1QJEhgJVAkSGAEBkyBAWSCTCRgSCZMyimIxkwkZEQG3MTGUCBkRCJQgQFofkwkYEgmTMor+sVQJGBIJVAkYEgAAAgAAAAADvALpABcAJwAAATkBNCcxAS4BDgIWFwkBBh4BMjcxATYFISIGHQEUFjMhMjY3NS4BAd4Q/s0KGxsTBgkLAQz+8Q8BHigQATMQAbP+eBMYGBMBiBIYAQEYAYAWDwEzCgYIFBwaCv70/vAQKB4OATMP6hkSERIYGBIREhkAAAAAAQAAAAADoQL4ABUAABMBFjY3NTYWFxY2NQIkBzUuAQcBBhRnARUPIQGM3mwHFiv+hU0BIQ/+6wgBrf7sDQ0UpQmGwQoHDAF3sBGjFA4N/usJFwAAAwAAAAADYQLyAAMACwATAAAlIxEzASE1ITUhNSEDESE1ITUhNQNgKSn+DgGf/ooBdv5hzgJt/bwCRA8C4v6uKdYq/pn+1yrWKQAAAAMAAAAAA2EC8gADAAsAEwAAEzMRIwEhFSEVIRUhBRUhFSEVIRGgKSkB8v5hAXb+igGf/mECRP28Am0C8f0eArkq1ik+KdYqASkAAAAHAAAAAAN3AvcAAwAHAAsADwATABcAGwAAJTMVIxEzFSMRMxUjASEVITchNSETIRUhNxUhNQIALy8vLy8v/rgCv/1BLwJh/Z9dAab+Wi8BSZaNAaaNAdWN/ufqL4wBd+q7jIwAAQAAAAAC/AL6ABsAAAEhETQ2MhYVERQGIiY1ESERFAYiJjURNDYyFhUBWAFQGCMYGCMY/rAYIxgYIxgBqgElEhgYEv1iEhgYEgEl/tsSGBgSAp4SGBgSAAIAAAAAAvsC8gADABEAACU1JRUDECMiNREzERQzMjURMwEGAfQX6d9OmJRODDIEMgF7/wD3AW/+lbawAXEAAAACAAAAAAPCAvgADwAgAAABIQ4BBxEeARchPgE3ES4BAwUGIiciJjURNDcyNhcFFhQC//4CU24CAm5TAf5TbgICbqT+8gUJAQQFCQUIAgEOBQL3Am5T/phTbgICblMBaFNu/n+0BAQHBQFoCwECArQEEAAAAAEAAP/3BAADCwAdAAAJASYHBh0BBAIHFRQWFzY3NiQ3FRQWMxY3AT4BNCYD+f4iCwYK/wD+AgkIEAEJARTBBQULBgHeAwQEAdIBMwUFBAq7Ff6YtgQFCAEBETLcFLwFCQUFAVYCCAYIAAAAAAYAAAAAA44DDgACABQAGAAbADQAOAAANxcjFyMiJj0BNDcBNzYfARYHAQYjJzMnHQEzJzcXATYvASYPAQEXATYyFhQHARcBNjIWFAcnFwcnmEtL4eEGCQQBnUI5OoMsLf4jBQaQbK4YGJ01AdEfHn8nJkD+bjYBkgULCQT+bjcBkgQMCQSM4SvhYksPCQbhBwQBnEEtLYM5Ov4jBR6ubEIYJDYB0Scmfx8fP/5uNgGSBQkMBf5uNgGSBAkMBbfhKuEAAAACAAD/vgRWA0IABwAPAAATMxEzETM1IRMVIREzESE1PpZLlv6JlQF4lgF1ATX+iQF3SwHClv0SAu6WAAADAAD//gPCAwIADwAyAF4AAAEyFh0BFAYjISImPQE0NjM3JicmNTQ2MzIXFhcWFxYVFA8BLwEmJyYjIgYVFBYXFhcWFwczFhUUBwYHBgcGBwYjIi8BJicmPQE0JyY/ATU3HwEWFx4CMzI+ATU0JyYDsgcJCQf8nAcJCQfjDgwYhoMZOiI3BQYHAwYqBxkbLD05REJrIzQdE3fPAxQMGBMkKCUoPjkpRh0HBAEBAQEzDwwDAxEtPCUgTC8pEQGACQcgBwkJByAHCSASFjEuW4AKBhITKD4eCQ4BAwFLHC06LCVDIAoXDgyAFBs3MxwYEhcYCQsMFAgGBAcHNhgPExMWASQcCgQcJRUaPSIqJQ4AAAQAAAAAA1YDAAAOABcAJgAvAAABIS4BJxE+ATMhHgEXDgElIT4BNy4BJyEBISImJxE+ATchHgEXDgElIT4BNy4BJyECVf6rExcBARcTAVVceAICeP56ASo4RwEBRzj+1gFV/oATFwEBFxMBgFx3AgJ3/k8BVThHAQFHOP6rAVUBFxMBVRQXAnhbXHhUAUc4N0cC/VUXFAFVExcBAnhcW3hTAkc3OEcBAAUAAAAAA4ADAAADAAoAEQAVABkAAAEhFSEHFSM1IzcXAzMHJzM1MxchFSEDIRUhAdUBq/5V1VWAqquAgKuqgFXVAav+VVUCAP4AAtVVK6qqq6v+VqurqtVVAYBWAAAAAAMAAAAAA6YC+wAGAA0AEQAAAScHFwcXNyUPARc3JzcbARcDA3CjNqKiNtn9jaM22TaiogzMSswBtaM2o6M22dmjNtk2o6P99gLjFf0dAAAAAQAA//oC3QMCAAsAAAE1IxUzAyMVMzUjEwLd1Dq+T9M6vgK7Rkb9hkZGAnoAAAAAAAASAN4AAQAAAAAAAAAVAAAAAQAAAAAAAQAIABUAAQAAAAAAAgAHAB0AAQAAAAAAAwAIACQAAQAAAAAABAAIACwAAQAAAAAABQALADQAAQAAAAAABgAIAD8AAQAAAAAACgArAEcAAQAAAAAACwATAHIAAwABBAkAAAAqAIUAAwABBAkAAQAQAK8AAwABBAkAAgAOAL8AAwABBAkAAwAQAM0AAwABBAkABAAQAN0AAwABBAkABQAWAO0AAwABBAkABgAQAQMAAwABBAkACgBWARMAAwABBAkACwAmAWkKQ3JlYXRlZCBieSBpY29uZm9udAp3LWUtaWNvblJlZ3VsYXJ3LWUtaWNvbnctZS1pY29uVmVyc2lvbiAxLjB3LWUtaWNvbkdlbmVyYXRlZCBieSBzdmcydHRmIGZyb20gRm9udGVsbG8gcHJvamVjdC5odHRwOi8vZm9udGVsbG8uY29tAAoAQwByAGUAYQB0AGUAZAAgAGIAeQAgAGkAYwBvAG4AZgBvAG4AdAAKAHcALQBlAC0AaQBjAG8AbgBSAGUAZwB1AGwAYQByAHcALQBlAC0AaQBjAG8AbgB3AC0AZQAtAGkAYwBvAG4AVgBlAHIAcwBpAG8AbgAgADEALgAwAHcALQBlAC0AaQBjAG8AbgBHAGUAbgBlAHIAYQB0AGUAZAAgAGIAeQAgAHMAdgBnADIAdAB0AGYAIABmAHIAbwBtACAARgBvAG4AdABlAGwAbABvACAAcAByAG8AagBlAGMAdAAuAGgAdAB0AHAAOgAvAC8AZgBvAG4AdABlAGwAbABvAC4AYwBvAG0AAAAAAgAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAQIBAwEEAQUBBgEHAQgBCQEKAQsBDAENAQ4BDwEQAREBEgETARQBFQEWARcBGAEZARoBGwEcAR0ABGZvbnQFaGFwcHkFaW1hZ2UMbGlzdG51bWJlcmVkC3BhaW50LWJydXNoCnF1b3Rlc2xlZnQGdGFibGUyBmlmcmFtZQVsaXN0MgZmb3JtYXQEbGluawh0ZXJtaW5hbAR1bmRvD3BhcmFncmFwaC1yaWdodA5wYXJhZ3JhcGgtbGVmdBBwYXJhZ3JhcGgtY2VudGVyBmhlYWRlcgl1bmRlcmxpbmUEUGxheQRyZWRvB3BlbmNpbDIKdGV4dC1oZWlnaA1zdHJpa2V0aHJvdWdoBGJvbGQLbGluZS1oZWlnaHQKc291bmQtY29kZQZpdGFsaWMAAAA=) format(\'truetype\'), /* chrome, firefox, opera, Safari, Android, iOS 4.2+ */ url(data:application/x-font-svg;charset=utf-8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pgo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiID4KPCEtLQoyMDEzLTktMzA6IENyZWF0ZWQuCi0tPgo8c3ZnPgo8bWV0YWRhdGE+CkNyZWF0ZWQgYnkgaWNvbmZvbnQKPC9tZXRhZGF0YT4KPGRlZnM+Cgo8Zm9udCBpZD0idy1lLWljb24iIGhvcml6LWFkdi14PSIxMDI0IiA+CiAgPGZvbnQtZmFjZQogICAgZm9udC1mYW1pbHk9InctZS1pY29uIgogICAgZm9udC13ZWlnaHQ9IjUwMCIKICAgIGZvbnQtc3RyZXRjaD0ibm9ybWFsIgogICAgdW5pdHMtcGVyLWVtPSIxMDI0IgogICAgYXNjZW50PSI4OTYiCiAgICBkZXNjZW50PSItMTI4IgogIC8+CiAgICA8bWlzc2luZy1nbHlwaCAvPgogICAgCiAgICA8Z2x5cGggZ2x5cGgtbmFtZT0iZm9udCIgdW5pY29kZT0iJiM1OTI5NjsiIGQ9Ik03MjAuMjc5MzU3OTEgNzQzLjA1NjgyMzczYy02NS41NTU0MTk5MiAwLTEwNy42MzI1MDczMiAxMS43MzE3NTA0OS0xNzUuMTQ1NjkwOTEgMTEuNzMxNzUwNDktMjE4LjE4NjgyODYyIDAtMzE5Ljk0NjA0NDkyLTEyNC4yNTg2NjctMzE5Ljk0NjA0NDkyLTI1MC40NzUwOTc2NiAwLTc0LjM2NTM1NjQ1IDM1LjIyNDkxNDU1LTk4LjgyMjU3MDggMTA0LjY5NTg2MTgtOTguODIyNTcwOC00Ljg5NDQwOTE4IDEwLjc2NzcwMDItMTMuNzA0MzQ1NyAyMi41MTQyODIyMy0xMy43MDQzNDU3IDc1LjM0NDIzODI4IDAgMTQ3LjczNjk5OTUxIDU1Ljc2NjYwMTU2IDE5MC43OTI5Njg3NSAxMjcuMTk1MzEyNSAxOTMuNzI5NjE0MjYgMCAwLTU4LjU5OTQyNjI3LTU3NC41NTkxNDMwNy0yMjguNjg3NTYxMDMtNjQzLjQ4MTMyMzI0bDAtMTcuODcyMDA5MjggMjI5LjI4MDgyMjc1IDAgNzguMjM2Mzg5MTYgMzcwLjc4ODU3NDIyIDE0My4yNzI3MDUwOCAwIDMxLjkxNzQ4MDQ3IDkyLjY5NzE0MzU2LTE1NS42NDIyMTE5MSAwIDM3LjYxMjc5Mjk3IDE3OC4yODk5NzgwMmM0My4wNTU5NjkyNC04LjgwOTkzNjUyIDg1LjExODIyNTEtMTcuNjA1MDQxNTEgMTIxLjMyMjAyMTQ4LTE3LjYwNTA0MTUgNDUuMDEzNzMyOTEgMCA4Ni4wOTcxMDY5MyAxMy43MDQzNDU3IDEwOC42MTEzODkxNiAxMTcuNDA2NDk0MTQtMjcuMzkzODU5ODctOC44MDk5MzY1Mi01Ni43NDU0ODMzOS0xMS43MzE3NTA0OS04OS4wMzM3NTI0NC0xMS43MzE3NTA0OXoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJoYXBweSIgdW5pY29kZT0iJiM1OTMwNDsiIGQ9Ik01MTIgMTMuMjExNDI1NzgwMDAwMDEzYzIwNC43NzkxMTM3NyAwIDM3MC43ODg1NzQyMiAxNjYuMDA5NDYwNDUgMzcwLjc4ODU3NDIyIDM3MC43ODg1NzQyMnMtMTY2LjAwOTQ2MDQ1IDM3MC43ODg1NzQyMi0zNzAuNzg4NTc0MjIgMzcwLjc4ODU3NDIyLTM3MC43ODg1NzQyMi0xNjYuMDA5NDYwNDUtMzcwLjc4ODU3NDIyLTM3MC43ODg1NzQyMiAxNjYuMDA5NDYwNDUtMzcwLjc4ODU3NDIyIDM3MC43ODg1NzQyMi0zNzAuNzg4NTc0MjJ6TTUxMiA2ODUuMjU4MzAwNzhjMTY2LjM4MDI0OTAzIDAgMzAxLjI3MzEzMjMyLTEzNC44NzgwNTE3NiAzMDEuMjczMTMyMzItMzAxLjI3MzEzMjMycy0xMzQuODc4MDUxNzYtMzAxLjI3MzEzMjMyLTMwMS4yNzMxMzIzMi0zMDEuMjczMTMyMzMtMzAxLjI3MzEzMjMyIDEzNC44NzgwNTE3Ni0zMDEuMjczMTMyMzIgMzAxLjI3MzEzMjMzIDEzNC44NzgwNTE3NiAzMDEuMjczMTMyMzIgMzAxLjI3MzEzMjMyIDMwMS4yNzMxMzIzMnpNNTEyIDMyMS4xNzM1ODM5OGM4My45NzYxOTYyOCAwIDE2My44MjkyMjM2NCAyMi4zMDY2NDA2MyAyMzEuNzQyODU4ODggNjEuNDkxNTc3MTYtMTAuNTYwMDU4NTktMTI5LjIyNzIzMzg4LTExMC44OTU0NDY3OC0yMzAuNDA4MDIwMDItMjMxLjc0Mjg1ODg4LTIzMC40MDgwMjAwMnMtMjIxLjE4MjgwMDI5IDEwMS4yOTk0Mzg0OC0yMzEuNzQyODU4ODggMjMwLjUxMTg0MDgxYzY3LjkxMzYzNTI2LTM5LjE4NDkzNjUzIDE0Ny43NjY2NjI2LTYxLjYxMDIyOTQ5IDIzMS43NDI4NTg4OC02MS42MTAyMjk0OXpNMzI2LjYwNTcxMjg5IDQ5OS44NjQwMTM2N2MwIDM4LjM5ODg2NDc0IDIwLjc0OTMyODYyIDY5LjUzMDI3MzQ0IDQ2LjM0ODU3MTc4IDY5LjUzMDI3MzQ0czQ2LjM0ODU3MTc3LTMxLjEzMTQwODY5IDQ2LjM0ODU3MTc4LTY5LjUzMDI3MzQ0YzAtMzguMzk4ODY0NzQtMjAuNzQ5MzI4NjItNjkuNTMwMjczNDQtNDYuMzQ4NTcxNzgtNjkuNTMwMjczNDRzLTQ2LjM0ODU3MTc3IDMxLjEzMTQwODY5LTQ2LjM0ODU3MTc4IDY5LjUzMDI3MzQ0ek02MDQuNjk3MTQzNTYgNDk5Ljg2NDAxMzY3YzAgMzguMzk4ODY0NzQgMjAuNzQ5MzI4NjIgNjkuNTMwMjczNDQgNDYuMzQ4NTcxNzcgNjkuNTMwMjczNDRzNDYuMzQ4NTcxNzctMzEuMTMxNDA4NjkgNDYuMzQ4NTcxNzgtNjkuNTMwMjczNDRjMC0zOC4zOTg4NjQ3NC0yMC43NDkzMjg2Mi02OS41MzAyNzM0NC00Ni4zNDg1NzE3OC02OS41MzAyNzM0NHMtNDYuMzQ4NTcxNzcgMzEuMTMxNDA4NjktNDYuMzQ4NTcxNzggNjkuNTMwMjczNDR6IiAgaG9yaXotYWR2LXg9IjEwMjQiIC8+CgogICAgCiAgICA8Z2x5cGggZ2x5cGgtbmFtZT0iaW1hZ2UiIHVuaWNvZGU9IiYjNTkzMjQ7IiBkPSJNODgxLjAzOTM3NSA3MDAuNDA2MjVjMC4wMzM3NS0wLjAzMzc1IDAuMDY3NS0wLjA2NzUgMC4xMDEyNS0wLjEwMTI1bDAtNjMyLjYyNjg3NWMtMC4wMzM3NS0wLjAzMzc1LTAuMDY3NS0wLjA2NzUtMC4xMDEyNS0wLjEwMTI1bC03MzguMDk1NjI1IDBjLTAuMDMzNzUgMC4wMzM3NS0wLjA2NzUgMC4wNjc1LTAuMTAxMjUgMC4xMDEyNWwwIDYzMi42MjY4NzVjMC4wMzM3NSAwLjAzMzc1IDAuMDY3NSAwLjA2NzUgMC4xMDEyNSAwLjEwMTI1bDczOC4wOTU2MjUgMHpNODgxLjE0MDYyNSA3NTMuMTQwNjI1bC03MzguMjgxMjUgMGMtMjkuMDA4MTI1IDAtNTIuNzM0Mzc1LTIzLjcyNjI1LTUyLjczNDM3NS01Mi43MzQzNzVsMC02MzIuODEyNWMwLTI5LjAwODEyNSAyMy43MjYyNS01Mi43MzQzNzUgNTIuNzM0Mzc1LTUyLjczNDM3NWw3MzguMjgxMjUgMGMyOS4wMDgxMjUgMCA1Mi43MzQzNzUgMjMuNzI2MjUgNTIuNzM0Mzc1IDUyLjczNDM3NWwwIDYzMi44MTI1YzAgMjkuMDA4MTI1LTIzLjcyNjI1IDUyLjczNDM3NS01Mi43MzQzNzUgNTIuNzM0Mzc1bDAgMHpNNzc1LjY3MTg3NSA1NjguNTYxODc1YzAtNDMuNjg5Mzc1LTM1LjQyMDYyNS03OS4xMS03OS4xMS03OS4xMXMtNzkuMTEgMzUuNDIwNjI1LTc5LjExIDc5LjExIDM1LjQyMDYyNSA3OS4xMSA3OS4xMSA3OS4xMSA3OS4xMS0zNS40MjA2MjUgNzkuMTEtNzkuMTF6TTgyOC40MDYyNSAxMjAuMzI4MTI1bC02MzIuODEyNSAwIDAgMTA1LjQ2ODc1IDE4NC41Nzg3NSAzMTYuNDA2MjUgMjEwLjkzNzUtMjYzLjY3MTg3NSA1Mi43MzQzNzUgMCAxODQuNTc4NzUgMTU4LjIwMzEyNXoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJsaXN0bnVtYmVyZWQiIHVuaWNvZGU9IiYjNTkzNzQ7IiBkPSJNNDE5LjMwMjg1NjQ0IDE1Mi4yNTcxNDExMjAwMDAwM2w0NjMuNDg1NzE3NzggMCAwLTkyLjY5NzE0MzU2LTQ2My40ODU3MTc3OCAwek00MTkuMzAyODU2NDQgNDMwLjM0ODU3MTc3bDQ2My40ODU3MTc3OCAwIDAtOTIuNjk3MTQzNTQtNDYzLjQ4NTcxNzc4IDB6TTQxOS4zMDI4NTY0NCA3MDguNDQwMDAyNDRsNDYzLjQ4NTcxNzc4IDAgMC05Mi42OTcxNDM1Ni00NjMuNDg1NzE3NzggMHpNMjgwLjI1NzE0MTEyIDc1NC43ODg1NzQyMmwwLTE4NS4zOTQyODcxMS00Ni4zNDg1NzE3OSAwIDAgMTM5LjA0NTcxNTMzLTQ2LjM0ODU3MTc3IDAgMCA0Ni4zNDg1NzE3OHpNMjMzLjkwODU2OTMzIDM3My44NTUyMjQ2MTAwMDAwNWwxZS04LTM2LjIwMzc5NjM5IDkyLjY5NzE0MzU1IDAgMC00Ni4zNDg1NzE3OC0xMzkuMDQ1NzE1MzMgMCAwIDEwNS43MzQwNjk4MyA5Mi42OTcxNDM1NiA0My40NTY0MjA5IDAgMzYuMjAzNzk2MzgtOTIuNjk3MTQzNTYgMCAwIDQ2LjM0ODU3MTc4IDEzOS4wNDU3MTUzMyAwIDAtMTA1LjczNDA2OTgyek0zMjYuNjA1NzEyODkgMjQ0Ljk1NDI4NDY3bDAtMjMxLjc0Mjg1ODg5LTEzOS4wNDU3MTUzMyAwIDAgNDYuMzQ4NTcxNzggOTIuNjk3MTQzNTYgMCAwIDQ2LjM0ODU3MTc4LTkyLjY5NzE0MzU2IDAgMCA0Ni4zNDg1NzE3OCA5Mi42OTcxNDM1NiAwIDAgNDYuMzQ4NTcxNzctOTIuNjk3MTQzNTYgMCAwIDQ2LjM0ODU3MTc4eiIgIGhvcml6LWFkdi14PSIxMDI0IiAvPgoKICAgIAogICAgPGdseXBoIGdseXBoLW5hbWU9InBhaW50LWJydXNoIiB1bmljb2RlPSImIzU4OTYzOyIgZD0iTTg0Ni45OTE4NTgwNiA3MjcuOTU1MzQwODljLTM1Ljc2MjM4MTI4IDM1Ljc2MjM4MTI4LTkzLjczMzE1NTA3IDM1Ljc2MjM4MTI4LTEyOS40OTU1MzYzNiAwTDQ1Ni40OTA0NjU3MyA0NjYuOTk1Mjc1ODRjNjAuNDY2MzU2MTYtMjEuNTQ0NDMwNCAxMDguMDQyNjg3MTEtNjkuMTQzNjU2MSAxMjkuNDk1NTM2MzUtMTI5LjU4NzExNzUxbDI2MS4wMDU4NTUyNiAyNjEuMDUxNjQ1NDhDODgyLjc3NzEzNDA4IDYzNC4yMjIxODUwNzk5OTk5IDg4Mi43NzcxMzQwOCA2OTIuMTkyOTU5NjEgODQ2Ljk5MTg1ODA2IDcyNy45NTUzNDA4OXpNNTA3LjQ1NTI5MzcgMjY2LjM4NzA5MTA1YzAgNjcuNDI2NTEyNDktNTQuNzQyNTQzNjMgMTIyLjA3NzQ3NTY4LTEyMi4xNjkwNTYxMyAxMjIuMDc3NDc1NjlzLTEyMi4wNzc0NzU2OC01NC42NTA5NjMyLTEyMi4wNzc0NzU2OC0xMjIuMDc3NDc1NjlsMC4wOTE1ODExNi0wLjA5MTU4MTE2QzI2My4yMDg3NjE5IDE3NS45NzM3NDcyOSAyMTQuMTIxMzQ0MzggOTcuMTY4Mjk1NDM5OTk5OTUgMTQxLjIyMjg2NzM3IDU0Ljk3MjM0ODU3MDAwMDAxbDAuMzY2MzIzOS0wLjQ1NzkwNTA0QzE3Ny40NDMxNTM3IDMzLjk1NDUwODkxOTk5OTk3IDIxOC45NTIyNDIyNSAyMi4xNDA1NTkyNTAwMDAwMjQgMjYzLjMwMDM0MjMyIDIyLjE0MDU1OTI1MDAwMDAyNCAzOTguMTc2MjYyNzcgMjIuMTQwNTU5MjUwMDAwMDI0IDUwNy41NDY4NzQxMiAxMzEuNTExMTcwNiA1MDcuNTQ2ODc0MTIgMjY2LjM4NzA5MTA1TDUwNy40NTUyOTM3IDI2Ni4zODcwOTEwNXoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJxdW90ZXNsZWZ0IiB1bmljb2RlPSImIzU5NDE5OyIgZD0iTTI1OS43NDY4NzUgNDgyLjkxNjY2NjY2QzM2OC40NzgxMjUgNDgyLjkxNjY2NjY2IDQ1Ni42MjE4NzUgMzk0Ljc3MjkxNjY2IDQ1Ni42MjE4NzUgMjg2LjA0MTY2NjY2MDAwMDAzIDQ1Ni42MjE4NzUgMTc3LjMxMDQxNjY2IDM2OC40NzgxMjUgODkuMTY2NjY2NjYwMDAwMDMgMjU5Ljc0Njg3NSA4OS4xNjY2NjY2NjAwMDAwMyAxNTEuMDE1NjI1IDg5LjE2NjY2NjY2MDAwMDAzIDYyLjg3MTg3NSAxNzcuMzEwNDE2NjYgNjIuODcxODc1IDI4Ni4wNDE2NjY2NjAwMDAwM0w2MiAzMTQuMTY2NjY2NjYwMDAwMDNDNjIgNTMxLjYyOTE2NjY2IDIzOC4yODc1IDcwNy45MTY2NjY2NiA0NTUuNzUgNzA3LjkxNjY2NjY2TDQ1NS43NSA1OTUuNDE2NjY2NjU5OTk5OUMzODAuNjI4MTI1IDU5NS40MTY2NjY2NTk5OTk5IDMxMC4wMDYyNSA1NjYuMTY2NjY2NjU5OTk5OSAyNTYuODc4MTI1IDUxMy4wMzg1NDE2NiAyNDYuNjQwNjI1IDUwMi44MDEwNDE2NiAyMzcuMzMxMjUgNDkxLjk0NDc5MTY2IDIyOC44OTM3NSA0ODAuNDk3OTE2NjYgMjM4Ljk2MjUgNDgyLjA3MjkxNjY2IDI0OS4yNTYyNSA0ODIuOTE2NjY2NjYgMjU5Ljc0Njg3NSA0ODIuOTE2NjY2NjZaTTc2NS45OTY4NzUgNDgyLjkxNjY2NjY2Qzg3NC43MjgxMjUgNDgyLjkxNjY2NjY2IDk2Mi44NzE4NzUgMzk0Ljc3MjkxNjY2IDk2Mi44NzE4NzUgMjg2LjA0MTY2NjY2MDAwMDAzIDk2Mi44NzE4NzUgMTc3LjMxMDQxNjY2IDg3NC43MjgxMjUgODkuMTY2NjY2NjYwMDAwMDMgNzY1Ljk5Njg3NSA4OS4xNjY2NjY2NjAwMDAwMyA2NTcuMjY1NjI1IDg5LjE2NjY2NjY2MDAwMDAzIDU2OS4xMjE4NzUgMTc3LjMxMDQxNjY2IDU2OS4xMjE4NzUgMjg2LjA0MTY2NjY2MDAwMDAzTDU2OC4yNSAzMTQuMTY2NjY2NjYwMDAwMDNDNTY4LjI1IDUzMS42MjkxNjY2NiA3NDQuNTM3NSA3MDcuOTE2NjY2NjYgOTYyIDcwNy45MTY2NjY2Nkw5NjIgNTk1LjQxNjY2NjY1OTk5OTlDODg2Ljg3ODEyNSA1OTUuNDE2NjY2NjU5OTk5OSA4MTYuMjU2MjUgNTY2LjE2NjY2NjY1OTk5OTkgNzYzLjEyODEyNSA1MTMuMDM4NTQxNjYgNzUyLjg5MDYyNSA1MDIuODAxMDQxNjYgNzQzLjU1MzEyNSA0OTEuOTQ0NzkxNjYgNzM1LjE0Mzc1IDQ4MC40OTc5MTY2NiA3NDUuMjEyNSA0ODIuMDcyOTE2NjYgNzU1LjUwNjI1IDQ4Mi45MTY2NjY2NiA3NjUuOTk2ODc1IDQ4Mi45MTY2NjY2NloiICBob3Jpei1hZHYteD0iMTAyNSIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJ0YWJsZTIiIHVuaWNvZGU9IiYjNTk1MTg7IiBkPSJNOTAuMTI1IDc1My4xNDA2MjVsMC03MzguMjgxMjUgODQzLjc1IDBMOTMzLjg3NSA3NTMuMTQwNjI1IDkwLjEyNSA3NTMuMTQwNjI1ek00MDYuNTMxMjUgMjc4LjUzMTI1bDAgMTU4LjIwMzEyNSAyMTAuOTM3NSAwIDAtMTU4LjIwMzEyNUw0MDYuNTMxMjUgMjc4LjUzMTI1ek02MTcuNDY4NzUgMjI1Ljc5Njg3NWwwLTE1OC4yMDMxMjVMNDA2LjUzMTI1IDY3LjU5Mzc1bDAgMTU4LjIwMzEyNUw2MTcuNDY4NzUgMjI1Ljc5Njg3NXpNNjE3LjQ2ODc1IDY0Ny42NzE4NzVsMC0xNTguMjAzMTI1TDQwNi41MzEyNSA0ODkuNDY4NzUgNDA2LjUzMTI1IDY0Ny42NzE4NzUgNjE3LjQ2ODc1IDY0Ny42NzE4NzV6TTM1My43OTY4NzUgNjQ3LjY3MTg3NWwwLTE1OC4yMDMxMjVMMTQyLjg1OTM3NSA0ODkuNDY4NzUgMTQyLjg1OTM3NSA2NDcuNjcxODc1IDM1My43OTY4NzUgNjQ3LjY3MTg3NXpNMTQyLjg1OTM3NSA0MzYuNzM0Mzc1bDIxMC45Mzc1IDAgMC0xNTguMjAzMTI1TDE0Mi44NTkzNzUgMjc4LjUzMTI1IDE0Mi44NTkzNzUgNDM2LjczNDM3NXpNNjcwLjIwMzEyNSA0MzYuNzM0Mzc1bDIxMC45Mzc1IDAgMC0xNTguMjAzMTI1TDY3MC4yMDMxMjUgMjc4LjUzMTI1IDY3MC4yMDMxMjUgNDM2LjczNDM3NXpNNjcwLjIwMzEyNSA0ODkuNDY4NzVMNjcwLjIwMzEyNSA2NDcuNjcxODc1bDIxMC45Mzc1IDAgMC0xNTguMjAzMTI1TDY3MC4yMDMxMjUgNDg5LjQ2ODc1ek0xNDIuODU5Mzc1IDIyNS43OTY4NzVsMjEwLjkzNzUgMCAwLTE1OC4yMDMxMjVMMTQyLjg1OTM3NSA2Ny41OTM3NSAxNDIuODU5Mzc1IDIyNS43OTY4NzV6TTY3MC4yMDMxMjUgNjcuNTkzNzVsMCAxNTguMjAzMTI1IDIxMC45Mzc1IDAgMC0xNTguMjAzMTI1TDY3MC4yMDMxMjUgNjcuNTkzNzV6IiAgaG9yaXotYWR2LXg9IjEwMjQiIC8+CgogICAgCiAgICA8Z2x5cGggZ2x5cGgtbmFtZT0iaWZyYW1lIiB1bmljb2RlPSImIzU5MjEyOyIgZD0iTTcyIDc0NGwwLTcyMCA5MDAgMEw5NzIgNzQ0IDcyIDc0NHpNNDkyIDY4NGwwLTEyMEwxMzIgNTY0IDEzMiA2ODQgNDkyIDY4NHpNMTMyIDMyNEwxMzIgNTA0bDM2MCAwIDAtMTgwTDEzMiAzMjR6TTEzMiAyNjRsMjQwIDAgMC0xODBMMTMyIDg0IDEzMiAyNjR6TTkxMiA4NEw0MzIgODRsMCAxODAgNDgwIDBMOTEyIDg0ek05MTIgMzI0TDU1MiAzMjQgNTUyIDUwNCA1NTIgNTY0IDU1MiA2ODRsMzYwIDBMOTEyIDMyNHoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJsaXN0MiIgdW5pY29kZT0iJiM1ODg4MTsiIGQ9Ik00MTkuMzAyODU2NDQgNzA4LjQ0MDAwMjQ0aDQ2My40ODU3MTc3OHYtOTIuNjk3MTQzNTZINDE5LjMwMjg1NjQ0VjcwOC40NDAwMDI0NHogbTFlLTgtMjc4LjA5MTQzMDY3aDQ2My40ODU3MTc3N3YtOTIuNjk3MTQzNTRINDE5LjMwMjg1NjQ0VjQzMC4zNDg1NzE3N3ogbTAtMjc4LjA5MTQzMDY1aDQ2My40ODU3MTc3N3YtOTIuNjk3MTQzNTZINDE5LjMwMjg1NjQ0djkyLjY5NzE0MzU2ek0xNDEuMjExNDI1NzggNjYyLjA5MTQzMDY3YTkyLjY5NzE0MzU2IDkyLjY5NzE0MzU2IDAgMSAwIDE4NS4zNDc5Mzg1NCAwLjA0NjM0ODU3QTkyLjY5NzE0MzU2IDkyLjY5NzE0MzU2IDAgMCAwIDE0MS4yMTE0MjU3OCA2NjIuMDkxNDMwNjd6IG0wLTI3OC4wOTE0MzA2N2E5Mi42OTcxNDM1NiA5Mi42OTcxNDM1NiAwIDEgMCAxODUuMzQ3OTM4NTQgMC4wNDYzNDg1OEE5Mi42OTcxNDM1NiA5Mi42OTcxNDM1NiAwIDAgMCAxNDEuMjExNDI1NzggMzg0eiBtMC0yNzguMDkxNDMwNjdhOTIuNjk3MTQzNTYgOTIuNjk3MTQzNTYgMCAxIDAgMTg1LjM0NzkzODU0IDAuMDQ2MzQ4NTlBOTIuNjk3MTQzNTYgOTIuNjk3MTQzNTYgMCAwIDAgMTQxLjIxMTQyNTc4IDEwNS45MDg1NjkzMjk5OTk5OHoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJmb3JtYXQiIHVuaWNvZGU9IiYjNTg5NzE7IiBkPSJNNjYwLjUxMDkzMzMzIDc2MC40OTgxMzMzM2MtNy4yMjAyNjY2NyA3LjIyMTMzMzMzLTE5LjAzNDY2NjY3IDcuMjIxMzMzMzMtMjYuMjU2IDBMNDUuNDUyOCAxNzEuNjk0OTMzMzMwMDAwMDNjLTcuMjIwMjY2NjctNy4yMTkyLTcuMjIwMjY2NjctMTkuMDM0NjY2NjcgMC0yNi4yNTQ5MzMzNGwxMTQuNTE3MzMzMzMtMTE0LjUxODRjNy4yMjEzMzMzMy03LjIyMDI2NjY3IDIxLjQ4MjY2NjY3LTEzLjEyNzQ2NjY3IDMxLjY5Mzg2NjY3LTEzLjEyNzQ2NjY2SDU1OC41MjhjMTAuMjEwMTMzMzMgMCAyNC40NzM2IDUuOTA3MiAzMS42OTI4IDEzLjEyNzQ2NjY2bDM4Ni44MDUzMzMzMyAzODYuODAzMmM3LjIyMTMzMzMzIDcuMjIwMjY2NjcgNy4yMjEzMzMzMyAxOS4wMzQ2NjY2NyAwIDI2LjI1Nkw2NjAuNTEyIDc2MC40OTgxMzMzM3pNNTUzLjc5OTQ2NjY3IDEwMC43NzY1MzMzM2MtNy4yMjAyNjY2Ny03LjIxOTItMjEuNDgyNjY2NjctMTMuMTI3NDY2NjctMzEuNjkyOC0xMy4xMjc0NjY2N0gyMzguMDczNmMtMTAuMjExMiAwLTI0LjQ3MzYgNS45MDgyNjY2Ny0zMS42OTI4IDEzLjEyNzQ2NjY3bC01My45ODQgNTMuOTg0Yy03LjIyMDI2NjY3IDcuMjIwMjY2NjctNy4yMjAyNjY2NyAxOS4wMzQ2NjY2NyAwIDI2LjI1NmwyMTUuODUwNjY2NjcgMjE1Ljg1MTczMzMzYzcuMjIxMzMzMzMgNy4yMTkyIDE5LjAzNTczMzMzIDcuMjE5MiAyNi4yNTcwNjY2NiAwbDIxNC41NjUzMzMzNC0yMTQuNTY2NGM3LjIyMDI2NjY3LTcuMjE5MiA3LjIyMDI2NjY3LTE5LjAzNDY2NjY3IDAtMjYuMjU0OTMzMzNsLTU1LjI3MDQtNTUuMjcwNHoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJsaW5rIiB1bmljb2RlPSImIzU4OTMwOyIgZD0iTTUzNi43MzI0MjE4OCAyNTcuMDk0NzI2NTZsLTE0Ny40OTgwNDY4OC0xNDcuNDk4MDQ2ODdxLTMyLjE0MTYwMTU2LTMxLjMyNDIxODc1LTc2LjYyMzA0Njg4LTMxLjMyNDIxODc1dC03NS44MDU2NjQwNiAzMS4zMjQyMTg3NXEtMzIuMTQxNjAxNTYgMzIuMTQxNjAxNTYtMzIuMTQxNjAxNTYgNzYuNjIzMDQ2ODd0MzIuMTQxNjAxNTYgNzYuNjIzMDQ2ODhsMTQ2LjY4MDY2NDA3IDE0Ny40OTgwNDY4N3E5LjA3MDMxMjUgOC4yNTI5Mjk2OSA5LjA3MDMxMjQ5IDIwLjU5Mjc3MzQ0dC04LjY0ODQzNzUgMjEuMDE0NjQ4NDQtMjEuMDE0NjQ4NDMgOC42NDg0Mzc1LTIwLjU5Mjc3MzQ0LTkuMDcwMzEyNUwxOTQuODAyNzM0MzcgMzA0Ljg0NTcwMzEyMDAwMDA1cS00OS40Mzg0NzY1Ni00OS40Mzg0NzY1Ni00OS40Mzg0NzY1Ni0xMTguNjUyMzQzNzR0NDkuMDE2NjAxNTctMTE4LjIzMDQ2ODc1IDExOC4yMzA0Njg3NC00OS4wMTY2MDE1NyAxMTguNjUyMzQzNzUgNDguNjIxMDkzNzVsMTQ3LjQ5ODA0Njg4IDE0Ny40OTgwNDY4OHE4LjI1MjkyOTY5IDkuMDcwMzEyNSA4LjI1MjkyOTY5IDIxLjQzNjUyMzQzdC04LjY0ODQzNzUgMjEuMDE0NjQ4NDQtMjEuMDE0NjQ4NDQgOC42NDg0Mzc1LTIwLjU5Mjc3MzQ0LTkuMDcwMzEyNXpNODMxLjI4MDI3MzQ0IDcwNC45NDE0MDYyNXEtNDkuMDE2NjAxNTYgNDkuMDE2NjAxNTYtMTE4LjIzMDQ2ODc1IDQ5LjAxNjYwMTU2dC0xMTguNjUyMzQzNzUtNDkuNDM4NDc2NTZsLTE0Ny40OTgwNDY4OC0xNDcuNDk4MDQ2ODhxLTguMjUyOTI5NjktOC4yNTI5Mjk2OS04LjI1MjkyOTY4LTIwLjU5Mjc3MzQzdDguNjQ4NDM3NS0yMS4wMTQ2NDg0NCAyMS4wMTQ2NDg0My04LjY0ODQzNzUgMjAuNTkyNzczNDQgOC4yNTI5Mjk2OWwxNDcuNDk4MDQ2ODggMTQ3LjQ5ODA0Njg3cTMyLjE0MTYwMTU2IDMyLjE0MTYwMTU2IDc2LjYyMzA0Njg3IDMyLjE0MTYwMTU3dDc2LjIyNzUzOTA2LTMxLjcxOTcyNjU3IDMxLjcxOTcyNjU3LTc2LjYyMzA0Njg3LTMyLjE0MTYwMTU3LTc2LjIyNzUzOTA3bC0xNDYuNjgwNjY0MDYtMTQ3LjQ5ODA0Njg3cS05LjA3MDMxMjUtOC4yNTI5Mjk2OS05LjA3MDMxMjUtMjAuNTkyNzczNDR0OC42NDg0Mzc1LTIxLjAxNDY0ODQ0IDIxLjAxNDY0ODQ0LTguNjQ4NDM3NSAyMS40MzY1MjM0NCA4LjI1MjkyOTY5bDE0Ny40OTgwNDY4NyAxNDcuNDk4MDQ2ODhxNDguNjIxMDkzNzUgNDkuNDM4NDc2NTYgNDguNjIxMDkzNzUgMTE4LjY1MjM0Mzc1dC00OS4wMTY2MDE1NiAxMTguMjMwNDY4NzV6TTQ5MC41ODk4NDM3NSAzMjEuMzc3OTI5NjlsODQuMDU4NTkzNzUgODQuMDU4NTkzNzVxOS4wNzAzMTI1IDguMjUyOTI5NjkgOS4wNzAzMTI1IDIwLjU5Mjc3MzQzdC04LjY0ODQzNzUgMjEuMDE0NjQ4NDQtMjEuMDE0NjQ4NDQgOC42NDg0Mzc1LTIwLjU5Mjc3MzQ0LTkuMDcwMzEyNWwtODQuMDU4NTkzNzQtODQuMDU4NTkzNzVxLTkuMDcwMzEyNS04LjI1MjkyOTY5LTkuMDcwMzEyNS0yMC41OTI3NzM0M3Q4LjY0ODQzNzUtMjEuMDE0NjQ4NDQgMjEuMDE0NjQ4NDMtOC42NDg0Mzc1IDIwLjU5Mjc3MzQ0IDkuMDcwMzEyNXoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJ0ZXJtaW5hbCIgdW5pY29kZT0iJiM1OTA0NjsiIGQ9Ik00NzcuODY2NjY2NjcgMzg0djAuMTE5NDY2NjcgMC4xMTk0NjY2NmE1MS4wMjkzMzMzMyA1MS4wMjkzMzMzMyAwIDAgMS0xNS42NjcyIDM2Ljg0NjkzMzM0bDAuMDE3MDY2NjYgMC4wMTcwNjY2Ni0zMDcuMiAzMDcuMi0wLjEzNjUzMzMzLTAuMTM2NTMzMzNhNTEuMiA1MS4yIDAgMSAxLTY4Ljc2MTYtNzUuNzkzMDY2NjdsMjY4LjI1Mzg2NjY3LTI2OC4yNTM4NjY2Nkw4Mi42MDI2NjY2NyAxMTIuMzQ5ODY2NjY5OTk5OThsMC4wMTcwNjY2Ni0wLjAxNzA2NjY3YTUxLjIgNTEuMiAwIDAgMSA3Mi4zNzk3MzMzNC03Mi4zNzk3MzMzM2wwLjAxNzA2NjY2LTAuMDE3MDY2NjcgMzA3LjIgMzA3LjItMC4wMTcwNjY2NiAwLjAxNzA2NjY3QTUxLjAyOTMzMzMzIDUxLjAyOTMzMzMzIDAgMCAxIDQ3Ny44NjY2NjY2NyAzODR6IG00MzUuMi0yNTZoLTM5Mi41MzMzMzMzNGE0Mi42NjY2NjY2NyA0Mi42NjY2NjY2NyAwIDAgMS00Mi42NjY2NjY2Ni00Mi42NjY2NjY2N3YtMTcuMDY2NjY2NjZhNDIuNjY2NjY2NjcgNDIuNjY2NjY2NjcgMCAwIDEgNDIuNjY2NjY2NjYtNDIuNjY2NjY2NjdoMzkyLjUzMzMzMzM0YTQyLjY2NjY2NjY3IDQyLjY2NjY2NjY3IDAgMCAxIDQyLjY2NjY2NjY2IDQyLjY2NjY2NjY3djE3LjA2NjY2NjY2YTQyLjY2NjY2NjY3IDQyLjY2NjY2NjY3IDAgMCAxLTQyLjY2NjY2NjY2IDQyLjY2NjY2NjY3eiIgIGhvcml6LWFkdi14PSIxMDI0IiAvPgoKICAgIAogICAgPGdseXBoIGdseXBoLW5hbWU9InVuZG8iIHVuaWNvZGU9IiYjNTg5NzA7IiBkPSJNMTAzLjI1IDQyOS4yODEyNWwyNzYuMzc1LTI3Ni40Njg3NWMxOC4yODEyNS0xOC4xODc1IDQ5LjUtNS4yNSA0OS41IDIwLjUzMTI1VjMzNy41OTM3NWMxODkuODQzNzUgNy42ODc1IDMyMi41OTM3NS01NS43ODEyNSA0NzAuMjUtMzE3LjE1NjI1IDcuOTY4NzUtMTQuMDYyNSAyOS41MzEyNS03LjQwNjI1IDI4LjY4NzUgOC43MTg3NS0yOC41OTM3NSA1MjAuMDMxMjUtNDI0LjY4NzUgNTM1LjY4NzUtNDk5LjAzMTI1IDUzNHYxNjMuMTI1YzAgMjUuNzgxMjUtMzEuMTI1IDM4LjcxODc1LTQ5LjQwNjI1IDIwLjQzNzVMMTAzLjE1NjI1IDQ3MC4yNWMtMTEuMjUtMTEuMzQzNzUtMTEuMjUtMjkuNjI1IDAuMDkzNzUtNDAuOTY4NzV6IiAgaG9yaXotYWR2LXg9IjEwMjQiIC8+CgogICAgCiAgICA8Z2x5cGggZ2x5cGgtbmFtZT0icGFyYWdyYXBoLXJpZ2h0IiB1bmljb2RlPSImIzU5MjIyOyIgZD0iTTg2NC4yNDkxNDU1MSAxNC44NTkzNzVoLTQxLjE5ODczMDQ4Vjc1My4xNDA2MjVoNDEuMTk4NzMwNDd2LTczOC4yODEyNXogbS00OTguNTA0NjM4NjcgNDAwLjAzOTY3Mjg2aDQxNS4yODMyMDMxM3Y0MS4xOTg3MzA0NmgtMzc0LjA4NDQ3MjY2djIxNC4yMzMzOTg0NGgzNzQuMDg0NDcyNjZ2NDEuMTk4NzMwNDZoLTQxNS4yODMyMDMxM3YtMjk2LjYzMDg1OTM2eiBtLTIwNS45OTM2NTIzNC02MS43OTgwOTU3MnYtMjk2LjYzMDg1OTM2aDYyMS4yNzY4NTU0N3Y0MS4xOTg3MzA0NmgtNTgwLjA3ODEyNXYyMTQuMjMzMzk4NDRoNTgwLjA3ODEyNXY0MS4xOTg3MzA0NmgtNjIxLjI3Njg1NTQ3eiIgIGhvcml6LWFkdi14PSIxMDI0IiAvPgoKICAgIAogICAgPGdseXBoIGdseXBoLW5hbWU9InBhcmFncmFwaC1sZWZ0IiB1bmljb2RlPSImIzU5MjIzOyIgZD0iTTE1OS43NTA4NTQ0OSA3NTMuMTQwNjI1aDQxLjE5ODczMDQ4di03MzguMjgxMjVoLTQxLjE5ODczMDQ3Vjc1My4xNDA2MjV6IG00OTguNTA0NjM4NjctNDEuNjEwNzE3NzhoLTQxNS4yODMyMDMxM3YtNDEuMTk4NzMwNDdoMzc0LjA4NDQ3MjY2di0yMTQuMjMzMzk4NDJoLTM3NC4wODQ0NzI2NnYtNDEuMTk4NzMwNDhoNDE1LjI4MzIwMzEzdjI5Ni42MzA4NTkzOHogbS00MTUuMjgzMjAzMTMtMzU4LjQyODk1NTA3di00MS4xOTg3MzA0OGg1ODAuMDc4MTI1di0yMTQuMjMzMzk4NDJoLTU4MC4wNzgxMjV2LTQxLjE5ODczMDQ4aDYyMS4yNzY4NTU0N3YyOTYuNjMwODU5MzhoLTYyMS4yNzY4NTU0N3oiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJwYXJhZ3JhcGgtY2VudGVyIiB1bmljb2RlPSImIzU4ODgwOyIgZD0iTTUxMiAxNDkuNjI1MzY2MjIwMDAwMDVoNDYuODc1MDkxNTZ2LTE0MC42MjUyNzQ2Nkg1MTJ6IG0wIDI4MS4yNDk3MjUzNGg0Ni44NzUwOTE1NnYtMTQwLjYyNTI3NDY2SDUxMnogbTAgMzI4LjEyNDgxNjg4aDQ2Ljg3NTA5MTU2di0xNDAuNjI1Mjc0NjZINTEyek0xODMuODc1MTgzMSAzMzcuMTI0OTA4NDRIODg2Ljk5OTA4NDQ3di0yMzQuMzc0NjMzNzhIMTgzLjg3NTE4MzFWMzM3LjEyNDA4NDQ3OTk5OTk2eiBtNDYuODc1MDkxNTYtMTg3LjQ5OTU0MjIzaDYwOS4zNzQ1NDIyNFYyOTAuMjQ5ODE2OTAwMDAwMDRIMjMwLjc1MDI3NDY2di0xNDAuNjI0NDUwNjh6IG05My43NDkzNTkxMyA1MTUuNjI0MzU5MTNoNDIxLjg3NVY0MzAuODc1OTE1NTJoLTQyMS44NzVWNjY1LjI0OTcyNTMzOTk5OTl6IG00Ni44NzU5MTU1My00Ni44NzUwOTE1NnYtMTQwLjYyNDQ1MDY4aDMyOC4xMjQ4MTY5VjYxOC4zNzQ2MzM3ODAwMDAxSDM3MS4zNzQ3MjUzNHoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJoZWFkZXIiIHVuaWNvZGU9IiYjNTkxMDY7IiBkPSJNMzQ0LjQyMzAzOTA5IDQyNS44OTQyNDAwMmgzMzUuMTUzOTIxODJ2MjkzLjI1OTY4MjYyYTQxLjg5NDI0MDAyIDQxLjg5NDI0MDAyIDAgMSAwIDgzLjc4ODQ4MDg2IDB2LTY3MC4zMDc4NDUyOGE0MS44OTQyNDAwMiA0MS44OTQyNDAwMiAwIDAgMC04My43ODg0ODA4NiAwdjI5My4yNTk2ODI2MmgtMzM1LjE1MzkyMTgydi0yOTMuMjU5NjgyNjJhNDEuODk0MjQwMDIgNDEuODk0MjQwMDIgMCAwIDAtODMuNzg4NDgwODYgMHY2NzAuMzA3ODQ1MjhhNDEuODk0MjQwMDIgNDEuODk0MjQwMDIgMCAwIDAgODMuNzg4NDgwODYgMHoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJ1bmRlcmxpbmUiIHVuaWNvZGU9IiYjNTg5MjA7IiBkPSJNMjYxLjUwMzY2NzQ2IDExLjg3ODA5MjQ1MDAwMDA1NHY0OS45NzY1MzQ0N2w1MDAuOTkyNjY1MDggNC41NDU5OTkwMXYtNDkuOTY2NzE1ODVMMjYxLjUwMzY2NzQ2IDExLjg3ODA5MjQ1MDAwMDA1NHpNNzM4LjY4NjI5NDE3IDM5NS4xNzU1Mjg0NXEwLTI1Ni40MTIwMjIzNy0yMzIuNjAxOTgzOTgtMjU2LjQxMjAyMzEtMjIyLjg4MTU5NzExIDAtMjIyLjg4MTU5NzEzIDI0Ny40MjgwMjg4NlY3NTMuNDA2MTQ4MzNoNzguMDU3NjUxN3YtMzYzLjY4OTc0NjU4cTAtMTgxLjQ3NjY3Njk4IDE1Mi4xODc4NzQ1Ny0xODEuNDc2Njc2OTcgMTQ3LjEzMTMwOTg2IDAgMTQ3LjEzMTMwOTg3IDE3NS42MjQ4MDc2OVY3NTMuNDU1MjQwODlINzM4LjY4NjI5NDE3eiIgIGhvcml6LWFkdi14PSIxMDI0IiAvPgoKICAgIAogICAgPGdseXBoIGdseXBoLW5hbWU9IlBsYXkiIHVuaWNvZGU9IiYjNjAyODA7IiBkPSJNNzY2Ljk5OTk5OTcxIDc1OS4wMDAwMDAyOWgtNTA5Ljk5OTk5OTQyQzE0OS4wMDAwMDAyOSA3NTkuMDAwMDAwMjkgNjIgNjcyIDYyIDU2NHYtMzYwYzAtMTA4IDg3LjAwMDAwMDI5LTE5NS4wMDAwMDAyOSAxOTUuMDAwMDAwMjktMTk1LjAwMDAwMDI5aDUwOS45OTk5OTk0MmMxMDggMCAxOTUuMDAwMDAwMjkgODcuMDAwMDAwMjkgMTk1LjAwMDAwMDI5IDE5NS4wMDAwMDAyOVY1NjRjMCAxMDgtODcuMDAwMDAwMjkgMTk1LjAwMDAwMDI5LTE5NS4wMDAwMDAyOSAxOTUuMDAwMDAwMjl6IG0tODEtMzg3bC0yNzAtMTgwYy0yLjk5OTk5OTcxLTIuOTk5OTk5NzEtNi4wMDAwMDAyOS0yLjk5OTk5OTcxLTktMy4wMDAwMDA1OC0yLjk5OTk5OTcxIDAtNi4wMDAwMDAyOSAwLTUuOTk5OTk5NDIgMy4wMDAwMDA1OC02LjAwMDAwMDI5IDAtOSA2LjAwMDAwMDI5LTkgMTEuOTk5OTk5NzFWNTY0YzAgNi4wMDAwMDAyOSAyLjk5OTk5OTcxIDExLjk5OTk5OTcxIDkgMTEuOTk5OTk5NzFzMTEuOTk5OTk5NzEgMi45OTk5OTk3MSAxNC45OTk5OTk0MiAwbDI3MC0xODBjMi45OTk5OTk3MS0yLjk5OTk5OTcxIDYuMDAwMDAwMjktNi4wMDAwMDAyOSA2LjAwMDAwMDI5LTExLjk5OTk5OTcxcy0yLjk5OTk5OTcxLTktNi4wMDAwMDAyOS0xMS45OTk5OTk3MXoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJyZWRvIiB1bmljb2RlPSImIzYwODEwOyIgZD0iTTEwMTcuMTczMzMzIDQ2NS45MmwtNDc3Ljg2NjY2NiAzMDcuMmMtNi44MjY2NjcgMy40MTMzMzMtMTMuNjUzMzMzIDMuNDEzMzMzLTE3LjA2NjY2NyAwLTYuODI2NjY3LTMuNDEzMzMzLTEwLjI0LTYuODI2NjY3LTEwLjI0LTEzLjY1MzMzM3YtMTg3LjczMzMzNEMxNzAuNjY2NjY3IDU2MS40OTMzMzMgMy40MTMzMzMgMjMzLjgxMzMzMjk5OTk5OTk0IDAgOC41MzMzMzI5OTk5OTk5N3YtMy40MTMzMzNjMC02LjgyNjY2NyA2LjgyNjY2Ny0xMy42NTMzMzMgMTcuMDY2NjY3LTEzLjY1MzMzM3MxNy4wNjY2NjcgNi44MjY2NjcgMTcuMDY2NjY2IDE3LjA2NjY2NmMzLjQxMzMzMyA1MS4yIDIyOC42OTMzMzMgMjc5Ljg5MzMzMyA0NzcuODY2NjY3IDI5MC4xMzMzMzRWMTEwLjkzMzMzMjk5OTk5OTk1YzAtNi44MjY2NjcgMy40MTMzMzMtMTMuNjUzMzMzIDEwLjI0LTEzLjY1MzMzMyA2LjgyNjY2Ny0zLjQxMzMzMyAxMy42NTMzMzMtMy40MTMzMzMgMTcuMDY2NjY3IDBsNDc3Ljg2NjY2NiAzNDEuMzMzMzMzYzMuNDEzMzMzIDMuNDEzMzMzIDYuODI2NjY3IDEwLjI0IDYuODI2NjY3IDEzLjY1MzMzNHMtMy40MTMzMzMgMTAuMjQtNi44MjY2NjcgMTMuNjUzMzMzeiIgIGhvcml6LWFkdi14PSIxMDI0IiAvPgoKICAgIAogICAgPGdseXBoIGdseXBoLW5hbWU9InBlbmNpbDIiIHVuaWNvZGU9IiYjNTg5NjI7IiBkPSJNMTUyIDk4LjI1bDc0Ljk5OTk5OTcxLTc0Ljk5OTk5OTcxSDE1MnpNMzc3IDguMjVIMTUyYTE1LjAwMDAwMDI5IDE1LjAwMDAwMDI5IDAgMCAwLTE1LjAwMDAwMDI5IDE1LjAwMDAwMDI5djIyNSAwLjA1OTk5OTQyIDAuMDQ1IDAuMDMwMDAwNTggMC4wMTQ5OTk0MiAwLjA0NSAwLjA0NWExNC45NCAxNC45NCAwIDAgMCA0LjM2NSAxMC4zMzUwMDA1OGwwLjAzMDAwMDU4IDAuMDI5OTk5NzEgNDEyLjQ5OTk5OTcxIDQxMi40OTk5OTk3MSA2NC41NTk5OTk3MSA2My44MWMwLjM3NTAwMDI5IDAuMzc1MDAwMjkgMC43ODAwMDAyOSAwLjcyIDEuMjAwMDAwNTggMS4wNjUwMDA1OCAzNy40Njk5OTk3MSAyOS44NTAwMDAyOSA3Ny4zNTUgMjkuODY0OTk5NzEgMTE1LjM0OTk5OTQyIDAuMDU5OTk5NDJhMTIuNjc0OTk5NzEgMTIuNjc0OTk5NzEgMCAwIDAgMS4zNS0xLjE5OTk5OTcxbDEyOC4yNS0xMjguMjVhMTQuOTEwMDAwMjkgMTQuOTEwMDAwMjkgMCAwIDAgMS4yMTUtMS4zNjUwMDAyOWMyOS4yNjUwMDAyOS0zNy40NTUwMDAyOSAyOS4wMDk5OTk3MS03Ny4yOTQ5OTk3MS0wLjc2NS0xMTUuMjQ1YTE0LjgwNSAxNC44MDUgMCAwIDAtMS4xOTk5OTk3MS0xLjM1bC00NzYuMjUwMDAwMjktNDc2LjI0OTk5OTQyYTE0Ljk2OTk5OTcxIDE0Ljk2OTk5OTcxIDAgMCAwLTEwLjM2NDk5OTQyLTQuMzk1MDAwNThoLTAuMTY1MDAwNThMMzc3IDguMjV6IG0tMTQzLjc5MDAwMDI5IDI5Ljk5OTk5OTcxaDEwNy41ODAwMDA1OEwxNjcuMDAwMDAwMjkgMjEyLjAzOTk5OTcwOTk5OTk2di0xMDcuNTc5OTk5NzFsNjYuMjA5OTk5NDItNjYuMjEwMDAwMjl6TTE2Ny4wMDAwMDAyOSAzOC4yNDk5OTk3MWgyMy43ODk5OTk3MUwxNjcuMDAwMDAwMjkgNjIuMDQwMDAwMjg5OTk5OTY2di0yMy43OTAwMDA1OHogbTE1Ni45NiA1OS4yNTAwMDA1OEwzNzcgNDQuNDU5OTk5NzEwMDAwMDM0bDQ2NC45ODUgNDY0Ljk4NWMyMC40MyAyNi40NiAyMC42NzAwMDAyOSA1MC45MjQ5OTk3MSAwLjczNTAwMDI5IDc2Ljg2bC0xMjYuOTE1MDAwMjkgMTI2LjkzMDAwMDU4Yy0yNi40NiAyMC40MDAwMDAyOS01MC45MjQ5OTk3MSAyMC4zODUtNzYuODQ0OTk5NzEgMC4wMTQ5OTk0MmwtNjMuOTE1MDAwMjktNjMuMTY0OTk5NzFMMTczLjIxMDAwMDI5IDI0OC4yNTAwMDAyOSAyMjYuOTk5OTk5NzEgMTk0LjQ2MDAwMDAwMDAwMDA0bDQwMS44OTUgNDAxLjg5NWExNC45ODUgMTQuOTg1IDAgMSAwIDIxLjIxMDAwMDI5LTIxLjIxMDAwMDI5TDI0OC4yMSAxNzMuMjQ5OTk5NzFsNTQuNTQtNTQuNTQgNDAxLjg5NSA0MDEuODgwMDAwNThhMTQuOTg1IDE0Ljk4NSAwIDEgMCAyMS4yMTAwMDAyOS0yMS4yMTAwMDAyOUwzMjMuOTYwMDAwMjkgOTcuNTAwMDAwMjl6TTU4NS43MSA2ODEuOTc0OTk5NzFsMjI1LTIyNS00Mi40MzUtNDIuNDE5OTk5NzEtMjI1IDIyNXoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJ0ZXh0LWhlaWdoIiB1bmljb2RlPSImIzU4OTE1OyIgZD0iTTYyIDMwOS4wMDAwMDAyOWgxNTAuMDAwMDAwMjl2LTM3NS4wMDAwMDAyOWg3NC45OTk5OTk3MVYzMDkuMDAwMDAwMjloMTUwLjAwMDAwMDI5VjM4NEg2MnYtNzQuOTk5OTk5NzF6TTIxMC41IDgzNHYtMTUwLjAwMDAwMDI5SDU4Ni45OTk5OTk3MXYtNzQ5Ljk5OTk5OTcxaDE1MC4wMDAwMDAyOVY2ODMuOTk5OTk5NzFoMzcyLjc1MDAwMDI5VjgzNEgyMTAuNXoiICBob3Jpei1hZHYteD0iMTE5MiIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJzdHJpa2V0aHJvdWdoIiB1bmljb2RlPSImIzU5Njc4OyIgZD0iTTk0NS45Mjg1NzE2OCAzODRxNy4wMzEyNTAwMSAwIDExLjU1MTMzOTE2LTQuNTIwMDg5MTZ0NC41MjAwODkxNi0xMS41NTEzMzkxNnYtMzIuMTQyODU3NTFxMC03LjAzMTI1MDAxLTQuNTIwMDg5MTYtMTEuNTUxMzM5MTd0LTExLjU1MTMzOTE2LTQuNTIwMDg5MTdINzguMDcxNDI4MzJxLTcuMDMxMjUwMDEgMC0xMS41NTEzMzkxNiA0LjUyMDA4OTE3dC00LjUyMDA4OTE2IDExLjU1MTMzOTE1djMyLjE0Mjg1NzUzcTAgNy4wMzEyNTAwMSA0LjUyMDA4OTE2IDExLjU1MTMzOTE2dDExLjU1MTMzOTE2IDQuNTIwMDg5MTZoODY3Ljg1NzE0MzM1ek0zMDQuNTc4MTI1IDQxNi4xNDI4NTc1MXEtMTQuMDYyNSAxNy41NzgxMjUtMjUuNjEzODM5MTcgNDAuMTc4NTcwODEtMjQuMTA3MTQyNDkgNDguNzE2NTE3NDgtMjQuMTA3MTQzMzYgOTQuNDE5NjQzMzYgMCA5MC45MDQwMTc0OCA2Ny4yOTkxMDc1NCAxNTUuMTg5NzMxNjQgNjYuNzk2ODc1IDYzLjc4MzQ4MjUyIDE5Ny4zNzcyMzI1MSA2My43ODM0ODI1MyAyNS4xMTE2MDc1MiAwIDgzLjg3Mjc2NzQ5LTkuNTQyNDEwODUgMzMuMTQ3MzIxNjctNi4wMjY3ODU4MyA4OC44OTUwODkxNS0yNC4xMDcxNDI0OCA1LjAyMjMyMTY3LTE5LjA4NDgyMTY5IDEwLjU0Njg3NTAxLTU5LjI2MzM5MzM2IDcuMDMxMjUwMDEtNjEuNzc0NTUzMzIgNy4wMzEyNDk5OS05MS45MDg0ODE2NSAwLTkuMDQwMTc4MzMtMi41MTExNjA4NC0yMi42MDA0NDY2N2wtNi4wMjY3ODU4NC0xLjUwNjY5NjY5LTQyLjE4NzUgMy4wMTMzOTMzNy03LjAzMTI1IDEuMDA0NDY0MTZxLTI1LjExMTYwNzUyIDc0LjgzMjU4OTE2LTUxLjcyOTkwOTk1IDEwMi45NTc1ODkxNi00NC4xOTY0MjgzMiA0NS43MDMxMjUtMTA1LjQ2ODc1MDAxIDQ1LjcwMzEyNDk5LTU3LjI1NDQ2NDE2IDAtOTEuNDA2MjQ5OTktMjkuNjMxNjk2NjctMzMuNjQ5NTUzMzItMjkuMTI5NDY0MTYtMzMuNjQ5NTU0MjEtNzMuMzI1ODkyNDggMC0zNi42NjI5NDY2OCAzMy4xNDczMjE2OC03MC4zMTI1dDE0MC4xMjI3Njc0OC02NC43ODc5NDY2OXEzNC42NTQwMTc0OC0xMC4wNDQ2NDI0OSA4Ni44ODYxNjA4NC0zMy4xNDczMjE2NyAyOS4xMjk0NjQxNi0xNC4wNjI1IDQ3LjcxMjA1NDItMjYuMTE2MDcwODFIMzA0LjU3ODEyNXogbTI1NC42MzE2OTY2OS0xMjguNTcxNDI5MTloMjA2LjQxNzQxMDgzcTMuNTE1NjI1LTE5LjU4NzA1MzMyIDMuNTE1NjI0OTktNDYuMjA1MzU2NjQgMC01NS43NDc3Njc0OC0yMC41OTE1MTgzNS0xMDYuNDczMjE0MTUtMTEuNTUxMzM5MTYtMjcuNjIyNzY3NDgtMzUuNjU4NDgxNjUtNTIuMjMyMTQzMzgtMTguNTgyNTg5MTYtMTcuNTc4MTI1LTU0Ljc0MzMwNDE5LTQwLjY4MDgwMzMxLTQwLjE3ODU3MTY4LTI0LjEwNzE0MjQ5LTc2Ljg0MTUxNzQ4LTMzLjE0NzMyMTY4LTQwLjE3ODU3MTY4LTEwLjU0Njg3NS0xMDEuOTUzMTI1LTEwLjU0Njg3NTAxLTU3LjI1NDQ2NDE2IDAtOTcuOTM1MjY4MzUgMTEuNTUxMzM5MTdsLTcwLjMxMjUgMjAuMDg5Mjg1ODRxLTI4LjYyNzIzMjUyIDguMDM1NzE0MTUtMzYuMTYwNzE0MTcgMTQuMDYyNS00LjAxNzg1NzUxIDQuMDE3ODU3NTEtNC4wMTc4NTY2NSAxMS4wNDkxMDc1MnY2LjUyOTAxNzQ4cTAgNTQuMjQxMDcxNjgtMS4wMDQ0NjQxNSA3OC4zNDgyMTQxNS0wLjUwMjIzMjUyIDE1LjA2Njk2NDE2IDAgMzQuMTUxNzg1ODVsMS4wMDQ0NjQxNSAxOC41ODI1ODkxNnYyMi4wOTgyMTQxNmw1MS4yMjc2NzgzNCAxLjAwNDQ2NTA0cTcuNTMzNDgyNTItMTcuMDc1ODkyNDggMTUuMDY2OTY0MTYtMzUuNjU4NDgyNTF0MTEuMzAwMjIzMzMtMjguMTI1IDYuMjc3OTAxNjYtMTMuNTYwMjY3NDlxMTcuNTc4MTI1LTI4LjYyNzIzMjUyIDQwLjE3ODU3MTY4LTQ3LjIwOTgyMTY4IDIxLjU5NTk4MjUyLTE4LjA4MDM1NzUxIDUyLjczNDM3NTAxLTI4LjYyNzIzMjUyIDI5LjYzMTY5NjY4LTExLjA0OTEwNzUyIDY2LjI5NDY0MjQ3LTExLjA0OTEwNjYzIDMyLjE0Mjg1NzUxIDAgNjkuODEwMjY4MzYgMTMuNTYwMjY3NDcgMzguNjcxODc1IDEzLjA1ODAzNTg0IDYxLjI3MjMyMDggNDMuMTkxOTY0MTYgMjMuNjA0OTEwODQgMzAuNjM2MTYwODQgMjMuNjA0OTEwODQgNjQuNzg3OTQ2NjggMCA0Mi4xODc1LTQwLjY4MDgwMzMyIDc4Ljg1MDQ0NjY4LTE3LjA3NTg5MjQ4IDE0LjU2NDczMjUyLTY4LjgwNTgwMzMxIDM1LjY1ODQ4MTY0eiIgIGhvcml6LWFkdi14PSIxMDI0IiAvPgoKICAgIAogICAgPGdseXBoIGdseXBoLW5hbWU9ImJvbGQiIHVuaWNvZGU9IiYjNTkwNDE7IiBkPSJNNTk3LjMzMzMzMyAzNDEuMzMzMzMzMDAwMDAwMDRIMjU2Yy0yNS42IDAtNDIuNjY2NjY3IDE3LjA2NjY2Ny00Mi42NjY2NjcgNDIuNjY2NjY3VjcyNS4zMzMzMzNjMCAyNS42IDE3LjA2NjY2NyA0Mi42NjY2NjcgNDIuNjY2NjY3IDQyLjY2NjY2N2gzNDEuMzMzMzMzYzExOS40NjY2NjcgMCAyMTMuMzMzMzMzLTkzLjg2NjY2NyAyMTMuMzMzMzM0LTIxMy4zMzMzMzNzLTkzLjg2NjY2Ny0yMTMuMzMzMzMzLTIxMy4zMzMzMzQtMjEzLjMzMzMzNHogbS0yOTguNjY2NjY2IDg1LjMzMzMzNGgyOTguNjY2NjY2YzcyLjUzMzMzMyAwIDEyOCA1NS40NjY2NjcgMTI4IDEyOHMtNTUuNDY2NjY3IDEyOC0xMjggMTI4SDI5OC42NjY2Njd2LTI1NnpNNjQwIDBIMjU2Yy0yNS42IDAtNDIuNjY2NjY3IDE3LjA2NjY2Ny00Mi42NjY2NjcgNDIuNjY2NjY3djM0MS4zMzMzMzNjMCAyNS42IDE3LjA2NjY2NyA0Mi42NjY2NjcgNDIuNjY2NjY3IDQyLjY2NjY2N2gzODRjMTE5LjQ2NjY2NyAwIDIxMy4zMzMzMzMtOTMuODY2NjY3IDIxMy4zMzMzMzMtMjEzLjMzMzMzNHMtOTMuODY2NjY3LTIxMy4zMzMzMzMtMjEzLjMzMzMzMy0yMTMuMzMzMzMzeiBtLTM0MS4zMzMzMzMgODUuMzMzMzMzaDM0MS4zMzMzMzNjNzIuNTMzMzMzIDAgMTI4IDU1LjQ2NjY2NyAxMjggMTI4cy01NS40NjY2NjcgMTI4LTEyOCAxMjhIMjk4LjY2NjY2N3YtMjU2eiIgIGhvcml6LWFkdi14PSIxMDI0IiAvPgoKICAgIAogICAgPGdseXBoIGdseXBoLW5hbWU9ImxpbmUtaGVpZ2h0IiB1bmljb2RlPSImIzU5MTkwOyIgZD0iTTQ2OS4zMzMzMzMgNzI1LjMzMzMzM2g0MjYuNjY2NjY3di04NS4zMzMzMzNINDY5LjMzMzMzM1Y3MjUuMzMzMzMzek0yNTYgNTk3LjMzMzMzM3YtMTcwLjY2NjY2NkgxNzAuNjY2NjY3VjU5Ny4zMzMzMzNINDIuNjY2NjY3bDE3MC42NjY2NjYgMTcwLjY2NjY2NyAxNzAuNjY2NjY3LTE3MC42NjY2NjdIMjU2eiBtMC00MjYuNjY2NjY2aDEyOGwtMTcwLjY2NjY2Ny0xNzAuNjY2NjY3LTE3MC42NjY2NjYgMTcwLjY2NjY2N2gxMjh2MTcwLjY2NjY2Nmg4NS4zMzMzMzN2LTE3MC42NjY2NjZ6IG0yMTMuMzMzMzMzLTQyLjY2NjY2N2g0MjYuNjY2NjY3di04NS4zMzMzMzNINDY5LjMzMzMzM3Y4NS4zMzMzMzN6IG0tODUuMzMzMzMzIDI5OC42NjY2NjdoNTEydi04NS4zMzMzMzRIMzg0djg1LjMzMzMzNHoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJzb3VuZC1jb2RlIiB1bmljb2RlPSImIzU4ODk0OyIgZD0iTTg3OS42MzI3NTE0NiA0MzcuMjI4NzU5NzdMNzE2LjkxNDI0NTYgNTk5Ljk0NzI2NTYzbC01NC4yMzQwMDg3OC01NC4yNDIyNDg1NCAxNjIuNzEwMjY2MTEtMTYyLjcxMDI2NjExTDY2Mi42ODAyMzY4MiAyMjAuMjc2MjQ1MTFsNTQuMjM0MDA4NzgtNTQuMjM0MDA4NzggMTYyLjcxODUwNTg2IDE2Mi43MTAyNjYxMSA1NC4yNDIyNDg1NCA1NC4yNDIyNDg1M3pNMzA3LjA3NzUxNDY0IDU5OS45NDcyNjU2M0wxNDQuMzU5MDA4NzggNDM3LjIyODc1OTc3IDkwLjEyNSAzODIuOTk0NzUwOTcwMDAwMDRsNTQuMjM0MDA4NzktNTQuMjQyMjQ4NTNMMzA3LjA3NzUxNDY0IDE2Ni4wNDIyMzYzMzAwMDAwNGw1NC4yMzQwMDg4IDU0LjIzNDAwODc5LTE2Mi43MTAyNjYxMiAxNjIuNzE4NTA1ODUgMTYyLjcxMDI2NjEyIDE2Mi43MTAyNjYxMnpNMzcyLjk1MTgxMjc0IDIzLjUyNTExNTk3TDU3Ny4wNjEwMzUxNiA3NjIuODcxNzY1MTNsNzMuOTI3MDAxOTUtMjAuNDA4MjAzMTItMjA0LjEwOTIyMjQyLTczOS4zNDgyOTcxMnoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJpdGFsaWMiIHVuaWNvZGU9IiYjNTg4OTU7IiBkPSJNNzMyLjU4NjI0MjY4IDY5OC45ODA3NzM5Mjk5OTk5Vjc2OS40ODAwNDE1MUg1MjEuMDg4NDM5OTR2LTcwLjQ5OTI2NzU4aDU4LjM2MjEyMTU4TDM4OS4xMzcxNDU5OSA2NS40NDMxNzYyNjk5OTk5OGgtNzkuNTQ2NTA4Nzh2LTcwLjQ5OTI2NzU4aDIxMS40OTc4MDI3M3Y3MC40OTkyNjc1OEg0NjIuNzI2MzE4MzZsMTkwLjMyMTY1NTI4IDYzMy41Mzc1OTc2NnoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKCgogIDwvZm9udD4KPC9kZWZzPjwvc3ZnPgo=) format(\'svg\');  /* iOS 4.1- */}.w-e-icon {  font-family: "w-e-icon" !important;  font-size: 18px;  font-style: normal;  -webkit-font-smoothing: antialiased;  -moz-osx-font-smoothing: grayscale;}.w-e-icon-font:before {  content: "\\e7a0";}.w-e-icon-happy:before {  content: "\\e7a8";}.w-e-icon-image:before {  content: "\\e7bc";}.w-e-icon-listnumbered:before {  content: "\\e7ee";}.w-e-icon-paint-brush:before {  content: "\\e653";}.w-e-icon-quotesleft:before {  content: "\\e81b";}.w-e-icon-table2:before {  content: "\\e87e";}.w-e-icon-iframe:before {  content: "\\e74c";}.w-e-icon-list2:before {  content: "\\e601";}.w-e-icon-format:before {  content: "\\e65b";}.w-e-icon-link:before {  content: "\\e632";}.w-e-icon-terminal:before {  content: "\\e6a6";}.w-e-icon-undo:before {  content: "\\e65a";}.w-e-icon-paragraph-right:before {  content: "\\e756";}.w-e-icon-paragraph-left:before {  content: "\\e757";}.w-e-icon-paragraph-center:before {  content: "\\e600";}.w-e-icon-header:before {  content: "\\e6e2";}.w-e-icon-underline:before {  content: "\\e628";}.w-e-icon-Play:before {  content: "\\eb78";}.w-e-icon-redo:before {  content: "\\ed8a";}.w-e-icon-pencil2:before {  content: "\\e652";}.w-e-icon-text-heigh:before {  content: "\\e623";}.w-e-icon-strikethrough:before {  content: "\\e91e";}.w-e-icon-bold:before {  content: "\\e6a1";}.w-e-icon-line-height:before {  content: "\\e736";}.w-e-icon-sound-code:before {  content: "\\e60e";}.w-e-icon-italic:before {  content: "\\e60f";}.w-e-toolbar {  display: -ms-flexbox;  display: flex;  padding: 0 5px;  /* flex-wrap: wrap; */  /* 单个菜单 */}.w-e-toolbar .w-e-menu {  position: relative;  text-align: center;  padding: 5px 10px;  cursor: pointer;}.w-e-toolbar .w-e-menu i {  color: #999;}.w-e-toolbar .w-e-menu:hover i {  color: #333;}.w-e-toolbar .w-e-active i {  color: #1e88e5;}.w-e-toolbar .w-e-active:hover i {  color: #1e88e5;}.w-e-text-container .w-e-panel-container {  position: absolute;  top: 0;  left: 50%;  border: 1px solid #ccc;  border-top: 0;  box-shadow: 1px 1px 2px #ccc;  color: #333;  background-color: #fff;  /* 为 emotion panel 定制的样式 */  /* 上传图片的 panel 定制样式 */}.w-e-text-container .w-e-panel-container .w-e-panel-close {  position: absolute;  right: 0;  top: 0;  padding: 5px;  margin: 2px 5px 0 0;  cursor: pointer;  color: #999;}.w-e-text-container .w-e-panel-container .w-e-panel-close:hover {  color: #333;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-title {  list-style: none;  display: -ms-flexbox;  display: flex;  font-size: 14px;  margin: 2px 10px 0 10px;  border-bottom: 1px solid #f1f1f1;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-title .w-e-item {  padding: 3px 5px;  color: #999;  cursor: pointer;  margin: 0 3px;  position: relative;  top: 1px;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-title .w-e-active {  color: #333;  border-bottom: 1px solid #333;  cursor: default;  font-weight: 700;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content {  padding: 10px 15px 10px 15px;  font-size: 16px;  /* 输入框的样式 */  /* 按钮的样式 */}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content input:focus,.w-e-text-container .w-e-panel-container .w-e-panel-tab-content textarea:focus,.w-e-text-container .w-e-panel-container .w-e-panel-tab-content button:focus {  outline: none;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content textarea {  width: 100%;  border: 1px solid #ccc;  padding: 5px;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content textarea:focus {  border-color: #1e88e5;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content input[type=text] {  border: none;  border-bottom: 1px solid #ccc;  font-size: 14px;  height: 20px;  color: #333;  text-align: left;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content input[type=text].small {  width: 30px;  text-align: center;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content input[type=text].block {  display: block;  width: 100%;  margin: 10px 0;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content input[type=text]:focus {  border-bottom: 2px solid #1e88e5;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content .w-e-button-container button {  font-size: 14px;  color: #1e88e5;  border: none;  padding: 5px 10px;  background-color: #fff;  cursor: pointer;  border-radius: 3px;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content .w-e-button-container button.left {  float: left;  margin-right: 10px;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content .w-e-button-container button.right {  float: right;  margin-left: 10px;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content .w-e-button-container button.gray {  color: #999;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content .w-e-button-container button.red {  color: #c24f4a;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content .w-e-button-container button:hover {  background-color: #f1f1f1;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content .w-e-button-container:after {  content: "";  display: table;  clear: both;}.w-e-text-container .w-e-panel-container .w-e-emoticon-container .w-e-item {  cursor: pointer;  font-size: 18px;  padding: 0 3px;  display: inline-block;  *display: inline;  *zoom: 1;}.w-e-text-container .w-e-panel-container .w-e-up-img-container {  text-align: center;}.w-e-text-container .w-e-panel-container .w-e-up-img-container .w-e-up-btn {  display: inline-block;  *display: inline;  *zoom: 1;  color: #999;  cursor: pointer;  font-size: 60px;  line-height: 1;}.w-e-text-container .w-e-panel-container .w-e-up-img-container .w-e-up-btn:hover {  color: #333;}.w-e-text-container {  position: relative;}.w-e-text-container .w-e-progress {  position: absolute;  background-color: #1e88e5;  bottom: 0;  left: 0;  height: 1px;}.w-e-text {  padding: 10px;  overflow-y: scroll;}.w-e-text p,.w-e-text h1,.w-e-text h2,.w-e-text h3,.w-e-text h4,.w-e-text h5,.w-e-text table,.w-e-text pre {  line-height: 1.5;}.w-e-text ul,.w-e-text ol {  margin: 10px 0 10px 20px;}.w-e-text blockquote {  display: block;  border-left: 8px solid #d0e5f2;  padding: 5px 10px;  margin: 10px 0;  line-height: 1.4;  font-size: 100%;  background-color: #f1f1f1;}.w-e-text code {  display: inline-block;  *display: inline;  *zoom: 1;  background-color: #f1f1f1;  border-radius: 3px;  padding: 3px 5px;  margin: 0 3px;}.w-e-text pre code {  display: block;}.w-e-text table {  border-top: 1px solid #ccc;  border-left: 1px solid #ccc;}.w-e-text table td,.w-e-text table th {  border-bottom: 1px solid #ccc;  border-right: 1px solid #ccc;  padding: 3px 5px;}.w-e-text table th {  border-bottom: 2px solid #ccc;  text-align: center;}.w-e-text:focus {  outline: none;}.w-e-text img {  cursor: pointer;}.w-e-text img:hover {  box-shadow: 0 0 5px #333;}';

// 将 css 代码添加到 <style> 中
var style = document.createElement('style');
style.type = 'text/css';
style.innerHTML = inlinecss;
document.getElementsByTagName('HEAD').item(0).appendChild(style);

// 返回
var index = window.wangEditor || Editor;

return index;

})));
