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
export function transUnitToPx(val) {
    if (!/(pt|cm)/.test(val)) {
        return val
    }
    var unit
    val.replace(/([\d.]+)(\w+)/, function (str, v, u) {
        val = v
        unit = u
    })
    switch (unit) {
    case 'cm':
        val = parseFloat(val) * 25
        break
    case 'pt':
        val = Math.round(parseFloat(val) * 96 / 72)
    }
    return val + (val ? 'px' : '')
}

// 过滤word冗余代码及无用属性
export function filterWord(html) {
    //是否是word过来的内容
    function isWordDocument( str ) {
        return /(class="?Mso|style="[^"]*\bmso\-|w:WordDocument|<(v|o):|lang=)/ig.test( str )
    }
    //去掉小数
    function transUnit( v ) {
        v = v.replace( /[\d.]+\w+/g, function ( m ) {
            return transUnitToPx(m)
        } )
        return v
    }

    function filterPasteWord( str ) {
        return str.replace(/[\t\r\n]+/g,' ')
                .replace( /<!--[\s\S]*?-->/ig, '' )
                //转换图片
                .replace(/<v:shape [^>]*>[\s\S]*?.<\/v:shape>/gi,function(str){
                    //opera能自己解析出image所这里直接返回空
                    // if(browser.opera){
                    //     return ''
                    // }
                    try{
                        //有可能是bitmap占为图，无用，直接过滤掉，主要体现在粘贴excel表格中
                        if(/Bitmap/i.test(str)){
                            return ''
                        }
                        var width = str.match(/width:([ \d.]*p[tx])/i)[1],
                            height = str.match(/height:([ \d.]*p[tx])/i)[1],
                            src =  str.match(/src=\s*"([^"]*)"/i)[1]
                        return '<img width="'+ transUnit(width) +'" height="'+transUnit(height) +'" src="' + src + '" />'
                    } catch(e){
                        return ''
                    }
                })
                //针对wps添加的多余标签处理
                .replace(/<\/?div[^>]*>/g,'')
                //去掉多余的属性
                .replace( /v:\w+=(["']?)[^'"]+\1/g, '' )
                .replace( /<(!|script[^>]*>.*?<\/script(?=[>\s])|\/?(\?xml(:\w+)?|xml|meta|link|style|\w+:\w+)(?=[\s\/>]))[^>]*>/gi, '' )
                .replace( /<p [^>]*class="?MsoHeading"?[^>]*>(.*?)<\/p>/gi, '<p><strong>$1</strong></p>' )
                //去掉多余的属性
                .replace( /\s+(class|lang|align)\s*=\s*(['"]?)([\w-]+)\2/ig, function(str,name,marks,val){
                    //保留list的标示
                    return name == 'class' && val == 'MsoListParagraph' ? str : ''
                })
                //清除多余的font/span不能匹配&nbsp;有可能是空格
                .replace( /<(font|span)[^>]*>(\s*)<\/\1>/gi, function(a,b,c){
                    return c.replace(/[\t\r\n ]+/g,' ')
                })
                //处理style的问题
                .replace( /(<[a-z][^>]*)\sstyle=(["'])([^\2]*?)\2/gi, function( str, tag, tmp, style ) {
                    var n = [],
                        s = style.replace( /^\s+|\s+$/, '' )
                            .replace(/&#39;/g,'\'')
                            .replace( /&quot;/gi, "'" )
                            .replace(/[\d.]+(cm|pt)/g,function(str){
                                return transUnitToPx(str)
                            })
                            .split( /;\s*/g )

                    for ( var i = 0, v; v = s[i]; i++ ) {

                        var name, value,
                            parts = v.split( ":" )

                        if ( parts.length == 2 ) {
                            name = parts[0].toLowerCase()
                            value = parts[1].toLowerCase()
                            if(/^(background)\w*/.test(name) && value.replace(/(initial|\s)/g,'').length == 0
                                ||
                                /^(margin)\w*/.test(name) && /^0\w+$/.test(value)
                            ){
                                continue
                            }

                            switch ( name ) {
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
                                    if(!/<table/.test(tag))
                                        n[i] = name.replace( /^mso-|-alt$/g, "" ) + ":" + transUnit( value )
                                    continue
                                case "horiz-align":
                                    n[i] = "text-align:" + value
                                    continue

                                case "vert-align":
                                    n[i] = "vertical-align:" + value
                                    continue

                                case "font-color":
                                case "mso-foreground":
                                    n[i] = "color:" + value
                                    continue

                                case "mso-background":
                                case "mso-highlight":
                                    n[i] = "background:" + value
                                    continue

                                case "mso-default-height":
                                    n[i] = "min-height:" + transUnit( value )
                                    continue

                                case "mso-default-width":
                                    n[i] = "min-width:" + transUnit( value )
                                    continue

                                case "mso-padding-between-alt":
                                    n[i] = "border-collapse:separate;border-spacing:" + transUnit( value )
                                    continue

                                case "text-line-through":
                                    if ( (value == "single") || (value == "double") ) {
                                        n[i] = "text-decoration:line-through"
                                    }
                                    continue
                                case "mso-zero-height":
                                    if ( value == "yes" ) {
                                        n[i] = "display:none"
                                    }
                                    continue;
//                                case 'background':
//                                    break;
                                case 'margin':
                                    if ( !/[1-9]/.test( value ) ) {
                                        continue
                                    }

                            }

                            if ( /^(mso|column|font-emph|lang|layout|line-break|list-image|nav|panose|punct|row|ruby|sep|size|src|tab-|table-border|text-(?:decor|trans)|top-bar|version|vnd|word-break)/.test( name )
                                ||
                                /text\-indent|padding|margin/.test(name) && /\-[\d.]+/.test(value)
                            ) {
                                continue
                            }

                            n[i] = name + ":" + parts[1]
                        }
                    }
                    return tag + (n.length ? ' style="' + n.join( ';').replace(/;{2,}/g,';') + '"' : '')
                })


    }
    return (isWordDocument( html ) ? filterPasteWord( html ) : html)
}
