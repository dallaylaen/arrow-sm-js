#!/usr/bin/env js

'use strict';
const pug = require('pug');

function str(x) {
    return typeof x === 'string' ? "'"+x+"'" : x;
};

const fun = pug.compile(`
mixin example(item)
    div(class='example' id='example-'+item.id)
        h2 #{item.name}
        p #{item.descr}
        each state in item.states
            div.state
                span.state-name(id='state-'+item.id+'-'+state.name) #{state.name}
                span.state-descr #{state.descr}
        div
            each ev in item.events
                button(onclick='sm'+item.id+"('"+ev+"')") #{ev}
        div(id='log-'+item.id)
        script
            |
            | var sm#{item.id} = new ArrowSM()
            |   .onSwitch( function (e,o,n) {
            |       $('log-#{item.id}').innerHTML = o+' -> '+n+' via '+e;
            |       if (o !== undefined)
            |           $('state-#{item.id}-'+o).innerHTML = o;
            |       $('state-#{item.id}-'+n).innerHTML = '<b>'+n+'</b>';
            |   })
            each state in item.states
                | .addState( #{(s=>typeof(s)==='string'?"'"+s+"'":s)(state.name) }, {
                each entry in ['decide', 'enter', 'leave' ]
                    if state[entry]
                        | #{entry} : #{state[entry]},
                | })
                |
            if item.onDecide
                | .onDecide(#{item.onDecide})
            |   .start(#{(s=>typeof(s)==='string'?"'"+s+"'":s)(item.initial)});
html
    head
        meta(http-equiv="Content-Type" content="text/html; charset=utf-8")
        title #{title}
        script(src='js/arrow-sm.js')
        script
            | function $(str) { return document.getElementById(str) }
        link(rel='stylesheet' href='css/main.css')
    body
        h1 #{title}

        each item in examples
            +example(item)

        script(source='js/arrow-sm.js')
`, { pretty: true });

const examples = [
    {
        name: 'Foo bar',
        descr: 'Lorem ipsum wtf there was',
        states: [
            { name: true, descr: 'Default toggle switch' },
            { name: false, descr: 'Other toggle switch. Very long and complex description because why not?' },
        ],
        onDecide: 'function(e,o) { return !o }',
        events: [
            'click me',
        ],
        initial: true,
    },
    {
        name: 'Triple loop',
        descr: 'Three states switching in circle',
        states: [
            { name: 'one', descr: 'one', decide: 'function() { return \'two\' }' },
            { name: 'two', descr: 'two', decide: 'function() { return \'three\' }' },
            { name: 'three', descr: 'three', decide: 'function() { return \'one\' }' },
        ],
        events: [
            'click me',
        ],
        initial: 'one',
    },
].map((x,i)=>1&&{ id: i+1, ...x });

process.stdout.write(fun({
    pretty: true,
    title: 'ArrowSM examples',
    examples: examples,
}));
