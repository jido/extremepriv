// Mistigri /// Σ:{
// Mustache-inspired JavaScript template engine

/*
Sample use
----------
var template = "{{&type}} template; {{#person}}\n{{name default ='Madam'}} loves Σ:{ " +
    '{{love yes="much" no="not"}}{{/person}}';
var model = {
    type: "Test",
    love: false,
    person: [{name: "jido", love: true}, {name: "Mrs Nock", love: false}, {}]};
alert(mistigri.prrcess(template, model));
*/

var mistigri = (function(){
"use strict";

var DEFAULT_OPEN_BRACE = "{{";
var DEFAULT_CLOSE_BRACE = "}}";
var DEFAULT_PLACEHOLDER = "N/A";
var DEFAULT_METHOD_CALL = false;
var DEFAULT_ESCAPE_FUNCTION = function escapeHtml(html) {
    var text = document.createTextNode(html);
    var div = document.createElement('div');
    div.appendChild(text);
    return div.innerHTML;
}
var DEFAULT_READER = function ajaxReader(url) {
    return new Promise(function read(fulfill, reject) {
        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.onreadystatechange = function(event) {
            if (this.readyState === 4)
            {
                if (this.status === 200)
                {
                    fulfill(this.responseText);
                }
                else
                {
                    var miError = new Error("Mistigri ajaxReader error reading: " + url);
                    miError.httpStatus = this.status;
                    miError.httpResponse = this.statusText;
                    reject(miError);
                }
            }
        }
        request.send();
    });
}

var options = {
    openBrace: DEFAULT_OPEN_BRACE,
    closeBrace: DEFAULT_CLOSE_BRACE,
    placeholder: DEFAULT_PLACEHOLDER,
    methodCall: DEFAULT_METHOD_CALL,
    escapeFunction: DEFAULT_ESCAPE_FUNCTION,
    reader: DEFAULT_READER
};

var main = function prrcess(text, model, config) {
    var template = null;
    var open_brace = getOption('openBrace', config);
    if (typeof text === 'string')
    {
        template = text.split(open_brace);
    }
    else if (text !== null && typeof text === 'object')
    {
        template = Array.isArray(text) ? text : String(text).split(open_brace);
    }
    var result;
    if (template === null)
    {
        console.error("Mistigri doesn't understand this template type: '" + typeof text + "'");
        result = new Promise(function hiss(grant, deny) {
            var error = new Error("Unknown template type " + typeof text);
            if (deny === undefined)
            {
                throw error;   // this will never be reached with a real Promise
            }
            deny(error);
        });
        result.toString = function toString() {return "error"};
    }
    else
    {
        model = (model === undefined) ? {} : model;
        var includes = {work: [], offset: 0, cache: {}};
        result = renderAll(template, model, config, includes);
    }
    return result;
}

var feed = function feed(templates) {
    return function readFromObject(path) {
        return new Promise(function share(grant, deny) {
            if (path in templates)
            {
                grant(templates[path]);
            }
            else
            {
                deny(new Error("Mistigri was not fed template: " + path));
            }
        });
    }
}

var renderAll = function renderAll(template, model, config, includes) {
    var rendered = render(template, model, config, includes);
    var result = new Promise(function purr(grant, deny) {
        handleAllIncludes(includes, config, rendered, rendered.length, grant);
    });
    result.toString = function toString() {
        return rendered;
    }
    return result;    
}

var render = function render(parts, model, config, includes) {
    var open_brace_len = getOption('openBrace', config).length;
    var close_brace = getOption('closeBrace', config);
    var default_text = getOption('placeholder', config);
    var bind = getOption('methodCall', config);
    var escape_func = getOption('escapeFunction', config);
    var rendered = parts[0];
    var position = rendered.length;
    var offset = includes.offset;
    var in_block = 0;
    var inverted;
    var start;
    var start_text;
    var else_start = 0;
    var else_start_text;
    var action;
    var args;
    for (var partnum = 1; partnum < parts.length; ++partnum) 
    {
        var part = parts[partnum];
        var mitext = splitAt(close_brace, part);
        var mistigri = mitext[0];
        var text = (mitext.length > 1) ? mitext[1] : "";
        if (!in_block)
        {
            args = {$position: position, $template: parts, $model: model, $placeholder: default_text}; 
        }
        var hat = false;
        switch (mistigri.substr(0, 1)) 
        {
            case "^":
                hat = true;
            case "#":
                if (in_block > 0)
                {
                    var this_action = parseAction(mistigri.substr(1));
                    if (hat && in_block === 1 && this_action === "/" + action)
                    {
                        if (inverted) break;    // already inverted, no else allowed
                        else_start = partnum;   // starting else part of the block
                        else_start_text = text;
                        inverted = true;
                        break;
                    }
                    if (this_action !== action) break;      // ignore non-matching nested block
                }
                ++in_block;
                if (in_block > 1) break;    // nested block
                inverted = hat;
                action = parseAction(mistigri.substr(1), args, bind);
                args.$prelude = rendered;
                start = partnum;
                start_text = text;
                break;
            case "/":
                if (in_block > 0)
                {
                    var this_action = parseAction(mistigri.substr(1));
                    if (this_action === action)
                    {
                        --in_block;
                    }
                    else if (in_block === 1 && this_action === "^" + action)
                    {
                        if (inverted) break;    // already inverted, no else allowed
                        else_start = partnum;   // starting else part of the block
                        else_start_text = text;
                        inverted = true;
                    }
                    if (in_block > 0) break;
                }
                else
                {
                    rendered += mistigri;   // invalid close tag
                    break;
                }
                includes.offset = offset + rendered.length;
                var block_info = { 
                    invert: else_start === 0 && inverted, 
                    content: start_text, 
                    prelude: args.$prelude, 
                    ending: text,
                    parts: parts.slice(start, partnum), 
                    args: args, config: config, includes: includes};
                var result = evaluateAction(action, block_info);
                if ('filtered' in result)
                {
                    rendered += result.filtered;
                }
                else if (else_start === 0)
                {
                    rendered += handleBlock(result.value, block_info);
                }
                else
                {
                    // Only one of the following will modify the rendered text
                    block_info.parts = parts.slice(start, else_start);
                    rendered += handleBlock(result.value, block_info);
                
                    block_info.parts = parts.slice(else_start, partnum);
                    block_info.content = else_start_text;
                    block_info.invert = true;
                    rendered += handleBlock(result.value, block_info);
                
                    else_start = 0;
                }
                break;
            case ">":
                if (in_block > 0) break;
                action = parseAction(mistigri.substr(1), args, bind);
                includes.offset = offset + rendered.length;
                rendered += handleInclude(action, args, config, includes);
                break;
            case "!":
                break;  // just a comment
            case "&":
                if (in_block > 0) break;
                action = parseAction(mistigri.substr(1), args, bind);
                rendered += handleValue(action, args, bind);
                break;
            default:
                if (in_block > 0) break;
                action = parseAction(mistigri, args, bind);
                rendered += escape(handleValue(action, args, bind), escape_func, default_text);
        }
        if (in_block <= 0)
        {
            rendered += text;
        }
        position += open_brace_len + part.length;
    }
    return rendered;
}

var handleValue = function handleValue(action, args, bind) {
    var value = valueFor(action, args.$model, bind);
    var result;
    switch (typeof value) 
    {
        case 'number':
            return value;
        case 'string':
            return value;
        case 'undefined':
        case 'object':
            result = value;
            break;
        case 'boolean':
            result = value ? args.yes : args.no;
            break;
        case 'function':
            if ('$invertBlock' in args || '$inner' in args)
            {
                console.warn("Mistigri saw $inner or $invertBlock in arguments, possible DOS attempt!");
                delete args.$invertBlock;
                delete args.$inner;
            }
            result = callFilter(action, value, args);
            break;
        default:
            // Not sure what to do
            return String(value);
    }
    if (result === undefined || result === null)
    {
        return ('default' in args) ? args.default : args.$placeholder;
    }
    return result;
}

var evaluateAction = function evaluateAction(action, info) {
    var bind = getOption('methodCall', info.config);
    var model = info.args.$model;
    var value = valueFor(action, model, bind);
    if (typeof value === 'function')
    {
        var args = info.args;
        var config = info.config;
        var includes = info.includes;
        var template = info.parts;
        template[0] = info.content;
        args.$template = template;
        args.$ending = info.ending;
        args.$invertBlock = info.invert;
        args.$inner = function $inner() {
            return renderAll(template, model, config, includes);
        }
        value = callFilter(action, value, args);
        if (typeof value === 'string')
        {
            return {filtered: value};
        }
        if (value instanceof Promise)
        {
            includes.work.push({deferred: value, at: includes.offset, path: null, model: null, render: true});
            return {filtered: ""};
        }
    }
    return {value: value};
}

var handleBlock = function handleBlock(value, info) {
    var result = "";
    info.parts[0] = info.content;
    var is_empty_array = Array.isArray(value) && value.length === 0;
    var is_empty = !value || is_empty_array;
    if ((is_empty && info.invert) || (!is_empty && !info.invert))
    {
        var suffix = ('suffix' in info.args) ? info.args.suffix : "";
        var separator = ('separator' in info.args) ? info.args.separator : "";
        var middle = separator; 
        if ('tag' in info.args)
        {
            var left = info.prelude.toLowerCase().lastIndexOf("<" + info.args.tag.toLowerCase());
            var right = info.ending.toLowerCase().indexOf("</" + info.args.tag.toLowerCase());
            if (left !== -1 && right !== -1)
            {
                right = info.ending.indexOf(">", right) + 1;
                middle = info.ending.substr(0, right) + info.prelude.substr(left);
            }
        }

        var list = value;
        if (is_empty || !Array.isArray(value))
        {
            list = [is_empty_array? null : value];      // special handling for empty array
        }
        var offset = info.includes.offset;
        var total = info.invert ? 0 : list.length;
        var count = 0;
        for (var index in list)
        {
            count += 1;
            var item = list[index];
            var submodel = prepModel(info.args.$model, item, count, total, suffix);
            if (count > 1 && middle.length !== 0)
            {
                result += middle;
            }
            info.includes.offset = offset + result.length;
            result += render(info.parts, submodel, info.config, info.includes);
        }
    }
    return result;
}

var prepModel = function prepModel(model, item, count, total, suffix) {
    var submodel = Object.create(model);
    submodel.$item = item;
    submodel.$count = count;
    submodel.$total = total;
    if (suffix.length > 0)
    {
        submodel["$item" + suffix] = item;
        submodel["$count" + suffix] = count;
        submodel["$total" + suffix] = total;
    }
    if (typeof item === 'object' && item !== null)
    {
        for (var key in item)
        {
            submodel[key + suffix] = item[key];
        }
    }
    return submodel;
}

var handleInclude = function handleInclude(action, args, config, includes) {
    var preload = ('render' in args && args.render === "no");
    delete args.render;
    delete args.$template;
    delete args.$model;
    delete args.$position;
    delete args.$placeholder;
    var path = valueFor(action, args, false);
    if (path === null)
    {
        path = action;
    }
    if (path in includes.cache)
    {
        return preload ? "" : render(includes.cache[path], args, config, includes);
    }
    var read = getOption('reader', config);
    var model = preload ? null : args;
    includes.work.push({deferred: read(path), at: includes.offset, path: path, model: model, render: !preload});
    return "";  // Rendered output will be inserted later
}

var handleAllIncludes = function handleAllIncludes(includes, config, rendered, size, finish) {
    if (includes.work.length === 0)
    {
        finish(rendered);
        return;
    }
    var open_brace = getOption('openBrace', config);
    var include = includes.work.shift();
    var position = include.at + rendered.length - size;   // position from end

    try {
        include.deferred.then(function(content) {
            var ready_text = (include.path === null);   // content is text promised by a block function
            if (!ready_text)
            {
                var template = content.split(open_brace);
                includes.cache[include.path] = template;
            }
            var new_includes = {work: [], offset: position, cache: includes.cache};
            if (include.render)
            {
                var inserted = ready_text ? content : render(template, include.model, config, new_includes);
                rendered = rendered.substr(0, position) + inserted + rendered.substr(position);
            }
            handleAllIncludes(new_includes, config, rendered, rendered.length, function(new_rendered) {
                handleAllIncludes(includes, config, new_rendered, size, finish);
            });
        },
        function(error) {
            console.error(error.stack);
            handleAllIncludes(includes, config, rendered, size, finish);
        });
    } catch(error) {
        console.error("Bad luck! Mistigri frowns at the function that threw this error");
        console.error(error.stack);
    }
}

var parseAction = function parseAction(tag, args, bind) {
    var parts = /^\s*(\S+)\s*([^]*)/.exec(tag);
    if (parts === null) return "";
    var action = parts[1];
    if (args !== undefined)
    {
        args.$action = action;
        if (parts[2].length > 0)
        {
            getArgs(parts[2], args, bind);
        }
    }
    return action;
}

var getArgs = function getArgs(text, args, bind) {
    var backslashes = /\\([^])/g;
    var cleaned = text.replace(backslashes, "\\1");
    var name = "";
    var seen_sign = false;
    var single_quoted = false;
    var double_quoted = false;
    var end = -1;
    var find_space = /\s+/g;
    var space;
    for (var start = 0; space !== null; start = find_space.lastIndex) 
    {
        space = find_space.exec(cleaned);
        end = (space === null) ? cleaned.length : space.index;
        var value = cleaned.substring(start, end);
        if (single_quoted || double_quoted)
        {
            single_quoted = (single_quoted && value.indexOf("'", -1) === -1);
            double_quoted = (double_quoted && value.indexOf('"', -1) === -1);
            var shift = (single_quoted || double_quoted) ? 0 : 1; // closing quote
            args[name] += " " + text.substring(start, end - shift).replace(backslashes, unbackslash);
        }
        else
        {
            if (!seen_sign)
            {
                var argval = splitAt("=", value);
                if (argval[0].length > 0)
                {
                    name = argval[0];
                    start += name.length;
                }
                value = argval[1];
                seen_sign = (argval.length === 2);
                start += seen_sign ? 1 : 0;
            }
            if (seen_sign && name.length === 0) 
            {
                break;    // What, no arg name?
            }
            if (seen_sign && value.length > 0)
            {
                var arg;
                if (/^[-+0-9]/.test(value))
                {
                    arg = parseFloat(value);    // doesn't throw
                }
                else if (/^'[^]*'$/.test(value) || /^"[^]*"$/.test(value))
                {
                    arg = text.substring(start + 1, end - 1).replace(backslashes, unbackslash);
                }
                else if (value.lastIndexOf("'", 0) === 0)
                {
                    arg = text.substring(start + 1, end).replace(backslashes, unbackslash);
                    single_quoted = true;
                }
                else if (value.lastIndexOf('"', 0) === 0)
                {
                    arg = text.substring(start + 1, end).replace(backslashes, unbackslash);
                    double_quoted = true;
                }
                else
                {
                    arg = valueFor(value, args.$model, bind);
                }
                args[name] = arg;
            }
        }
        if (seen_sign && value.length > 0 && !single_quoted && !double_quoted)
        {
            name = "";
            seen_sign = false;
        }
    }
    return !seen_sign;
}

var callFilter = function callFilter(name, action, args) {
    try {
        var result = action(args);
        while (typeof result === 'function')
        {
            result = result(args);
        }
        return result;
    } catch(error) {
        console.error("Mistigri called " + name + " and received an error");
        console.error(error.stack);
        return args.$placeholder;
    }
}

var valueFor = function valueFor(name, model, bind) {
    var path = name.split(".");
    if (path[0].length === 0)
    {
        return (path.length === 2 && path[1].length === 0) ? model.$item : null;
    }
    var value = model;
    for (var child in path)
    {
        var next = value[path[child]];
        if (next === undefined || next === null)
        {
            return null;
        }
        if (bind && child > 0 && typeof next === 'function')
        {
            var saved = value;
            next = next.bind(saved);
        }
        value = next;
    }
    return value;
}

var escape = function escape(text, escape_func, placeholder) {
    try {
        return escape_func(text);
    } catch(error) {
        console.error("Mistigri encountered an error while escaping '" + text + "'");
        console.error(error.stack);
        return placeholder;
    }
}

var unbackslash = function(_, char) {
    if (char === "n")
    {
        return "\n";
    }
    else if (char === "t")
    {
        return "\t";
    }
    else
    {
        return char;
    }
}

var splitAt = function splitAt(pattern, text) {
    var found = text.indexOf(pattern);
    if (found === -1)
    {
        return [text];
    }
    else
    {
        return [text.substr(0, found), text.substr(found + pattern.length)];
    }
}

var getOption = function getOption(name, config) {
    return (config && name in config) ? config[name] : options[name];
}

return {prrcess: main, process: main, feed: feed, options: options}; // note: prrcess gives cooler results, I swear. 
})();

if (typeof module !== 'undefined') module.exports = mistigri;
