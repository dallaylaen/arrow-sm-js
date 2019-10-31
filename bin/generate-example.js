#!/usr/bin/env js

'use strict';
const fs = require('fs');
const pug = require('pug');

global.str = x => typeof x === 'string' ? "'"+x+"'" : x;

const mkHtml = pug.compile(getTemplate(), { pretty: true, globals: ['str' ] });

const [node, self, ...list] = process.argv;

const examples = list.sort().map(x=>{
    const slurp = fs.readFileSync(x);
    return JSON.parse(slurp);
    // TODO add source reference
});

process.stdout.write(mkHtml({
    title: 'ArrowSM examples',
    examples: examples.map((x,i)=>1&&{ id: i+1, ...x }),
}));


function getTemplate() {return `
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
                | .addState( #{str(state.name) }, {
                each entry in ['decide', 'enter', 'leave' ]
                    if state[entry]
                        | #{entry} : !{state[entry]},
                | })
                |
            if item.onDecide
                | .onDecide(!{item.onDecide})
            |   .start(#{str(item.initial)});
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
`};

