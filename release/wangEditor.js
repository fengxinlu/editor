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
        var $textElem = editor.$textElem;
        var $soundCodeElem = editor.$soundCodeElem; // 获取源码编辑器
        var htmlEditFlag = $soundCodeElem[0].style.display; // 记录编辑器是否处于编辑状态
        var editorContent = editor.txt.html(); // 获取文本源码
        var editorValue = $soundCodeElem[0].value; // 获取源码容器内源码value(string)
        if (htmlEditFlag === 'none') {
            $soundCodeElem[0].value = editorContent;
            $soundCodeElem.css('display', 'block');
            $textElem.css('display', 'none');
            this._menusControl(false);
        } else {
            editor.txt.html(editorValue);
            $soundCodeElem.css('display', 'none');
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

/*
    编辑器构造函数
*/

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
        $soundCodeElem = $('<textarea></textarea>');
        $soundCodeElem.css('display', 'none').css('width', '100%').css('height', '100%').css('outline', 'none').css('line-height', '2.5');

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
var inlinecss = '.w-e-toolbar,.w-e-text-container,.w-e-menu-panel {  padding: 0;  margin: 0;  box-sizing: border-box;}.w-e-toolbar *,.w-e-text-container *,.w-e-menu-panel * {  padding: 0;  margin: 0;  box-sizing: border-box;}.w-e-clear-fix:after {  content: "";  display: table;  clear: both;}.w-e-soundCode {  border: none;  padding: 0 10px;  font-size: 16px;}.w-e-toolbar .w-e-droplist {  position: absolute;  left: 0;  top: 0;  background-color: #fff;  border: 1px solid #f1f1f1;  border-right-color: #ccc;  border-bottom-color: #ccc;}.w-e-toolbar .w-e-droplist .w-e-dp-title {  text-align: center;  color: #999;  line-height: 2;  border-bottom: 1px solid #f1f1f1;  font-size: 13px;}.w-e-toolbar .w-e-droplist ul.w-e-list {  list-style: none;  line-height: 1;}.w-e-toolbar .w-e-droplist ul.w-e-list li.w-e-item {  color: #333;  padding: 5px 0;}.w-e-toolbar .w-e-droplist ul.w-e-list li.w-e-item:hover {  background-color: #f1f1f1;}.w-e-toolbar .w-e-droplist ul.w-e-block {  list-style: none;  text-align: left;  padding: 5px;}.w-e-toolbar .w-e-droplist ul.w-e-block li.w-e-item {  display: inline-block;  *display: inline;  *zoom: 1;  padding: 3px 5px;}.w-e-toolbar .w-e-droplist ul.w-e-block li.w-e-item:hover {  background-color: #f1f1f1;}@font-face {  font-family: "w-e-icon";  src: url(data:application/x-font-eot;charset=utf-8;base64,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);  /* IE9 */  src: url(data:application/x-font-eot;charset=utf-8;base64,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) format(\'embedded-opentype\'), /* IE6-IE8 */ url(\'data:application/x-font-woff2;charset=utf-8;base64,d09GMgABAAAAAAvcAAsAAAAAFnwAAAuOAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHEIGVgCHBAqZOJQ8ATYCJANwCzoABCAFhG0Hgk8b/RIjEaZ0VZbsrxJ4GTrLFzMQJUJw8PTETZzA4YwYZttHx5cR17bmV2LGM8Hz//t920fe8+8+CfMGjUqisaaxOqFrgtSIRK+EovHe0cSizueB/2Pv/ZkDmn7a8VEC7XxaVOgDGniUQJR+Hw3XVh0AP/9t2p/LIAmDRInVDOpUPWbMME1InEDNh032lWE1nVkNFlPiFVWaImuRsk80zfOvTfzeqWYuAAWInRfD0C7azWX7a1Szp8sqgID/2+9XFbMoOnhoHE4ndX1vvl7eDHDxQX3FLdK2RDFMLW4WSymv2XD2w0yggYrnOjEZHwJKS1dIR1cqATmnOxMgM5PGYshzmbzGUeSpqdBvPJX3JOTRt9oA3oU/Xh65FclBJTH0hJ4836GHRwHOWQv7QI8FwvIE0OoPDFwBDm0RK6SGxXAlVErp4N0F16y55o2EVtiFeUEdNEEXWoIrBOK9mBqp2By74s04ejQ7Onk85dR0zu7/AwTZtHGzQ24stA9LXyiuueGWiXvHvZgf/FcetBWmZoa6KgOJhtJYrWMi19QilHGpzEhPH5IEF9YA6VaNMwRggjYCIigQZARTBLkKbCaQIdg8IF0wNZAKLBvIAEwDJAHLBdIA0wEpwVqAjMFcQGqwAAg6iCsJJoipBDmilqCJSCEtsGYgAtYFRMFuAjGwURA4juKQNGQnQZDheArBCKcmgh7O2WvoA5i7fh6AZ2Dn4Ndo/lsViORaBDVQEo3B2kIYFWRE5NJydEmeNNc6cFGknSLzeKR1XXUGA5enaK3fH0/qcXvoee6rqaW5N9udpXXdJhW17d2VVmHQswXJvNydk4S+7Iv3eIB5hTtqp/j9CQ2/EIDrcEpMXXo0+9Ib6mKp30/5fFqPh/B6C30gIzl7nt+fw/lTOp0+82otZ7h+po89XUobWmFBfJngoIztiubXdONyrjdOUNsjJupvsrctd7hbOTKky8GpUilIMC7VghgZkQN4CFQsAQEcQzzyih52nv6ad6Gx16Jv9cU/9ExDHk8i/ozctDTjJkFs7iOB9ay3RTvlFScK+aGCQ0u10AGIma4MDgJQHw6FhnI6zZVFIEE8JIWicl2oBEnRFsLeNgf+efZYztzgrvVDvZsdINKVoB1sxDEbE0naO3Ap1xlldFoUelu7WMK6FNkOSxTl5OSxMRFHiS52wDKfclp62AjCzXg5DQY0DrCZhI3p5qKoG9xbZp5X9MCin4zSCIwIWRTI4HC1d1XXRJbpbQ31LSGjs1jCdgEw3WudcW8cqu3RldmvxCG/l7R3op8CBKq9HKG3MRViAa7fMbpzHe/kyZEMyVEhzhfv3cmOi0AOMpBjpTiIMQZ9ETZNBrrasVEgRUYpZunluoHPdLE9CJPwQkVQ7qkUlULuJ2IWYTiPwbkAack5Ad6pAWl/pTCfb2eRjVWwDoRZojhnZLGdqTA4ImwAnh8IYOyRzri2X6kIcfuhO81pcVCk2MiTGqDpGKk3aeS9zXqbWItrAXAVlWU8s0h7fXWmXqGTO6jacG5acr1Wh/NwDEcSHUj5uECKKjg7AGMThyzoNCdO1caex/D9OLfjUlLN5BZgIiJWKnyq22LWA4yXrBhdx2wCrwFmSfW8rtVXl18Usyu1LsV8c411xMWhhMkx9sjuW89wzv8AWTa6jkpcPbFYXS8uvQrrSqRP/DOv2grJbgkrxTSXXlcpxPXYAkXuxAktjnCy1HyuHGQV2kySyKIOEEHLGi2VX0jm0UgMeB5vHxIXvvnjSHowtGL11tJVKctXfi2EfQmazFAj/jsy7A9pR76dmlc365zw2dlQLiTlK5iQNGBuN9ZgJCfb29LT6sy87m4e9GYl4zbV3K5Nx6cuDC5lzHk8U8swwSUL851+dH6yc55znWOeI3JyPBlYFXYTwBQwvV8eUAwKTcJBRdiw6wp6uU1NYPl7054r6waEK640QKvTnec+wsNh2euLuEWLF348K38xt0enmp23KCjt+zO3WMlKds3D8n/9cD3pOZ/v3rpV6i1PX9KBc9j27UuWbNseDrBt8wEzKtwKRt6pUzwDYIFsdPAA0kACZDfhQNovjrkGhzqxw2vKlPTovYBYkIzkHtPUug8NuVqEnLFAakD2Y+NA4wq+7G1H00DTiqZ3qu5d4ztZg4WBDL4XNi3kjc1Awp/cn7mH15l2KYOLzRnXjV0ck4xcHFm/SwtofbB3/Dr/a2RObPk19bXyWIU6XY1GM/YxFcMF2/9JOZmaskO+48hhUhF0MEhIfvLJ9qalS1s3KUhBkjjT7yfkhNcXjxiiwVo1kfMhZ+L7quro0OjKqqpQtriYE1o0xUDM5MvAhlRZ6b6eDkYnz/mQO15VVRmNYiqtVf9kP0vXaCpnUGMGMGgGUIyDWl3T0TlTd6obx2XyD6LBeb8Vmx0//5fKcFNYaBgdXsm7jkKRCQx9EeF/l2AdXNDg53vv7tZKVCfKz6SGtGHSv0dEmKJgJciVAeU/s5qUJ3wnVE2vDMr9qu2+7UpoGpMcrzap6pRNjRuUrXTVfpwxYV/89WKXMvTOMSH6zl/vjBZ/VZx3wvVX16LrXyV9BVR35uwweiYd1uienJ2bPghw9b8xtaIc/jL8/5S+93K17ezhdBj/33g22r8fZe/ypeCNbEQ9tjHSC9uCMX68YBfOCA6Hesc8BDZ9PzCobies4hsTEb8Z0SW+4MtDY2AJ//lu+E1BoqCdGCSnrxKuAmdxcnLKiOy9sFL4XrSsvm7L5q/qP/nk6rNfftku/Hbyvv7+fVuj6fqZO9zuP3pPnjxQMP799yTVbscrJctJXwZcJolrucsjI92IABuWO+gU2tGz7Z7DNOoYPe6AddMZUaVoGnN9+E0Fpr69dGiR7nPzpzE1kcVbqf1TghdmVhVFJ/fe3LBm25oFs7ds3TNVufLV/BPmNzPjVqlv0NNX0onlG9dwO8KflC0TiVaKZDyeYtqvN5Qz8YcXZ09Lifn7DNVnUiAIcpqBR2KGcFKHaBrlIp277HON6lB8vEhIwzisInqYcANG8gzTGB06QSOrz6XLzmaTh+PjhSLq9hAJHk8v2etR9ZA9THePzjN3M8qiu0chK7sjzKAFWIUutbaSLa0tqP/hhyM/tAaq7Gl48ItAUgS3Cr9cj/fEr731UUb8O2obzBMTY1qA1fRf03S56Z4+5fkUml7o97qihh5NY/zqfKkXfBHOh3rvvKkffFDShk7r0Xdv/dEv/o2U82lD7N+d5cSGFfN1x16PtZHPn52bSlAoHsKO9vSb/Zdemf4rtsfdkdy4Q3nr/6DcL+VbP4s+zki7vAJyrQxkSfQ/MMMPKNfrQ63Omsf79+DniUgPBc9xANXafeYOKRsUlOlt/4ElXX+3kQ+mVv8h80HqpzILP5M7MHTTK36Jyh2/VO6hX+myxwNXel5gJF4Al7z0/ETbBz/V9AlMMv0BDtM/fomhc30K24j5lZ5K0zArk825e/VEkIxetA9huxSVfxavbhWqzMWf0Bcvqa0Na39BxaJanBYtKZ58QwQto4dy1Q2zEopSEK8Lmxi8TyJT+kPHtWHO5+Nig6SvMdIwWG0jSEYvtA8X3XYpqit5RVfAWvH7f0JfvKSau+bhF4IKKAqE08/7XacwfFPiVHfdlivLVTfYCCX4RkpBeN06AU8NSchyW3/ouGbmqMtnR3qamlap18vDLcK5EO+h+57niYlLIqlkkkvxm0E/gun3b4/tocOGjxhZMep7spWx40462eRo7/bUyJwfUxukxsbbwvESWhD6dZY2ctXSpZjV/yUxiofiGcvWo5ntViQDplNPv5kZEgXJE2+jWzAo2Cj95BL7tM+SpPbflU1FVhve5emCHjv0RIc41xUzA9mDlm0ELepMTN69fEw2pec0z4id9c3qGO5cGWBU28JkHdhQumgzaZPv1zOoa8p4VdIyeqm61GNmWXrbDQYA\') format(\'woff2\'), url(data:application/x-font-woff;charset=utf-8;base64,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) format(\'woff\'), url(data:application/x-font-ttf;charset=utf-8;base64,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1gFV/oATFwEBFxMBgFx3AgJ3/k8BVThHAQFHOP6rAVUBFxMBVRQXAnhbXHhUAUc4N0cC/VUXFAFVExcBAnhcW3hTAkc3OEcBAAUAAAAAA4ADAAADAAoAEQAVABkAAAEhFSEHFSM1IzcXAzMHJzM1MxchFSEDIRUhAdUBq/5V1VWAqquAgKuqgFXVAav+VVUCAP4AAtVVK6qqq6v+VqurqtVVAYBWAAAAAAMAAAAAA6YC+wAGAA0AEQAAAScHFwcXNyUPARc3JzcbARcDA3CjNqKiNtn9jaM22TaiogzMSswBtaM2o6M22dmjNtk2o6P99gLjFf0dAAAAAQAA//oC3QMCAAsAAAE1IxUzAyMVMzUjEwLd1Dq+T9M6vgK7Rkb9hkZGAnoAAAAAAAASAN4AAQAAAAAAAAAVAAAAAQAAAAAAAQAIABUAAQAAAAAAAgAHAB0AAQAAAAAAAwAIACQAAQAAAAAABAAIACwAAQAAAAAABQALADQAAQAAAAAABgAIAD8AAQAAAAAACgArAEcAAQAAAAAACwATAHIAAwABBAkAAAAqAIUAAwABBAkAAQAQAK8AAwABBAkAAgAOAL8AAwABBAkAAwAQAM0AAwABBAkABAAQAN0AAwABBAkABQAWAO0AAwABBAkABgAQAQMAAwABBAkACgBWARMAAwABBAkACwAmAWkKQ3JlYXRlZCBieSBpY29uZm9udAp3LWUtaWNvblJlZ3VsYXJ3LWUtaWNvbnctZS1pY29uVmVyc2lvbiAxLjB3LWUtaWNvbkdlbmVyYXRlZCBieSBzdmcydHRmIGZyb20gRm9udGVsbG8gcHJvamVjdC5odHRwOi8vZm9udGVsbG8uY29tAAoAQwByAGUAYQB0AGUAZAAgAGIAeQAgAGkAYwBvAG4AZgBvAG4AdAAKAHcALQBlAC0AaQBjAG8AbgBSAGUAZwB1AGwAYQByAHcALQBlAC0AaQBjAG8AbgB3AC0AZQAtAGkAYwBvAG4AVgBlAHIAcwBpAG8AbgAgADEALgAwAHcALQBlAC0AaQBjAG8AbgBHAGUAbgBlAHIAYQB0AGUAZAAgAGIAeQAgAHMAdgBnADIAdAB0AGYAIABmAHIAbwBtACAARgBvAG4AdABlAGwAbABvACAAcAByAG8AagBlAGMAdAAuAGgAdAB0AHAAOgAvAC8AZgBvAG4AdABlAGwAbABvAC4AYwBvAG0AAAAAAgAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAQIBAwEEAQUBBgEHAQgBCQEKAQsBDAENAQ4BDwEQAREBEgETARQBFQEWARcBGAEZARoBGwEcAR0ABGZvbnQFaGFwcHkFaW1hZ2UMbGlzdG51bWJlcmVkC3BhaW50LWJydXNoCnF1b3Rlc2xlZnQGdGFibGUyBmlmcmFtZQVsaXN0MgZmb3JtYXQEbGluawh0ZXJtaW5hbAR1bmRvD3BhcmFncmFwaC1yaWdodA5wYXJhZ3JhcGgtbGVmdBBwYXJhZ3JhcGgtY2VudGVyBmhlYWRlcgl1bmRlcmxpbmUEUGxheQRyZWRvB3BlbmNpbDIKdGV4dC1oZWlnaA1zdHJpa2V0aHJvdWdoBGJvbGQLbGluZS1oZWlnaHQKc291bmQtY29kZQZpdGFsaWMAAAA=) format(\'truetype\'), /* chrome, firefox, opera, Safari, Android, iOS 4.2+ */ url(data:application/x-font-svg;charset=utf-8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pgo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiID4KPCEtLQoyMDEzLTktMzA6IENyZWF0ZWQuCi0tPgo8c3ZnPgo8bWV0YWRhdGE+CkNyZWF0ZWQgYnkgaWNvbmZvbnQKPC9tZXRhZGF0YT4KPGRlZnM+Cgo8Zm9udCBpZD0idy1lLWljb24iIGhvcml6LWFkdi14PSIxMDI0IiA+CiAgPGZvbnQtZmFjZQogICAgZm9udC1mYW1pbHk9InctZS1pY29uIgogICAgZm9udC13ZWlnaHQ9IjUwMCIKICAgIGZvbnQtc3RyZXRjaD0ibm9ybWFsIgogICAgdW5pdHMtcGVyLWVtPSIxMDI0IgogICAgYXNjZW50PSI4OTYiCiAgICBkZXNjZW50PSItMTI4IgogIC8+CiAgICA8bWlzc2luZy1nbHlwaCAvPgogICAgCiAgICA8Z2x5cGggZ2x5cGgtbmFtZT0iZm9udCIgdW5pY29kZT0iJiM1OTI5NjsiIGQ9Ik03MjAuMjc5MzU3OTEgNzQzLjA1NjgyMzczYy02NS41NTU0MTk5MiAwLTEwNy42MzI1MDczMiAxMS43MzE3NTA0OS0xNzUuMTQ1NjkwOTEgMTEuNzMxNzUwNDktMjE4LjE4NjgyODYyIDAtMzE5Ljk0NjA0NDkyLTEyNC4yNTg2NjctMzE5Ljk0NjA0NDkyLTI1MC40NzUwOTc2NiAwLTc0LjM2NTM1NjQ1IDM1LjIyNDkxNDU1LTk4LjgyMjU3MDggMTA0LjY5NTg2MTgtOTguODIyNTcwOC00Ljg5NDQwOTE4IDEwLjc2NzcwMDItMTMuNzA0MzQ1NyAyMi41MTQyODIyMy0xMy43MDQzNDU3IDc1LjM0NDIzODI4IDAgMTQ3LjczNjk5OTUxIDU1Ljc2NjYwMTU2IDE5MC43OTI5Njg3NSAxMjcuMTk1MzEyNSAxOTMuNzI5NjE0MjYgMCAwLTU4LjU5OTQyNjI3LTU3NC41NTkxNDMwNy0yMjguNjg3NTYxMDMtNjQzLjQ4MTMyMzI0bDAtMTcuODcyMDA5MjggMjI5LjI4MDgyMjc1IDAgNzguMjM2Mzg5MTYgMzcwLjc4ODU3NDIyIDE0My4yNzI3MDUwOCAwIDMxLjkxNzQ4MDQ3IDkyLjY5NzE0MzU2LTE1NS42NDIyMTE5MSAwIDM3LjYxMjc5Mjk3IDE3OC4yODk5NzgwMmM0My4wNTU5NjkyNC04LjgwOTkzNjUyIDg1LjExODIyNTEtMTcuNjA1MDQxNTEgMTIxLjMyMjAyMTQ4LTE3LjYwNTA0MTUgNDUuMDEzNzMyOTEgMCA4Ni4wOTcxMDY5MyAxMy43MDQzNDU3IDEwOC42MTEzODkxNiAxMTcuNDA2NDk0MTQtMjcuMzkzODU5ODctOC44MDk5MzY1Mi01Ni43NDU0ODMzOS0xMS43MzE3NTA0OS04OS4wMzM3NTI0NC0xMS43MzE3NTA0OXoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJoYXBweSIgdW5pY29kZT0iJiM1OTMwNDsiIGQ9Ik01MTIgMTMuMjExNDI1NzgwMDAwMDEzYzIwNC43NzkxMTM3NyAwIDM3MC43ODg1NzQyMiAxNjYuMDA5NDYwNDUgMzcwLjc4ODU3NDIyIDM3MC43ODg1NzQyMnMtMTY2LjAwOTQ2MDQ1IDM3MC43ODg1NzQyMi0zNzAuNzg4NTc0MjIgMzcwLjc4ODU3NDIyLTM3MC43ODg1NzQyMi0xNjYuMDA5NDYwNDUtMzcwLjc4ODU3NDIyLTM3MC43ODg1NzQyMiAxNjYuMDA5NDYwNDUtMzcwLjc4ODU3NDIyIDM3MC43ODg1NzQyMi0zNzAuNzg4NTc0MjJ6TTUxMiA2ODUuMjU4MzAwNzhjMTY2LjM4MDI0OTAzIDAgMzAxLjI3MzEzMjMyLTEzNC44NzgwNTE3NiAzMDEuMjczMTMyMzItMzAxLjI3MzEzMjMycy0xMzQuODc4MDUxNzYtMzAxLjI3MzEzMjMyLTMwMS4yNzMxMzIzMi0zMDEuMjczMTMyMzMtMzAxLjI3MzEzMjMyIDEzNC44NzgwNTE3Ni0zMDEuMjczMTMyMzIgMzAxLjI3MzEzMjMzIDEzNC44NzgwNTE3NiAzMDEuMjczMTMyMzIgMzAxLjI3MzEzMjMyIDMwMS4yNzMxMzIzMnpNNTEyIDMyMS4xNzM1ODM5OGM4My45NzYxOTYyOCAwIDE2My44MjkyMjM2NCAyMi4zMDY2NDA2MyAyMzEuNzQyODU4ODggNjEuNDkxNTc3MTYtMTAuNTYwMDU4NTktMTI5LjIyNzIzMzg4LTExMC44OTU0NDY3OC0yMzAuNDA4MDIwMDItMjMxLjc0Mjg1ODg4LTIzMC40MDgwMjAwMnMtMjIxLjE4MjgwMDI5IDEwMS4yOTk0Mzg0OC0yMzEuNzQyODU4ODggMjMwLjUxMTg0MDgxYzY3LjkxMzYzNTI2LTM5LjE4NDkzNjUzIDE0Ny43NjY2NjI2LTYxLjYxMDIyOTQ5IDIzMS43NDI4NTg4OC02MS42MTAyMjk0OXpNMzI2LjYwNTcxMjg5IDQ5OS44NjQwMTM2N2MwIDM4LjM5ODg2NDc0IDIwLjc0OTMyODYyIDY5LjUzMDI3MzQ0IDQ2LjM0ODU3MTc4IDY5LjUzMDI3MzQ0czQ2LjM0ODU3MTc3LTMxLjEzMTQwODY5IDQ2LjM0ODU3MTc4LTY5LjUzMDI3MzQ0YzAtMzguMzk4ODY0NzQtMjAuNzQ5MzI4NjItNjkuNTMwMjczNDQtNDYuMzQ4NTcxNzgtNjkuNTMwMjczNDRzLTQ2LjM0ODU3MTc3IDMxLjEzMTQwODY5LTQ2LjM0ODU3MTc4IDY5LjUzMDI3MzQ0ek02MDQuNjk3MTQzNTYgNDk5Ljg2NDAxMzY3YzAgMzguMzk4ODY0NzQgMjAuNzQ5MzI4NjIgNjkuNTMwMjczNDQgNDYuMzQ4NTcxNzcgNjkuNTMwMjczNDRzNDYuMzQ4NTcxNzctMzEuMTMxNDA4NjkgNDYuMzQ4NTcxNzgtNjkuNTMwMjczNDRjMC0zOC4zOTg4NjQ3NC0yMC43NDkzMjg2Mi02OS41MzAyNzM0NC00Ni4zNDg1NzE3OC02OS41MzAyNzM0NHMtNDYuMzQ4NTcxNzcgMzEuMTMxNDA4NjktNDYuMzQ4NTcxNzggNjkuNTMwMjczNDR6IiAgaG9yaXotYWR2LXg9IjEwMjQiIC8+CgogICAgCiAgICA8Z2x5cGggZ2x5cGgtbmFtZT0iaW1hZ2UiIHVuaWNvZGU9IiYjNTkzMjQ7IiBkPSJNODgxLjAzOTM3NSA3MDAuNDA2MjVjMC4wMzM3NS0wLjAzMzc1IDAuMDY3NS0wLjA2NzUgMC4xMDEyNS0wLjEwMTI1bDAtNjMyLjYyNjg3NWMtMC4wMzM3NS0wLjAzMzc1LTAuMDY3NS0wLjA2NzUtMC4xMDEyNS0wLjEwMTI1bC03MzguMDk1NjI1IDBjLTAuMDMzNzUgMC4wMzM3NS0wLjA2NzUgMC4wNjc1LTAuMTAxMjUgMC4xMDEyNWwwIDYzMi42MjY4NzVjMC4wMzM3NSAwLjAzMzc1IDAuMDY3NSAwLjA2NzUgMC4xMDEyNSAwLjEwMTI1bDczOC4wOTU2MjUgMHpNODgxLjE0MDYyNSA3NTMuMTQwNjI1bC03MzguMjgxMjUgMGMtMjkuMDA4MTI1IDAtNTIuNzM0Mzc1LTIzLjcyNjI1LTUyLjczNDM3NS01Mi43MzQzNzVsMC02MzIuODEyNWMwLTI5LjAwODEyNSAyMy43MjYyNS01Mi43MzQzNzUgNTIuNzM0Mzc1LTUyLjczNDM3NWw3MzguMjgxMjUgMGMyOS4wMDgxMjUgMCA1Mi43MzQzNzUgMjMuNzI2MjUgNTIuNzM0Mzc1IDUyLjczNDM3NWwwIDYzMi44MTI1YzAgMjkuMDA4MTI1LTIzLjcyNjI1IDUyLjczNDM3NS01Mi43MzQzNzUgNTIuNzM0Mzc1bDAgMHpNNzc1LjY3MTg3NSA1NjguNTYxODc1YzAtNDMuNjg5Mzc1LTM1LjQyMDYyNS03OS4xMS03OS4xMS03OS4xMXMtNzkuMTEgMzUuNDIwNjI1LTc5LjExIDc5LjExIDM1LjQyMDYyNSA3OS4xMSA3OS4xMSA3OS4xMSA3OS4xMS0zNS40MjA2MjUgNzkuMTEtNzkuMTF6TTgyOC40MDYyNSAxMjAuMzI4MTI1bC02MzIuODEyNSAwIDAgMTA1LjQ2ODc1IDE4NC41Nzg3NSAzMTYuNDA2MjUgMjEwLjkzNzUtMjYzLjY3MTg3NSA1Mi43MzQzNzUgMCAxODQuNTc4NzUgMTU4LjIwMzEyNXoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJsaXN0bnVtYmVyZWQiIHVuaWNvZGU9IiYjNTkzNzQ7IiBkPSJNNDE5LjMwMjg1NjQ0IDE1Mi4yNTcxNDExMjAwMDAwM2w0NjMuNDg1NzE3NzggMCAwLTkyLjY5NzE0MzU2LTQ2My40ODU3MTc3OCAwek00MTkuMzAyODU2NDQgNDMwLjM0ODU3MTc3bDQ2My40ODU3MTc3OCAwIDAtOTIuNjk3MTQzNTQtNDYzLjQ4NTcxNzc4IDB6TTQxOS4zMDI4NTY0NCA3MDguNDQwMDAyNDRsNDYzLjQ4NTcxNzc4IDAgMC05Mi42OTcxNDM1Ni00NjMuNDg1NzE3NzggMHpNMjgwLjI1NzE0MTEyIDc1NC43ODg1NzQyMmwwLTE4NS4zOTQyODcxMS00Ni4zNDg1NzE3OSAwIDAgMTM5LjA0NTcxNTMzLTQ2LjM0ODU3MTc3IDAgMCA0Ni4zNDg1NzE3OHpNMjMzLjkwODU2OTMzIDM3My44NTUyMjQ2MTAwMDAwNWwxZS04LTM2LjIwMzc5NjM5IDkyLjY5NzE0MzU1IDAgMC00Ni4zNDg1NzE3OC0xMzkuMDQ1NzE1MzMgMCAwIDEwNS43MzQwNjk4MyA5Mi42OTcxNDM1NiA0My40NTY0MjA5IDAgMzYuMjAzNzk2MzgtOTIuNjk3MTQzNTYgMCAwIDQ2LjM0ODU3MTc4IDEzOS4wNDU3MTUzMyAwIDAtMTA1LjczNDA2OTgyek0zMjYuNjA1NzEyODkgMjQ0Ljk1NDI4NDY3bDAtMjMxLjc0Mjg1ODg5LTEzOS4wNDU3MTUzMyAwIDAgNDYuMzQ4NTcxNzggOTIuNjk3MTQzNTYgMCAwIDQ2LjM0ODU3MTc4LTkyLjY5NzE0MzU2IDAgMCA0Ni4zNDg1NzE3OCA5Mi42OTcxNDM1NiAwIDAgNDYuMzQ4NTcxNzctOTIuNjk3MTQzNTYgMCAwIDQ2LjM0ODU3MTc4eiIgIGhvcml6LWFkdi14PSIxMDI0IiAvPgoKICAgIAogICAgPGdseXBoIGdseXBoLW5hbWU9InBhaW50LWJydXNoIiB1bmljb2RlPSImIzU4OTYzOyIgZD0iTTg0Ni45OTE4NTgwNiA3MjcuOTU1MzQwODljLTM1Ljc2MjM4MTI4IDM1Ljc2MjM4MTI4LTkzLjczMzE1NTA3IDM1Ljc2MjM4MTI4LTEyOS40OTU1MzYzNiAwTDQ1Ni40OTA0NjU3MyA0NjYuOTk1Mjc1ODRjNjAuNDY2MzU2MTYtMjEuNTQ0NDMwNCAxMDguMDQyNjg3MTEtNjkuMTQzNjU2MSAxMjkuNDk1NTM2MzUtMTI5LjU4NzExNzUxbDI2MS4wMDU4NTUyNiAyNjEuMDUxNjQ1NDhDODgyLjc3NzEzNDA4IDYzNC4yMjIxODUwNzk5OTk5IDg4Mi43NzcxMzQwOCA2OTIuMTkyOTU5NjEgODQ2Ljk5MTg1ODA2IDcyNy45NTUzNDA4OXpNNTA3LjQ1NTI5MzcgMjY2LjM4NzA5MTA1YzAgNjcuNDI2NTEyNDktNTQuNzQyNTQzNjMgMTIyLjA3NzQ3NTY4LTEyMi4xNjkwNTYxMyAxMjIuMDc3NDc1NjlzLTEyMi4wNzc0NzU2OC01NC42NTA5NjMyLTEyMi4wNzc0NzU2OC0xMjIuMDc3NDc1NjlsMC4wOTE1ODExNi0wLjA5MTU4MTE2QzI2My4yMDg3NjE5IDE3NS45NzM3NDcyOSAyMTQuMTIxMzQ0MzggOTcuMTY4Mjk1NDM5OTk5OTUgMTQxLjIyMjg2NzM3IDU0Ljk3MjM0ODU3MDAwMDAxbDAuMzY2MzIzOS0wLjQ1NzkwNTA0QzE3Ny40NDMxNTM3IDMzLjk1NDUwODkxOTk5OTk3IDIxOC45NTIyNDIyNSAyMi4xNDA1NTkyNTAwMDAwMjQgMjYzLjMwMDM0MjMyIDIyLjE0MDU1OTI1MDAwMDAyNCAzOTguMTc2MjYyNzcgMjIuMTQwNTU5MjUwMDAwMDI0IDUwNy41NDY4NzQxMiAxMzEuNTExMTcwNiA1MDcuNTQ2ODc0MTIgMjY2LjM4NzA5MTA1TDUwNy40NTUyOTM3IDI2Ni4zODcwOTEwNXoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJxdW90ZXNsZWZ0IiB1bmljb2RlPSImIzU5NDE5OyIgZD0iTTI1OS43NDY4NzUgNDgyLjkxNjY2NjY2QzM2OC40NzgxMjUgNDgyLjkxNjY2NjY2IDQ1Ni42MjE4NzUgMzk0Ljc3MjkxNjY2IDQ1Ni42MjE4NzUgMjg2LjA0MTY2NjY2MDAwMDAzIDQ1Ni42MjE4NzUgMTc3LjMxMDQxNjY2IDM2OC40NzgxMjUgODkuMTY2NjY2NjYwMDAwMDMgMjU5Ljc0Njg3NSA4OS4xNjY2NjY2NjAwMDAwMyAxNTEuMDE1NjI1IDg5LjE2NjY2NjY2MDAwMDAzIDYyLjg3MTg3NSAxNzcuMzEwNDE2NjYgNjIuODcxODc1IDI4Ni4wNDE2NjY2NjAwMDAwM0w2MiAzMTQuMTY2NjY2NjYwMDAwMDNDNjIgNTMxLjYyOTE2NjY2IDIzOC4yODc1IDcwNy45MTY2NjY2NiA0NTUuNzUgNzA3LjkxNjY2NjY2TDQ1NS43NSA1OTUuNDE2NjY2NjU5OTk5OUMzODAuNjI4MTI1IDU5NS40MTY2NjY2NTk5OTk5IDMxMC4wMDYyNSA1NjYuMTY2NjY2NjU5OTk5OSAyNTYuODc4MTI1IDUxMy4wMzg1NDE2NiAyNDYuNjQwNjI1IDUwMi44MDEwNDE2NiAyMzcuMzMxMjUgNDkxLjk0NDc5MTY2IDIyOC44OTM3NSA0ODAuNDk3OTE2NjYgMjM4Ljk2MjUgNDgyLjA3MjkxNjY2IDI0OS4yNTYyNSA0ODIuOTE2NjY2NjYgMjU5Ljc0Njg3NSA0ODIuOTE2NjY2NjZaTTc2NS45OTY4NzUgNDgyLjkxNjY2NjY2Qzg3NC43MjgxMjUgNDgyLjkxNjY2NjY2IDk2Mi44NzE4NzUgMzk0Ljc3MjkxNjY2IDk2Mi44NzE4NzUgMjg2LjA0MTY2NjY2MDAwMDAzIDk2Mi44NzE4NzUgMTc3LjMxMDQxNjY2IDg3NC43MjgxMjUgODkuMTY2NjY2NjYwMDAwMDMgNzY1Ljk5Njg3NSA4OS4xNjY2NjY2NjAwMDAwMyA2NTcuMjY1NjI1IDg5LjE2NjY2NjY2MDAwMDAzIDU2OS4xMjE4NzUgMTc3LjMxMDQxNjY2IDU2OS4xMjE4NzUgMjg2LjA0MTY2NjY2MDAwMDAzTDU2OC4yNSAzMTQuMTY2NjY2NjYwMDAwMDNDNTY4LjI1IDUzMS42MjkxNjY2NiA3NDQuNTM3NSA3MDcuOTE2NjY2NjYgOTYyIDcwNy45MTY2NjY2Nkw5NjIgNTk1LjQxNjY2NjY1OTk5OTlDODg2Ljg3ODEyNSA1OTUuNDE2NjY2NjU5OTk5OSA4MTYuMjU2MjUgNTY2LjE2NjY2NjY1OTk5OTkgNzYzLjEyODEyNSA1MTMuMDM4NTQxNjYgNzUyLjg5MDYyNSA1MDIuODAxMDQxNjYgNzQzLjU1MzEyNSA0OTEuOTQ0NzkxNjYgNzM1LjE0Mzc1IDQ4MC40OTc5MTY2NiA3NDUuMjEyNSA0ODIuMDcyOTE2NjYgNzU1LjUwNjI1IDQ4Mi45MTY2NjY2NiA3NjUuOTk2ODc1IDQ4Mi45MTY2NjY2NloiICBob3Jpei1hZHYteD0iMTAyNSIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJ0YWJsZTIiIHVuaWNvZGU9IiYjNTk1MTg7IiBkPSJNOTAuMTI1IDc1My4xNDA2MjVsMC03MzguMjgxMjUgODQzLjc1IDBMOTMzLjg3NSA3NTMuMTQwNjI1IDkwLjEyNSA3NTMuMTQwNjI1ek00MDYuNTMxMjUgMjc4LjUzMTI1bDAgMTU4LjIwMzEyNSAyMTAuOTM3NSAwIDAtMTU4LjIwMzEyNUw0MDYuNTMxMjUgMjc4LjUzMTI1ek02MTcuNDY4NzUgMjI1Ljc5Njg3NWwwLTE1OC4yMDMxMjVMNDA2LjUzMTI1IDY3LjU5Mzc1bDAgMTU4LjIwMzEyNUw2MTcuNDY4NzUgMjI1Ljc5Njg3NXpNNjE3LjQ2ODc1IDY0Ny42NzE4NzVsMC0xNTguMjAzMTI1TDQwNi41MzEyNSA0ODkuNDY4NzUgNDA2LjUzMTI1IDY0Ny42NzE4NzUgNjE3LjQ2ODc1IDY0Ny42NzE4NzV6TTM1My43OTY4NzUgNjQ3LjY3MTg3NWwwLTE1OC4yMDMxMjVMMTQyLjg1OTM3NSA0ODkuNDY4NzUgMTQyLjg1OTM3NSA2NDcuNjcxODc1IDM1My43OTY4NzUgNjQ3LjY3MTg3NXpNMTQyLjg1OTM3NSA0MzYuNzM0Mzc1bDIxMC45Mzc1IDAgMC0xNTguMjAzMTI1TDE0Mi44NTkzNzUgMjc4LjUzMTI1IDE0Mi44NTkzNzUgNDM2LjczNDM3NXpNNjcwLjIwMzEyNSA0MzYuNzM0Mzc1bDIxMC45Mzc1IDAgMC0xNTguMjAzMTI1TDY3MC4yMDMxMjUgMjc4LjUzMTI1IDY3MC4yMDMxMjUgNDM2LjczNDM3NXpNNjcwLjIwMzEyNSA0ODkuNDY4NzVMNjcwLjIwMzEyNSA2NDcuNjcxODc1bDIxMC45Mzc1IDAgMC0xNTguMjAzMTI1TDY3MC4yMDMxMjUgNDg5LjQ2ODc1ek0xNDIuODU5Mzc1IDIyNS43OTY4NzVsMjEwLjkzNzUgMCAwLTE1OC4yMDMxMjVMMTQyLjg1OTM3NSA2Ny41OTM3NSAxNDIuODU5Mzc1IDIyNS43OTY4NzV6TTY3MC4yMDMxMjUgNjcuNTkzNzVsMCAxNTguMjAzMTI1IDIxMC45Mzc1IDAgMC0xNTguMjAzMTI1TDY3MC4yMDMxMjUgNjcuNTkzNzV6IiAgaG9yaXotYWR2LXg9IjEwMjQiIC8+CgogICAgCiAgICA8Z2x5cGggZ2x5cGgtbmFtZT0iaWZyYW1lIiB1bmljb2RlPSImIzU5MjEyOyIgZD0iTTcyIDc0NGwwLTcyMCA5MDAgMEw5NzIgNzQ0IDcyIDc0NHpNNDkyIDY4NGwwLTEyMEwxMzIgNTY0IDEzMiA2ODQgNDkyIDY4NHpNMTMyIDMyNEwxMzIgNTA0bDM2MCAwIDAtMTgwTDEzMiAzMjR6TTEzMiAyNjRsMjQwIDAgMC0xODBMMTMyIDg0IDEzMiAyNjR6TTkxMiA4NEw0MzIgODRsMCAxODAgNDgwIDBMOTEyIDg0ek05MTIgMzI0TDU1MiAzMjQgNTUyIDUwNCA1NTIgNTY0IDU1MiA2ODRsMzYwIDBMOTEyIDMyNHoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJsaXN0MiIgdW5pY29kZT0iJiM1ODg4MTsiIGQ9Ik00MTkuMzAyODU2NDQgNzA4LjQ0MDAwMjQ0aDQ2My40ODU3MTc3OHYtOTIuNjk3MTQzNTZINDE5LjMwMjg1NjQ0VjcwOC40NDAwMDI0NHogbTFlLTgtMjc4LjA5MTQzMDY3aDQ2My40ODU3MTc3N3YtOTIuNjk3MTQzNTRINDE5LjMwMjg1NjQ0VjQzMC4zNDg1NzE3N3ogbTAtMjc4LjA5MTQzMDY1aDQ2My40ODU3MTc3N3YtOTIuNjk3MTQzNTZINDE5LjMwMjg1NjQ0djkyLjY5NzE0MzU2ek0xNDEuMjExNDI1NzggNjYyLjA5MTQzMDY3YTkyLjY5NzE0MzU2IDkyLjY5NzE0MzU2IDAgMSAwIDE4NS4zNDc5Mzg1NCAwLjA0NjM0ODU3QTkyLjY5NzE0MzU2IDkyLjY5NzE0MzU2IDAgMCAwIDE0MS4yMTE0MjU3OCA2NjIuMDkxNDMwNjd6IG0wLTI3OC4wOTE0MzA2N2E5Mi42OTcxNDM1NiA5Mi42OTcxNDM1NiAwIDEgMCAxODUuMzQ3OTM4NTQgMC4wNDYzNDg1OEE5Mi42OTcxNDM1NiA5Mi42OTcxNDM1NiAwIDAgMCAxNDEuMjExNDI1NzggMzg0eiBtMC0yNzguMDkxNDMwNjdhOTIuNjk3MTQzNTYgOTIuNjk3MTQzNTYgMCAxIDAgMTg1LjM0NzkzODU0IDAuMDQ2MzQ4NTlBOTIuNjk3MTQzNTYgOTIuNjk3MTQzNTYgMCAwIDAgMTQxLjIxMTQyNTc4IDEwNS45MDg1NjkzMjk5OTk5OHoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJmb3JtYXQiIHVuaWNvZGU9IiYjNTg5NzE7IiBkPSJNNjYwLjUxMDkzMzMzIDc2MC40OTgxMzMzM2MtNy4yMjAyNjY2NyA3LjIyMTMzMzMzLTE5LjAzNDY2NjY3IDcuMjIxMzMzMzMtMjYuMjU2IDBMNDUuNDUyOCAxNzEuNjk0OTMzMzMwMDAwMDNjLTcuMjIwMjY2NjctNy4yMTkyLTcuMjIwMjY2NjctMTkuMDM0NjY2NjcgMC0yNi4yNTQ5MzMzNGwxMTQuNTE3MzMzMzMtMTE0LjUxODRjNy4yMjEzMzMzMy03LjIyMDI2NjY3IDIxLjQ4MjY2NjY3LTEzLjEyNzQ2NjY3IDMxLjY5Mzg2NjY3LTEzLjEyNzQ2NjY2SDU1OC41MjhjMTAuMjEwMTMzMzMgMCAyNC40NzM2IDUuOTA3MiAzMS42OTI4IDEzLjEyNzQ2NjY2bDM4Ni44MDUzMzMzMyAzODYuODAzMmM3LjIyMTMzMzMzIDcuMjIwMjY2NjcgNy4yMjEzMzMzMyAxOS4wMzQ2NjY2NyAwIDI2LjI1Nkw2NjAuNTEyIDc2MC40OTgxMzMzM3pNNTUzLjc5OTQ2NjY3IDEwMC43NzY1MzMzM2MtNy4yMjAyNjY2Ny03LjIxOTItMjEuNDgyNjY2NjctMTMuMTI3NDY2NjctMzEuNjkyOC0xMy4xMjc0NjY2N0gyMzguMDczNmMtMTAuMjExMiAwLTI0LjQ3MzYgNS45MDgyNjY2Ny0zMS42OTI4IDEzLjEyNzQ2NjY3bC01My45ODQgNTMuOTg0Yy03LjIyMDI2NjY3IDcuMjIwMjY2NjctNy4yMjAyNjY2NyAxOS4wMzQ2NjY2NyAwIDI2LjI1NmwyMTUuODUwNjY2NjcgMjE1Ljg1MTczMzMzYzcuMjIxMzMzMzMgNy4yMTkyIDE5LjAzNTczMzMzIDcuMjE5MiAyNi4yNTcwNjY2NiAwbDIxNC41NjUzMzMzNC0yMTQuNTY2NGM3LjIyMDI2NjY3LTcuMjE5MiA3LjIyMDI2NjY3LTE5LjAzNDY2NjY3IDAtMjYuMjU0OTMzMzNsLTU1LjI3MDQtNTUuMjcwNHoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJsaW5rIiB1bmljb2RlPSImIzU4OTMwOyIgZD0iTTUzNi43MzI0MjE4OCAyNTcuMDk0NzI2NTZsLTE0Ny40OTgwNDY4OC0xNDcuNDk4MDQ2ODdxLTMyLjE0MTYwMTU2LTMxLjMyNDIxODc1LTc2LjYyMzA0Njg4LTMxLjMyNDIxODc1dC03NS44MDU2NjQwNiAzMS4zMjQyMTg3NXEtMzIuMTQxNjAxNTYgMzIuMTQxNjAxNTYtMzIuMTQxNjAxNTYgNzYuNjIzMDQ2ODd0MzIuMTQxNjAxNTYgNzYuNjIzMDQ2ODhsMTQ2LjY4MDY2NDA3IDE0Ny40OTgwNDY4N3E5LjA3MDMxMjUgOC4yNTI5Mjk2OSA5LjA3MDMxMjQ5IDIwLjU5Mjc3MzQ0dC04LjY0ODQzNzUgMjEuMDE0NjQ4NDQtMjEuMDE0NjQ4NDMgOC42NDg0Mzc1LTIwLjU5Mjc3MzQ0LTkuMDcwMzEyNUwxOTQuODAyNzM0MzcgMzA0Ljg0NTcwMzEyMDAwMDA1cS00OS40Mzg0NzY1Ni00OS40Mzg0NzY1Ni00OS40Mzg0NzY1Ni0xMTguNjUyMzQzNzR0NDkuMDE2NjAxNTctMTE4LjIzMDQ2ODc1IDExOC4yMzA0Njg3NC00OS4wMTY2MDE1NyAxMTguNjUyMzQzNzUgNDguNjIxMDkzNzVsMTQ3LjQ5ODA0Njg4IDE0Ny40OTgwNDY4OHE4LjI1MjkyOTY5IDkuMDcwMzEyNSA4LjI1MjkyOTY5IDIxLjQzNjUyMzQzdC04LjY0ODQzNzUgMjEuMDE0NjQ4NDQtMjEuMDE0NjQ4NDQgOC42NDg0Mzc1LTIwLjU5Mjc3MzQ0LTkuMDcwMzEyNXpNODMxLjI4MDI3MzQ0IDcwNC45NDE0MDYyNXEtNDkuMDE2NjAxNTYgNDkuMDE2NjAxNTYtMTE4LjIzMDQ2ODc1IDQ5LjAxNjYwMTU2dC0xMTguNjUyMzQzNzUtNDkuNDM4NDc2NTZsLTE0Ny40OTgwNDY4OC0xNDcuNDk4MDQ2ODhxLTguMjUyOTI5NjktOC4yNTI5Mjk2OS04LjI1MjkyOTY4LTIwLjU5Mjc3MzQzdDguNjQ4NDM3NS0yMS4wMTQ2NDg0NCAyMS4wMTQ2NDg0My04LjY0ODQzNzUgMjAuNTkyNzczNDQgOC4yNTI5Mjk2OWwxNDcuNDk4MDQ2ODggMTQ3LjQ5ODA0Njg3cTMyLjE0MTYwMTU2IDMyLjE0MTYwMTU2IDc2LjYyMzA0Njg3IDMyLjE0MTYwMTU3dDc2LjIyNzUzOTA2LTMxLjcxOTcyNjU3IDMxLjcxOTcyNjU3LTc2LjYyMzA0Njg3LTMyLjE0MTYwMTU3LTc2LjIyNzUzOTA3bC0xNDYuNjgwNjY0MDYtMTQ3LjQ5ODA0Njg3cS05LjA3MDMxMjUtOC4yNTI5Mjk2OS05LjA3MDMxMjUtMjAuNTkyNzczNDR0OC42NDg0Mzc1LTIxLjAxNDY0ODQ0IDIxLjAxNDY0ODQ0LTguNjQ4NDM3NSAyMS40MzY1MjM0NCA4LjI1MjkyOTY5bDE0Ny40OTgwNDY4NyAxNDcuNDk4MDQ2ODhxNDguNjIxMDkzNzUgNDkuNDM4NDc2NTYgNDguNjIxMDkzNzUgMTE4LjY1MjM0Mzc1dC00OS4wMTY2MDE1NiAxMTguMjMwNDY4NzV6TTQ5MC41ODk4NDM3NSAzMjEuMzc3OTI5NjlsODQuMDU4NTkzNzUgODQuMDU4NTkzNzVxOS4wNzAzMTI1IDguMjUyOTI5NjkgOS4wNzAzMTI1IDIwLjU5Mjc3MzQzdC04LjY0ODQzNzUgMjEuMDE0NjQ4NDQtMjEuMDE0NjQ4NDQgOC42NDg0Mzc1LTIwLjU5Mjc3MzQ0LTkuMDcwMzEyNWwtODQuMDU4NTkzNzQtODQuMDU4NTkzNzVxLTkuMDcwMzEyNS04LjI1MjkyOTY5LTkuMDcwMzEyNS0yMC41OTI3NzM0M3Q4LjY0ODQzNzUtMjEuMDE0NjQ4NDQgMjEuMDE0NjQ4NDMtOC42NDg0Mzc1IDIwLjU5Mjc3MzQ0IDkuMDcwMzEyNXoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJ0ZXJtaW5hbCIgdW5pY29kZT0iJiM1OTA0NjsiIGQ9Ik00NzcuODY2NjY2NjcgMzg0djAuMTE5NDY2NjcgMC4xMTk0NjY2NmE1MS4wMjkzMzMzMyA1MS4wMjkzMzMzMyAwIDAgMS0xNS42NjcyIDM2Ljg0NjkzMzM0bDAuMDE3MDY2NjYgMC4wMTcwNjY2Ni0zMDcuMiAzMDcuMi0wLjEzNjUzMzMzLTAuMTM2NTMzMzNhNTEuMiA1MS4yIDAgMSAxLTY4Ljc2MTYtNzUuNzkzMDY2NjdsMjY4LjI1Mzg2NjY3LTI2OC4yNTM4NjY2Nkw4Mi42MDI2NjY2NyAxMTIuMzQ5ODY2NjY5OTk5OThsMC4wMTcwNjY2Ni0wLjAxNzA2NjY3YTUxLjIgNTEuMiAwIDAgMSA3Mi4zNzk3MzMzNC03Mi4zNzk3MzMzM2wwLjAxNzA2NjY2LTAuMDE3MDY2NjcgMzA3LjIgMzA3LjItMC4wMTcwNjY2NiAwLjAxNzA2NjY3QTUxLjAyOTMzMzMzIDUxLjAyOTMzMzMzIDAgMCAxIDQ3Ny44NjY2NjY2NyAzODR6IG00MzUuMi0yNTZoLTM5Mi41MzMzMzMzNGE0Mi42NjY2NjY2NyA0Mi42NjY2NjY2NyAwIDAgMS00Mi42NjY2NjY2Ni00Mi42NjY2NjY2N3YtMTcuMDY2NjY2NjZhNDIuNjY2NjY2NjcgNDIuNjY2NjY2NjcgMCAwIDEgNDIuNjY2NjY2NjYtNDIuNjY2NjY2NjdoMzkyLjUzMzMzMzM0YTQyLjY2NjY2NjY3IDQyLjY2NjY2NjY3IDAgMCAxIDQyLjY2NjY2NjY2IDQyLjY2NjY2NjY3djE3LjA2NjY2NjY2YTQyLjY2NjY2NjY3IDQyLjY2NjY2NjY3IDAgMCAxLTQyLjY2NjY2NjY2IDQyLjY2NjY2NjY3eiIgIGhvcml6LWFkdi14PSIxMDI0IiAvPgoKICAgIAogICAgPGdseXBoIGdseXBoLW5hbWU9InVuZG8iIHVuaWNvZGU9IiYjNTg5NzA7IiBkPSJNMTAzLjI1IDQyOS4yODEyNWwyNzYuMzc1LTI3Ni40Njg3NWMxOC4yODEyNS0xOC4xODc1IDQ5LjUtNS4yNSA0OS41IDIwLjUzMTI1VjMzNy41OTM3NWMxODkuODQzNzUgNy42ODc1IDMyMi41OTM3NS01NS43ODEyNSA0NzAuMjUtMzE3LjE1NjI1IDcuOTY4NzUtMTQuMDYyNSAyOS41MzEyNS03LjQwNjI1IDI4LjY4NzUgOC43MTg3NS0yOC41OTM3NSA1MjAuMDMxMjUtNDI0LjY4NzUgNTM1LjY4NzUtNDk5LjAzMTI1IDUzNHYxNjMuMTI1YzAgMjUuNzgxMjUtMzEuMTI1IDM4LjcxODc1LTQ5LjQwNjI1IDIwLjQzNzVMMTAzLjE1NjI1IDQ3MC4yNWMtMTEuMjUtMTEuMzQzNzUtMTEuMjUtMjkuNjI1IDAuMDkzNzUtNDAuOTY4NzV6IiAgaG9yaXotYWR2LXg9IjEwMjQiIC8+CgogICAgCiAgICA8Z2x5cGggZ2x5cGgtbmFtZT0icGFyYWdyYXBoLXJpZ2h0IiB1bmljb2RlPSImIzU5MjIyOyIgZD0iTTg2NC4yNDkxNDU1MSAxNC44NTkzNzVoLTQxLjE5ODczMDQ4Vjc1My4xNDA2MjVoNDEuMTk4NzMwNDd2LTczOC4yODEyNXogbS00OTguNTA0NjM4NjcgNDAwLjAzOTY3Mjg2aDQxNS4yODMyMDMxM3Y0MS4xOTg3MzA0NmgtMzc0LjA4NDQ3MjY2djIxNC4yMzMzOTg0NGgzNzQuMDg0NDcyNjZ2NDEuMTk4NzMwNDZoLTQxNS4yODMyMDMxM3YtMjk2LjYzMDg1OTM2eiBtLTIwNS45OTM2NTIzNC02MS43OTgwOTU3MnYtMjk2LjYzMDg1OTM2aDYyMS4yNzY4NTU0N3Y0MS4xOTg3MzA0NmgtNTgwLjA3ODEyNXYyMTQuMjMzMzk4NDRoNTgwLjA3ODEyNXY0MS4xOTg3MzA0NmgtNjIxLjI3Njg1NTQ3eiIgIGhvcml6LWFkdi14PSIxMDI0IiAvPgoKICAgIAogICAgPGdseXBoIGdseXBoLW5hbWU9InBhcmFncmFwaC1sZWZ0IiB1bmljb2RlPSImIzU5MjIzOyIgZD0iTTE1OS43NTA4NTQ0OSA3NTMuMTQwNjI1aDQxLjE5ODczMDQ4di03MzguMjgxMjVoLTQxLjE5ODczMDQ3Vjc1My4xNDA2MjV6IG00OTguNTA0NjM4NjctNDEuNjEwNzE3NzhoLTQxNS4yODMyMDMxM3YtNDEuMTk4NzMwNDdoMzc0LjA4NDQ3MjY2di0yMTQuMjMzMzk4NDJoLTM3NC4wODQ0NzI2NnYtNDEuMTk4NzMwNDhoNDE1LjI4MzIwMzEzdjI5Ni42MzA4NTkzOHogbS00MTUuMjgzMjAzMTMtMzU4LjQyODk1NTA3di00MS4xOTg3MzA0OGg1ODAuMDc4MTI1di0yMTQuMjMzMzk4NDJoLTU4MC4wNzgxMjV2LTQxLjE5ODczMDQ4aDYyMS4yNzY4NTU0N3YyOTYuNjMwODU5MzhoLTYyMS4yNzY4NTU0N3oiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJwYXJhZ3JhcGgtY2VudGVyIiB1bmljb2RlPSImIzU4ODgwOyIgZD0iTTUxMiAxNDkuNjI1MzY2MjIwMDAwMDVoNDYuODc1MDkxNTZ2LTE0MC42MjUyNzQ2Nkg1MTJ6IG0wIDI4MS4yNDk3MjUzNGg0Ni44NzUwOTE1NnYtMTQwLjYyNTI3NDY2SDUxMnogbTAgMzI4LjEyNDgxNjg4aDQ2Ljg3NTA5MTU2di0xNDAuNjI1Mjc0NjZINTEyek0xODMuODc1MTgzMSAzMzcuMTI0OTA4NDRIODg2Ljk5OTA4NDQ3di0yMzQuMzc0NjMzNzhIMTgzLjg3NTE4MzFWMzM3LjEyNDA4NDQ3OTk5OTk2eiBtNDYuODc1MDkxNTYtMTg3LjQ5OTU0MjIzaDYwOS4zNzQ1NDIyNFYyOTAuMjQ5ODE2OTAwMDAwMDRIMjMwLjc1MDI3NDY2di0xNDAuNjI0NDUwNjh6IG05My43NDkzNTkxMyA1MTUuNjI0MzU5MTNoNDIxLjg3NVY0MzAuODc1OTE1NTJoLTQyMS44NzVWNjY1LjI0OTcyNTMzOTk5OTl6IG00Ni44NzU5MTU1My00Ni44NzUwOTE1NnYtMTQwLjYyNDQ1MDY4aDMyOC4xMjQ4MTY5VjYxOC4zNzQ2MzM3ODAwMDAxSDM3MS4zNzQ3MjUzNHoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJoZWFkZXIiIHVuaWNvZGU9IiYjNTkxMDY7IiBkPSJNMzQ0LjQyMzAzOTA5IDQyNS44OTQyNDAwMmgzMzUuMTUzOTIxODJ2MjkzLjI1OTY4MjYyYTQxLjg5NDI0MDAyIDQxLjg5NDI0MDAyIDAgMSAwIDgzLjc4ODQ4MDg2IDB2LTY3MC4zMDc4NDUyOGE0MS44OTQyNDAwMiA0MS44OTQyNDAwMiAwIDAgMC04My43ODg0ODA4NiAwdjI5My4yNTk2ODI2MmgtMzM1LjE1MzkyMTgydi0yOTMuMjU5NjgyNjJhNDEuODk0MjQwMDIgNDEuODk0MjQwMDIgMCAwIDAtODMuNzg4NDgwODYgMHY2NzAuMzA3ODQ1MjhhNDEuODk0MjQwMDIgNDEuODk0MjQwMDIgMCAwIDAgODMuNzg4NDgwODYgMHoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJ1bmRlcmxpbmUiIHVuaWNvZGU9IiYjNTg5MjA7IiBkPSJNMjYxLjUwMzY2NzQ2IDExLjg3ODA5MjQ1MDAwMDA1NHY0OS45NzY1MzQ0N2w1MDAuOTkyNjY1MDggNC41NDU5OTkwMXYtNDkuOTY2NzE1ODVMMjYxLjUwMzY2NzQ2IDExLjg3ODA5MjQ1MDAwMDA1NHpNNzM4LjY4NjI5NDE3IDM5NS4xNzU1Mjg0NXEwLTI1Ni40MTIwMjIzNy0yMzIuNjAxOTgzOTgtMjU2LjQxMjAyMzEtMjIyLjg4MTU5NzExIDAtMjIyLjg4MTU5NzEzIDI0Ny40MjgwMjg4NlY3NTMuNDA2MTQ4MzNoNzguMDU3NjUxN3YtMzYzLjY4OTc0NjU4cTAtMTgxLjQ3NjY3Njk4IDE1Mi4xODc4NzQ1Ny0xODEuNDc2Njc2OTcgMTQ3LjEzMTMwOTg2IDAgMTQ3LjEzMTMwOTg3IDE3NS42MjQ4MDc2OVY3NTMuNDU1MjQwODlINzM4LjY4NjI5NDE3eiIgIGhvcml6LWFkdi14PSIxMDI0IiAvPgoKICAgIAogICAgPGdseXBoIGdseXBoLW5hbWU9IlBsYXkiIHVuaWNvZGU9IiYjNjAyODA7IiBkPSJNNzY2Ljk5OTk5OTcxIDc1OS4wMDAwMDAyOWgtNTA5Ljk5OTk5OTQyQzE0OS4wMDAwMDAyOSA3NTkuMDAwMDAwMjkgNjIgNjcyIDYyIDU2NHYtMzYwYzAtMTA4IDg3LjAwMDAwMDI5LTE5NS4wMDAwMDAyOSAxOTUuMDAwMDAwMjktMTk1LjAwMDAwMDI5aDUwOS45OTk5OTk0MmMxMDggMCAxOTUuMDAwMDAwMjkgODcuMDAwMDAwMjkgMTk1LjAwMDAwMDI5IDE5NS4wMDAwMDAyOVY1NjRjMCAxMDgtODcuMDAwMDAwMjkgMTk1LjAwMDAwMDI5LTE5NS4wMDAwMDAyOSAxOTUuMDAwMDAwMjl6IG0tODEtMzg3bC0yNzAtMTgwYy0yLjk5OTk5OTcxLTIuOTk5OTk5NzEtNi4wMDAwMDAyOS0yLjk5OTk5OTcxLTktMy4wMDAwMDA1OC0yLjk5OTk5OTcxIDAtNi4wMDAwMDAyOSAwLTUuOTk5OTk5NDIgMy4wMDAwMDA1OC02LjAwMDAwMDI5IDAtOSA2LjAwMDAwMDI5LTkgMTEuOTk5OTk5NzFWNTY0YzAgNi4wMDAwMDAyOSAyLjk5OTk5OTcxIDExLjk5OTk5OTcxIDkgMTEuOTk5OTk5NzFzMTEuOTk5OTk5NzEgMi45OTk5OTk3MSAxNC45OTk5OTk0MiAwbDI3MC0xODBjMi45OTk5OTk3MS0yLjk5OTk5OTcxIDYuMDAwMDAwMjktNi4wMDAwMDAyOSA2LjAwMDAwMDI5LTExLjk5OTk5OTcxcy0yLjk5OTk5OTcxLTktNi4wMDAwMDAyOS0xMS45OTk5OTk3MXoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJyZWRvIiB1bmljb2RlPSImIzYwODEwOyIgZD0iTTEwMTcuMTczMzMzIDQ2NS45MmwtNDc3Ljg2NjY2NiAzMDcuMmMtNi44MjY2NjcgMy40MTMzMzMtMTMuNjUzMzMzIDMuNDEzMzMzLTE3LjA2NjY2NyAwLTYuODI2NjY3LTMuNDEzMzMzLTEwLjI0LTYuODI2NjY3LTEwLjI0LTEzLjY1MzMzM3YtMTg3LjczMzMzNEMxNzAuNjY2NjY3IDU2MS40OTMzMzMgMy40MTMzMzMgMjMzLjgxMzMzMjk5OTk5OTk0IDAgOC41MzMzMzI5OTk5OTk5N3YtMy40MTMzMzNjMC02LjgyNjY2NyA2LjgyNjY2Ny0xMy42NTMzMzMgMTcuMDY2NjY3LTEzLjY1MzMzM3MxNy4wNjY2NjcgNi44MjY2NjcgMTcuMDY2NjY2IDE3LjA2NjY2NmMzLjQxMzMzMyA1MS4yIDIyOC42OTMzMzMgMjc5Ljg5MzMzMyA0NzcuODY2NjY3IDI5MC4xMzMzMzRWMTEwLjkzMzMzMjk5OTk5OTk1YzAtNi44MjY2NjcgMy40MTMzMzMtMTMuNjUzMzMzIDEwLjI0LTEzLjY1MzMzMyA2LjgyNjY2Ny0zLjQxMzMzMyAxMy42NTMzMzMtMy40MTMzMzMgMTcuMDY2NjY3IDBsNDc3Ljg2NjY2NiAzNDEuMzMzMzMzYzMuNDEzMzMzIDMuNDEzMzMzIDYuODI2NjY3IDEwLjI0IDYuODI2NjY3IDEzLjY1MzMzNHMtMy40MTMzMzMgMTAuMjQtNi44MjY2NjcgMTMuNjUzMzMzeiIgIGhvcml6LWFkdi14PSIxMDI0IiAvPgoKICAgIAogICAgPGdseXBoIGdseXBoLW5hbWU9InBlbmNpbDIiIHVuaWNvZGU9IiYjNTg5NjI7IiBkPSJNMTUyIDk4LjI1bDc0Ljk5OTk5OTcxLTc0Ljk5OTk5OTcxSDE1MnpNMzc3IDguMjVIMTUyYTE1LjAwMDAwMDI5IDE1LjAwMDAwMDI5IDAgMCAwLTE1LjAwMDAwMDI5IDE1LjAwMDAwMDI5djIyNSAwLjA1OTk5OTQyIDAuMDQ1IDAuMDMwMDAwNTggMC4wMTQ5OTk0MiAwLjA0NSAwLjA0NWExNC45NCAxNC45NCAwIDAgMCA0LjM2NSAxMC4zMzUwMDA1OGwwLjAzMDAwMDU4IDAuMDI5OTk5NzEgNDEyLjQ5OTk5OTcxIDQxMi40OTk5OTk3MSA2NC41NTk5OTk3MSA2My44MWMwLjM3NTAwMDI5IDAuMzc1MDAwMjkgMC43ODAwMDAyOSAwLjcyIDEuMjAwMDAwNTggMS4wNjUwMDA1OCAzNy40Njk5OTk3MSAyOS44NTAwMDAyOSA3Ny4zNTUgMjkuODY0OTk5NzEgMTE1LjM0OTk5OTQyIDAuMDU5OTk5NDJhMTIuNjc0OTk5NzEgMTIuNjc0OTk5NzEgMCAwIDAgMS4zNS0xLjE5OTk5OTcxbDEyOC4yNS0xMjguMjVhMTQuOTEwMDAwMjkgMTQuOTEwMDAwMjkgMCAwIDAgMS4yMTUtMS4zNjUwMDAyOWMyOS4yNjUwMDAyOS0zNy40NTUwMDAyOSAyOS4wMDk5OTk3MS03Ny4yOTQ5OTk3MS0wLjc2NS0xMTUuMjQ1YTE0LjgwNSAxNC44MDUgMCAwIDAtMS4xOTk5OTk3MS0xLjM1bC00NzYuMjUwMDAwMjktNDc2LjI0OTk5OTQyYTE0Ljk2OTk5OTcxIDE0Ljk2OTk5OTcxIDAgMCAwLTEwLjM2NDk5OTQyLTQuMzk1MDAwNThoLTAuMTY1MDAwNThMMzc3IDguMjV6IG0tMTQzLjc5MDAwMDI5IDI5Ljk5OTk5OTcxaDEwNy41ODAwMDA1OEwxNjcuMDAwMDAwMjkgMjEyLjAzOTk5OTcwOTk5OTk2di0xMDcuNTc5OTk5NzFsNjYuMjA5OTk5NDItNjYuMjEwMDAwMjl6TTE2Ny4wMDAwMDAyOSAzOC4yNDk5OTk3MWgyMy43ODk5OTk3MUwxNjcuMDAwMDAwMjkgNjIuMDQwMDAwMjg5OTk5OTY2di0yMy43OTAwMDA1OHogbTE1Ni45NiA1OS4yNTAwMDA1OEwzNzcgNDQuNDU5OTk5NzEwMDAwMDM0bDQ2NC45ODUgNDY0Ljk4NWMyMC40MyAyNi40NiAyMC42NzAwMDAyOSA1MC45MjQ5OTk3MSAwLjczNTAwMDI5IDc2Ljg2bC0xMjYuOTE1MDAwMjkgMTI2LjkzMDAwMDU4Yy0yNi40NiAyMC40MDAwMDAyOS01MC45MjQ5OTk3MSAyMC4zODUtNzYuODQ0OTk5NzEgMC4wMTQ5OTk0MmwtNjMuOTE1MDAwMjktNjMuMTY0OTk5NzFMMTczLjIxMDAwMDI5IDI0OC4yNTAwMDAyOSAyMjYuOTk5OTk5NzEgMTk0LjQ2MDAwMDAwMDAwMDA0bDQwMS44OTUgNDAxLjg5NWExNC45ODUgMTQuOTg1IDAgMSAwIDIxLjIxMDAwMDI5LTIxLjIxMDAwMDI5TDI0OC4yMSAxNzMuMjQ5OTk5NzFsNTQuNTQtNTQuNTQgNDAxLjg5NSA0MDEuODgwMDAwNThhMTQuOTg1IDE0Ljk4NSAwIDEgMCAyMS4yMTAwMDAyOS0yMS4yMTAwMDAyOUwzMjMuOTYwMDAwMjkgOTcuNTAwMDAwMjl6TTU4NS43MSA2ODEuOTc0OTk5NzFsMjI1LTIyNS00Mi40MzUtNDIuNDE5OTk5NzEtMjI1IDIyNXoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJ0ZXh0LWhlaWdoIiB1bmljb2RlPSImIzU4OTE1OyIgZD0iTTYyIDMwOS4wMDAwMDAyOWgxNTAuMDAwMDAwMjl2LTM3NS4wMDAwMDAyOWg3NC45OTk5OTk3MVYzMDkuMDAwMDAwMjloMTUwLjAwMDAwMDI5VjM4NEg2MnYtNzQuOTk5OTk5NzF6TTIxMC41IDgzNHYtMTUwLjAwMDAwMDI5SDU4Ni45OTk5OTk3MXYtNzQ5Ljk5OTk5OTcxaDE1MC4wMDAwMDAyOVY2ODMuOTk5OTk5NzFoMzcyLjc1MDAwMDI5VjgzNEgyMTAuNXoiICBob3Jpei1hZHYteD0iMTE5MiIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJzdHJpa2V0aHJvdWdoIiB1bmljb2RlPSImIzU5Njc4OyIgZD0iTTk0NS45Mjg1NzE2OCAzODRxNy4wMzEyNTAwMSAwIDExLjU1MTMzOTE2LTQuNTIwMDg5MTZ0NC41MjAwODkxNi0xMS41NTEzMzkxNnYtMzIuMTQyODU3NTFxMC03LjAzMTI1MDAxLTQuNTIwMDg5MTYtMTEuNTUxMzM5MTd0LTExLjU1MTMzOTE2LTQuNTIwMDg5MTdINzguMDcxNDI4MzJxLTcuMDMxMjUwMDEgMC0xMS41NTEzMzkxNiA0LjUyMDA4OTE3dC00LjUyMDA4OTE2IDExLjU1MTMzOTE1djMyLjE0Mjg1NzUzcTAgNy4wMzEyNTAwMSA0LjUyMDA4OTE2IDExLjU1MTMzOTE2dDExLjU1MTMzOTE2IDQuNTIwMDg5MTZoODY3Ljg1NzE0MzM1ek0zMDQuNTc4MTI1IDQxNi4xNDI4NTc1MXEtMTQuMDYyNSAxNy41NzgxMjUtMjUuNjEzODM5MTcgNDAuMTc4NTcwODEtMjQuMTA3MTQyNDkgNDguNzE2NTE3NDgtMjQuMTA3MTQzMzYgOTQuNDE5NjQzMzYgMCA5MC45MDQwMTc0OCA2Ny4yOTkxMDc1NCAxNTUuMTg5NzMxNjQgNjYuNzk2ODc1IDYzLjc4MzQ4MjUyIDE5Ny4zNzcyMzI1MSA2My43ODM0ODI1MyAyNS4xMTE2MDc1MiAwIDgzLjg3Mjc2NzQ5LTkuNTQyNDEwODUgMzMuMTQ3MzIxNjctNi4wMjY3ODU4MyA4OC44OTUwODkxNS0yNC4xMDcxNDI0OCA1LjAyMjMyMTY3LTE5LjA4NDgyMTY5IDEwLjU0Njg3NTAxLTU5LjI2MzM5MzM2IDcuMDMxMjUwMDEtNjEuNzc0NTUzMzIgNy4wMzEyNDk5OS05MS45MDg0ODE2NSAwLTkuMDQwMTc4MzMtMi41MTExNjA4NC0yMi42MDA0NDY2N2wtNi4wMjY3ODU4NC0xLjUwNjY5NjY5LTQyLjE4NzUgMy4wMTMzOTMzNy03LjAzMTI1IDEuMDA0NDY0MTZxLTI1LjExMTYwNzUyIDc0LjgzMjU4OTE2LTUxLjcyOTkwOTk1IDEwMi45NTc1ODkxNi00NC4xOTY0MjgzMiA0NS43MDMxMjUtMTA1LjQ2ODc1MDAxIDQ1LjcwMzEyNDk5LTU3LjI1NDQ2NDE2IDAtOTEuNDA2MjQ5OTktMjkuNjMxNjk2NjctMzMuNjQ5NTUzMzItMjkuMTI5NDY0MTYtMzMuNjQ5NTU0MjEtNzMuMzI1ODkyNDggMC0zNi42NjI5NDY2OCAzMy4xNDczMjE2OC03MC4zMTI1dDE0MC4xMjI3Njc0OC02NC43ODc5NDY2OXEzNC42NTQwMTc0OC0xMC4wNDQ2NDI0OSA4Ni44ODYxNjA4NC0zMy4xNDczMjE2NyAyOS4xMjk0NjQxNi0xNC4wNjI1IDQ3LjcxMjA1NDItMjYuMTE2MDcwODFIMzA0LjU3ODEyNXogbTI1NC42MzE2OTY2OS0xMjguNTcxNDI5MTloMjA2LjQxNzQxMDgzcTMuNTE1NjI1LTE5LjU4NzA1MzMyIDMuNTE1NjI0OTktNDYuMjA1MzU2NjQgMC01NS43NDc3Njc0OC0yMC41OTE1MTgzNS0xMDYuNDczMjE0MTUtMTEuNTUxMzM5MTYtMjcuNjIyNzY3NDgtMzUuNjU4NDgxNjUtNTIuMjMyMTQzMzgtMTguNTgyNTg5MTYtMTcuNTc4MTI1LTU0Ljc0MzMwNDE5LTQwLjY4MDgwMzMxLTQwLjE3ODU3MTY4LTI0LjEwNzE0MjQ5LTc2Ljg0MTUxNzQ4LTMzLjE0NzMyMTY4LTQwLjE3ODU3MTY4LTEwLjU0Njg3NS0xMDEuOTUzMTI1LTEwLjU0Njg3NTAxLTU3LjI1NDQ2NDE2IDAtOTcuOTM1MjY4MzUgMTEuNTUxMzM5MTdsLTcwLjMxMjUgMjAuMDg5Mjg1ODRxLTI4LjYyNzIzMjUyIDguMDM1NzE0MTUtMzYuMTYwNzE0MTcgMTQuMDYyNS00LjAxNzg1NzUxIDQuMDE3ODU3NTEtNC4wMTc4NTY2NSAxMS4wNDkxMDc1MnY2LjUyOTAxNzQ4cTAgNTQuMjQxMDcxNjgtMS4wMDQ0NjQxNSA3OC4zNDgyMTQxNS0wLjUwMjIzMjUyIDE1LjA2Njk2NDE2IDAgMzQuMTUxNzg1ODVsMS4wMDQ0NjQxNSAxOC41ODI1ODkxNnYyMi4wOTgyMTQxNmw1MS4yMjc2NzgzNCAxLjAwNDQ2NTA0cTcuNTMzNDgyNTItMTcuMDc1ODkyNDggMTUuMDY2OTY0MTYtMzUuNjU4NDgyNTF0MTEuMzAwMjIzMzMtMjguMTI1IDYuMjc3OTAxNjYtMTMuNTYwMjY3NDlxMTcuNTc4MTI1LTI4LjYyNzIzMjUyIDQwLjE3ODU3MTY4LTQ3LjIwOTgyMTY4IDIxLjU5NTk4MjUyLTE4LjA4MDM1NzUxIDUyLjczNDM3NTAxLTI4LjYyNzIzMjUyIDI5LjYzMTY5NjY4LTExLjA0OTEwNzUyIDY2LjI5NDY0MjQ3LTExLjA0OTEwNjYzIDMyLjE0Mjg1NzUxIDAgNjkuODEwMjY4MzYgMTMuNTYwMjY3NDcgMzguNjcxODc1IDEzLjA1ODAzNTg0IDYxLjI3MjMyMDggNDMuMTkxOTY0MTYgMjMuNjA0OTEwODQgMzAuNjM2MTYwODQgMjMuNjA0OTEwODQgNjQuNzg3OTQ2NjggMCA0Mi4xODc1LTQwLjY4MDgwMzMyIDc4Ljg1MDQ0NjY4LTE3LjA3NTg5MjQ4IDE0LjU2NDczMjUyLTY4LjgwNTgwMzMxIDM1LjY1ODQ4MTY0eiIgIGhvcml6LWFkdi14PSIxMDI0IiAvPgoKICAgIAogICAgPGdseXBoIGdseXBoLW5hbWU9ImJvbGQiIHVuaWNvZGU9IiYjNTkwNDE7IiBkPSJNNTk3LjMzMzMzMyAzNDEuMzMzMzMzMDAwMDAwMDRIMjU2Yy0yNS42IDAtNDIuNjY2NjY3IDE3LjA2NjY2Ny00Mi42NjY2NjcgNDIuNjY2NjY3VjcyNS4zMzMzMzNjMCAyNS42IDE3LjA2NjY2NyA0Mi42NjY2NjcgNDIuNjY2NjY3IDQyLjY2NjY2N2gzNDEuMzMzMzMzYzExOS40NjY2NjcgMCAyMTMuMzMzMzMzLTkzLjg2NjY2NyAyMTMuMzMzMzM0LTIxMy4zMzMzMzNzLTkzLjg2NjY2Ny0yMTMuMzMzMzMzLTIxMy4zMzMzMzQtMjEzLjMzMzMzNHogbS0yOTguNjY2NjY2IDg1LjMzMzMzNGgyOTguNjY2NjY2YzcyLjUzMzMzMyAwIDEyOCA1NS40NjY2NjcgMTI4IDEyOHMtNTUuNDY2NjY3IDEyOC0xMjggMTI4SDI5OC42NjY2Njd2LTI1NnpNNjQwIDBIMjU2Yy0yNS42IDAtNDIuNjY2NjY3IDE3LjA2NjY2Ny00Mi42NjY2NjcgNDIuNjY2NjY3djM0MS4zMzMzMzNjMCAyNS42IDE3LjA2NjY2NyA0Mi42NjY2NjcgNDIuNjY2NjY3IDQyLjY2NjY2N2gzODRjMTE5LjQ2NjY2NyAwIDIxMy4zMzMzMzMtOTMuODY2NjY3IDIxMy4zMzMzMzMtMjEzLjMzMzMzNHMtOTMuODY2NjY3LTIxMy4zMzMzMzMtMjEzLjMzMzMzMy0yMTMuMzMzMzMzeiBtLTM0MS4zMzMzMzMgODUuMzMzMzMzaDM0MS4zMzMzMzNjNzIuNTMzMzMzIDAgMTI4IDU1LjQ2NjY2NyAxMjggMTI4cy01NS40NjY2NjcgMTI4LTEyOCAxMjhIMjk4LjY2NjY2N3YtMjU2eiIgIGhvcml6LWFkdi14PSIxMDI0IiAvPgoKICAgIAogICAgPGdseXBoIGdseXBoLW5hbWU9ImxpbmUtaGVpZ2h0IiB1bmljb2RlPSImIzU5MTkwOyIgZD0iTTQ2OS4zMzMzMzMgNzI1LjMzMzMzM2g0MjYuNjY2NjY3di04NS4zMzMzMzNINDY5LjMzMzMzM1Y3MjUuMzMzMzMzek0yNTYgNTk3LjMzMzMzM3YtMTcwLjY2NjY2NkgxNzAuNjY2NjY3VjU5Ny4zMzMzMzNINDIuNjY2NjY3bDE3MC42NjY2NjYgMTcwLjY2NjY2NyAxNzAuNjY2NjY3LTE3MC42NjY2NjdIMjU2eiBtMC00MjYuNjY2NjY2aDEyOGwtMTcwLjY2NjY2Ny0xNzAuNjY2NjY3LTE3MC42NjY2NjYgMTcwLjY2NjY2N2gxMjh2MTcwLjY2NjY2Nmg4NS4zMzMzMzN2LTE3MC42NjY2NjZ6IG0yMTMuMzMzMzMzLTQyLjY2NjY2N2g0MjYuNjY2NjY3di04NS4zMzMzMzNINDY5LjMzMzMzM3Y4NS4zMzMzMzN6IG0tODUuMzMzMzMzIDI5OC42NjY2NjdoNTEydi04NS4zMzMzMzRIMzg0djg1LjMzMzMzNHoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJzb3VuZC1jb2RlIiB1bmljb2RlPSImIzU4ODk0OyIgZD0iTTg3OS42MzI3NTE0NiA0MzcuMjI4NzU5NzdMNzE2LjkxNDI0NTYgNTk5Ljk0NzI2NTYzbC01NC4yMzQwMDg3OC01NC4yNDIyNDg1NCAxNjIuNzEwMjY2MTEtMTYyLjcxMDI2NjExTDY2Mi42ODAyMzY4MiAyMjAuMjc2MjQ1MTFsNTQuMjM0MDA4NzgtNTQuMjM0MDA4NzggMTYyLjcxODUwNTg2IDE2Mi43MTAyNjYxMSA1NC4yNDIyNDg1NCA1NC4yNDIyNDg1M3pNMzA3LjA3NzUxNDY0IDU5OS45NDcyNjU2M0wxNDQuMzU5MDA4NzggNDM3LjIyODc1OTc3IDkwLjEyNSAzODIuOTk0NzUwOTcwMDAwMDRsNTQuMjM0MDA4NzktNTQuMjQyMjQ4NTNMMzA3LjA3NzUxNDY0IDE2Ni4wNDIyMzYzMzAwMDAwNGw1NC4yMzQwMDg4IDU0LjIzNDAwODc5LTE2Mi43MTAyNjYxMiAxNjIuNzE4NTA1ODUgMTYyLjcxMDI2NjEyIDE2Mi43MTAyNjYxMnpNMzcyLjk1MTgxMjc0IDIzLjUyNTExNTk3TDU3Ny4wNjEwMzUxNiA3NjIuODcxNzY1MTNsNzMuOTI3MDAxOTUtMjAuNDA4MjAzMTItMjA0LjEwOTIyMjQyLTczOS4zNDgyOTcxMnoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKICAgIDxnbHlwaCBnbHlwaC1uYW1lPSJpdGFsaWMiIHVuaWNvZGU9IiYjNTg4OTU7IiBkPSJNNzMyLjU4NjI0MjY4IDY5OC45ODA3NzM5Mjk5OTk5Vjc2OS40ODAwNDE1MUg1MjEuMDg4NDM5OTR2LTcwLjQ5OTI2NzU4aDU4LjM2MjEyMTU4TDM4OS4xMzcxNDU5OSA2NS40NDMxNzYyNjk5OTk5OGgtNzkuNTQ2NTA4Nzh2LTcwLjQ5OTI2NzU4aDIxMS40OTc4MDI3M3Y3MC40OTkyNjc1OEg0NjIuNzI2MzE4MzZsMTkwLjMyMTY1NTI4IDYzMy41Mzc1OTc2NnoiICBob3Jpei1hZHYteD0iMTAyNCIgLz4KCiAgICAKCgogIDwvZm9udD4KPC9kZWZzPjwvc3ZnPgo=) format(\'svg\');  /* iOS 4.1- */}.w-e-icon {  font-family: "w-e-icon" !important;  font-size: 18px;  font-style: normal;  -webkit-font-smoothing: antialiased;  -moz-osx-font-smoothing: grayscale;}.w-e-icon-font:before {  content: "\\e7a0";}.w-e-icon-happy:before {  content: "\\e7a8";}.w-e-icon-image:before {  content: "\\e7bc";}.w-e-icon-listnumbered:before {  content: "\\e7ee";}.w-e-icon-paint-brush:before {  content: "\\e653";}.w-e-icon-quotesleft:before {  content: "\\e81b";}.w-e-icon-table2:before {  content: "\\e87e";}.w-e-icon-iframe:before {  content: "\\e74c";}.w-e-icon-list2:before {  content: "\\e601";}.w-e-icon-format:before {  content: "\\e65b";}.w-e-icon-link:before {  content: "\\e632";}.w-e-icon-terminal:before {  content: "\\e6a6";}.w-e-icon-undo:before {  content: "\\e65a";}.w-e-icon-paragraph-right:before {  content: "\\e756";}.w-e-icon-paragraph-left:before {  content: "\\e757";}.w-e-icon-paragraph-center:before {  content: "\\e600";}.w-e-icon-header:before {  content: "\\e6e2";}.w-e-icon-underline:before {  content: "\\e628";}.w-e-icon-Play:before {  content: "\\eb78";}.w-e-icon-redo:before {  content: "\\ed8a";}.w-e-icon-pencil2:before {  content: "\\e652";}.w-e-icon-text-heigh:before {  content: "\\e623";}.w-e-icon-strikethrough:before {  content: "\\e91e";}.w-e-icon-bold:before {  content: "\\e6a1";}.w-e-icon-line-height:before {  content: "\\e736";}.w-e-icon-sound-code:before {  content: "\\e60e";}.w-e-icon-italic:before {  content: "\\e60f";}.w-e-toolbar {  display: -ms-flexbox;  display: flex;  padding: 0 5px;  /* flex-wrap: wrap; */  /* 单个菜单 */}.w-e-toolbar .w-e-menu {  position: relative;  text-align: center;  padding: 5px 10px;  cursor: pointer;}.w-e-toolbar .w-e-menu i {  color: #999;}.w-e-toolbar .w-e-menu:hover i {  color: #333;}.w-e-toolbar .w-e-active i {  color: #1e88e5;}.w-e-toolbar .w-e-active:hover i {  color: #1e88e5;}.w-e-text-container .w-e-panel-container {  position: absolute;  top: 0;  left: 50%;  border: 1px solid #ccc;  border-top: 0;  box-shadow: 1px 1px 2px #ccc;  color: #333;  background-color: #fff;  /* 为 emotion panel 定制的样式 */  /* 上传图片的 panel 定制样式 */}.w-e-text-container .w-e-panel-container .w-e-panel-close {  position: absolute;  right: 0;  top: 0;  padding: 5px;  margin: 2px 5px 0 0;  cursor: pointer;  color: #999;}.w-e-text-container .w-e-panel-container .w-e-panel-close:hover {  color: #333;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-title {  list-style: none;  display: -ms-flexbox;  display: flex;  font-size: 14px;  margin: 2px 10px 0 10px;  border-bottom: 1px solid #f1f1f1;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-title .w-e-item {  padding: 3px 5px;  color: #999;  cursor: pointer;  margin: 0 3px;  position: relative;  top: 1px;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-title .w-e-active {  color: #333;  border-bottom: 1px solid #333;  cursor: default;  font-weight: 700;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content {  padding: 10px 15px 10px 15px;  font-size: 16px;  /* 输入框的样式 */  /* 按钮的样式 */}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content input:focus,.w-e-text-container .w-e-panel-container .w-e-panel-tab-content textarea:focus,.w-e-text-container .w-e-panel-container .w-e-panel-tab-content button:focus {  outline: none;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content textarea {  width: 100%;  border: 1px solid #ccc;  padding: 5px;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content textarea:focus {  border-color: #1e88e5;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content input[type=text] {  border: none;  border-bottom: 1px solid #ccc;  font-size: 14px;  height: 20px;  color: #333;  text-align: left;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content input[type=text].small {  width: 30px;  text-align: center;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content input[type=text].block {  display: block;  width: 100%;  margin: 10px 0;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content input[type=text]:focus {  border-bottom: 2px solid #1e88e5;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content .w-e-button-container button {  font-size: 14px;  color: #1e88e5;  border: none;  padding: 5px 10px;  background-color: #fff;  cursor: pointer;  border-radius: 3px;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content .w-e-button-container button.left {  float: left;  margin-right: 10px;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content .w-e-button-container button.right {  float: right;  margin-left: 10px;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content .w-e-button-container button.gray {  color: #999;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content .w-e-button-container button.red {  color: #c24f4a;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content .w-e-button-container button:hover {  background-color: #f1f1f1;}.w-e-text-container .w-e-panel-container .w-e-panel-tab-content .w-e-button-container:after {  content: "";  display: table;  clear: both;}.w-e-text-container .w-e-panel-container .w-e-emoticon-container .w-e-item {  cursor: pointer;  font-size: 18px;  padding: 0 3px;  display: inline-block;  *display: inline;  *zoom: 1;}.w-e-text-container .w-e-panel-container .w-e-up-img-container {  text-align: center;}.w-e-text-container .w-e-panel-container .w-e-up-img-container .w-e-up-btn {  display: inline-block;  *display: inline;  *zoom: 1;  color: #999;  cursor: pointer;  font-size: 60px;  line-height: 1;}.w-e-text-container .w-e-panel-container .w-e-up-img-container .w-e-up-btn:hover {  color: #333;}.w-e-text-container {  position: relative;}.w-e-text-container .w-e-progress {  position: absolute;  background-color: #1e88e5;  bottom: 0;  left: 0;  height: 1px;}.w-e-text {  padding: 10px;  overflow-y: scroll;}.w-e-text p,.w-e-text h1,.w-e-text h2,.w-e-text h3,.w-e-text h4,.w-e-text h5,.w-e-text table,.w-e-text pre {  line-height: 1.5;}.w-e-text ul,.w-e-text ol {  margin: 10px 0 10px 20px;}.w-e-text blockquote {  display: block;  border-left: 8px solid #d0e5f2;  padding: 5px 10px;  margin: 10px 0;  line-height: 1.4;  font-size: 100%;  background-color: #f1f1f1;}.w-e-text code {  display: inline-block;  *display: inline;  *zoom: 1;  background-color: #f1f1f1;  border-radius: 3px;  padding: 3px 5px;  margin: 0 3px;}.w-e-text pre code {  display: block;}.w-e-text table {  border-top: 1px solid #ccc;  border-left: 1px solid #ccc;}.w-e-text table td,.w-e-text table th {  border-bottom: 1px solid #ccc;  border-right: 1px solid #ccc;  padding: 3px 5px;}.w-e-text table th {  border-bottom: 2px solid #ccc;  text-align: center;}.w-e-text:focus {  outline: none;}.w-e-text img {  cursor: pointer;}.w-e-text img:hover {  box-shadow: 0 0 5px #333;}';

// 将 css 代码添加到 <style> 中
var style = document.createElement('style');
style.type = 'text/css';
style.innerHTML = inlinecss;
document.getElementsByTagName('HEAD').item(0).appendChild(style);

// 返回
var index = window.wangEditor || Editor;

return index;

})));
