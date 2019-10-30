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
            div
                span.state(id='state-'+item.id+'-'+state.name) #{state.name}
                span.state-descr #{state.descr}
        div
            each ev in item.events
                button(onclick='sm'+item.id+"('"+ev+"')") #{ev}
        div(id='log'+item.id)
        script
            |
            | var sm#{item.id} = new ArrowSM()
            |   .onSwitch( function (e,o,n) {
            |       document.getElementById('log#{item.id}').innerHTML = o+' -> '+n+' via '+e;
            |   })
            each state in item.states 
                | .addState( #{typeof state.name === string ? "'"+state.name+"'" : state.name }, {
                each entry in ['decide', 'enter', 'leave' ]
                    if state[entry]
                        | #{entry} : #{state[entry]},
                | })
                |
            |   .start(#{item.initial});
html
    head
        meta(http-equiv="Content-Type" content="text/html; charset=utf-8")
        title #{title}
        script(src='js/arrow-sm.js')
        script
            | function $(str) { return document.getElementById(str) }
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
            { name: true, descr: 'Default toggle switch', decide: 'function() { return false}' },
            { name: false, descr: 'Other toggle switch', decide: 'function() { return true}' },
        ],
        events: [
            'toggle',
        ],
        initial: true,
    },
].map((x,i)=>1&&{ id: i+1, ...x });

process.stdout.write(fun({
    pretty: true,
    title: 'ArrowSM examples',
    examples: examples,
}));
