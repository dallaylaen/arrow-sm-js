#!/usr/bin/env js

'use strict';
const pug = require('pug');

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
            | const sm#{item.id} = new ArrowSM()
            |   .onSwitch( function (e,o,n) {
            |       getElementById('log#{item.id}').innerHTML =        
            | }
            | // TODO declare states
            | .start(#{item.initial});
html
    head
        title #{title}
        script(src='js/arrow-sm.js')
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
            { name: false, descr: 'Other toggle switch' },
        ],
        events: [
            'toggle',
        ],
        intial: true,
    },
].map((x,i)=>1&&{ id: i+1, ...x });

process.stdout.write(fun({
    pretty: true,
    title: 'ArrowSM examples',
    examples: examples,
}));
