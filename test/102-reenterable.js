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
        this.log(o,n);
};

/* default decider - the I combinator */
function I(x) { return x };

describe( 'ArrowSM reenterable', () => {
    const choochoo = new ArrowSM()
        .onDecide( function(arg) {
            const todo = arg.shift();
            if (arg.length)
                this.sm(arg);
            return todo;
        })
        .onSwitch(onSwitch)
        .addState(1)
        .addState(2)
        .addState(3)
        .addState(4)
        .addState(5);

    it( 'can handle nested events', done => {
        const sm = new ArrowSM()
            .onDecide(I)
            .onSwitch(onSwitch)
            .addState( 'bounce', { enter: function(e,o,n) { this.sm(o) } } )
            .addState(1)
            .addState(2);

        /* self-test Relay really */
        const re = new Relay(sm.start(1));
        re.sm(2);
        re.okState(2);
        re.okLog([1,2]);
        re.okLog();

        re.sm('bounce');
        re.okLog( [ 2, 'bounce' ], [ 'bounce', 2] );
        re.okState(2); /* got back to last state */

        done();
    });

    it( 'can throw amidst event chain', done => {
        const re = new Relay(choochoo.start(1));
        expect( () => re.sm([2,3,'chattanooga',4,5]) ).to.throw(/llegal.*chattanooga/);

        re.okLog([1,2],[2,3]);
        re.okState(3);

        /* make sure the queue wasn't polluted */
        re.sm( [4,5] );
        re.okLog([3,4],[4,5]);
        re.okState(5);

        done();
    });
});


