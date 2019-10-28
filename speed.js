'use strict';
const ArrowSM = require( './lib/arrow-sm.js' );

const sm = new ArrowSM()
    .addState(0, ev => 1)
    .addState(1, ev => 0)
    .start(0);

const max = 1000000;

const t0 = new Date();
for( let i = 0; i < max; i++) {
    sm(i);
};
const t = new Date() - t0;

console.log('Ran '+max+' iterations in '+t+' ms; tps = '+(1000 * max / t));
