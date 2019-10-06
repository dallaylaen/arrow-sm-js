'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const ArrowSM = require( '../lib/arrow-sm.js' );

/* ArrowSM does not provide a way to reference self,
 * however, it is bindable, and `this` may contain an SM instance
 * Consider the following pseudo-code:
 *
 *    const ui = new UserInterface();
 *    ui.state = new ArrowSM(...).start('default');
 *    ui.reset = function() { this.state('default') };
 *
 * If ui.state(event) ever calls a method on `this` that in turn calls a reset,
 * we end up in a nested transition and this is what this test file tests.
 */

function Relay( sm ) {
    this.sm    = sm;
    this.trace = [];
    this.log   = function(...arg) { this.trace.push(arg); };

    /* Some shorthand assertions */
    this.okLog = function(...args) {
        const t = this.trace;
        this.trace = [];
        expect(t).to.deep.equal( args );
    };
    this.okState = function(state) { expect(this.sm()).to.equal(state) };
};

/* default onSwitch function */
function onSwitch(e,o,n) {
    if (this)
        this.log(e,o,n);
};

/* default decider - the I combinator */
function I(x) { return x };

describe( 'ArrowSM reenterable', () => {
    it ('handles nested transitions', done => {
        const sm = new ArrowSM()
            .onDecide( I )
            .onSwitch( onSwitch )
            .addState('bounce', { enter: function(e, o){ this.sm(o) } })
            .addState(1)
            .addState(2)
            .addState(3)
            ;

        const re = new Relay( sm.start(1) );

        re.sm(2);
        re.okState(2); // assertion here
        re.okLog( [2, 1, 2] );

        re.sm('bounce');
        re.okState(2);
        re.okLog( [ 'bounce', 2, 'bounce' ], [2, 'bounce', 2] );

        done();
    });
});

