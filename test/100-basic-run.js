'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const ArrowSM = require( '../lib/arrow-sm.js' );

describe( 'ArrowSM', () => {
    it( 'can set up a state machine & does not share state', done => {
        const sm = new ArrowSM({
            sleep: ev => { if (ev) return 'awake' },
            awake: ev => { if (ev === 'night') return 'sleep'; }
        });

        expect( () => sm.start('none') ).to.throw(/[Ii]llegal/);
        expect( () => sm.start() ).to.throw(/[Ii]llegal/);

        const sm1 = sm.start('sleep');
        const sm2 = sm.start('sleep');

        expect( sm1() ).to.equal('sleep');
        expect( sm2() ).to.equal('sleep');

        sm1('get up');

        expect( sm1() ).to.equal('awake');
        expect( sm2() ).to.equal('sleep');

        expect( sm1() ).to.equal( sm1() );
        expect( sm2() ).to.equal( sm2() );

        done();
    });

    it( 'supports enter callback', done => {
        let trace = [];
        const enter = function(descr) {
            return function(...args) {
                trace.push( [descr].concat(args) );
            };
        };

        const sm = new ArrowSM()
            .addState( 1, { decide: ()=>2, enter: enter('one') } )
            .addState( 2, { decide: ev => { if(ev) return 1 }, enter: enter('two') } )
            .start(1);

        trace.should.deep.equal([['one', undefined, undefined, 1]]);

        trace = [];
        sm(0);
        trace.should.deep.equal([['two', 0, 1, 2]]);
        sm(0);
        trace.should.deep.equal([['two', 0, 1, 2]]);

        trace = [];
        sm(42);
        trace.should.deep.equal([['one', 42, 2, 1]]);

        done();
    });

    it( 'supports leave callback', done => {
        let trace = [];
        const leave = function(descr) {
            return function(...args) {
                trace.push( [descr].concat(args) );
            };
        };

        const sm = new ArrowSM()
            .addState( 1, { decide: ()=>2, leave: leave('one') } )
            .addState( 2, { decide: ev => { if(ev) return 1 }, leave: leave('two') } )
            .start(1);

        trace.should.deep.equal([]);

        sm(42);
        trace.should.deep.equal([['one', 42, 1, 2]]);

        done();
    });

    it( 'executes enter and leave callback on a loop transition', done => {
        let trace = [];
        const sm = new ArrowSM()
            .addState( 'circular', {
                decide: ev => 'circular',
                enter:  ev => trace.push('enter'),
                leave:  ev => trace.push('leave')
            })
            .start('circular');

            trace = [];
            sm(42);
            trace.should.deep.equal(['leave', 'enter']);

        done();
    });

    it( 'supports onSwitch', done => {
        let trace = [];
        const sm = new ArrowSM({
            1: () => 2,
            2: () => 1
        })
        .onSwitch((arg, from, to) => trace.push(from+'->'+to))
        .start(1);

        trace.should.deep.equal(['undefined->1']);
        trace = [];

        sm(42);
        expect( sm() ).to.equal(2);
        trace.should.deep.equal(['1->2']);

        done();
    });
    it( 'supports onDecide', done => {
        const sm = new ArrowSM({
            stand: () => 'go',
            go:    () => 'run',
            run:   () => 'fly',
            fly:   () => 'orbit',
            orbit: { final: true }
        });
        sm.onDecide( todo => { if ( todo === 0 ) return 'stand' } );

        const ship1 = sm.start('stand');
        ship1(1);
        expect( ship1() ).to.equal('go');
        ship1(1);
        expect( ship1() ).to.equal('run');
        ship1(0);
        expect( ship1() ).to.equal('stand');

        const ship2 = sm.start('orbit');
        ship2(1);
        expect( ship2() ).to.equal('orbit');

        done();
    });

    it( 'forbids dupe states', done => {
        const sm = new ArrowSM({ myname: () => 'myname' });

        expect( () => sm.addState( 'myname', () => 'othername' ) )
            .to.throw(/redefine.*myname/);

        done();
    });

    it( 'abandons transition on exception', done => {
        const sm = new ArrowSM({
            life: () => 'hell',
            hell: {
                decide: () => 'hell',
                enter: (e,o,n) => { if (e === 'hope') throw 'cannot enter hell with hope' }
            }
        }).start('life');

        expect( () => sm('hope') ).to.throw(/cannot enter hell/);
        expect( sm() ).to.equal('life');

        done();
    });

    it( 'resists faulty transitions', done => {
        const sm = new ArrowSM({ one: () => 'two' }).start('one');

        expect( () => sm(42) ).to.throw(/[Ii]llegal.*one->two/);
        expect( sm() ).to.equal('one');

        done();
    });

    it( 'can access state in decider', done => {
        const decide = (to, from) => { if (to !== from) return to };
        const trace = [];
        const enter = (trigger, from, to) => { trace.push(to) };

        const sticky = new ArrowSM({
            one: { decide, enter },
            two: { decide, enter },
            three: {decide, enter }
        }).start('one');

        trace.should.deep.equal(['one']);

        sticky('one');
        trace.should.deep.equal(['one']);

        sticky('two');
        trace.should.deep.equal(['one', 'two']);

        expect( () => sticky('four') ).to.throw(/[Ii]llegal .*four/);

        done();
    });

    it( 'is bindable', done => {
        const foo = { bar : 42 };
        let count = 0;
        const check = function(o) {
            expect(o).to.equal(foo);
            count++;
        };

        const sm = new ArrowSM( {
            one: {
                decide: function(ev) { if (ev) check(this); return 'two'; },
                leave:  function(ev) { if (ev) check(this); },
            },
            two: {
                enter:  function(ev) { if (ev) check(this); },
                decide: function(ev) { throw 'final state' }
            }
        })
        .onSwitch( function(ev) { if (ev) check(this); })
        .start('one');

        expect( sm() ).to.equal('one');
        sm.bind(foo)(137);
        expect( sm() ).to.equal('two');
        expect(count).to.equal(4); // no callbacks were omitted by accident

        done();
    });

    it( 'has on() method', done => {
        const sm = new ArrowSM({
            1: ev => 2,
            2: ev => 1,
        });

        expect( () => sm.on('click', 1, ev => ev) ).to.throw(/Illegal.*click/);
        expect( () => sm.on('decide', 3, ev => ev) ).to.throw(/Illegal.*3/);

        const trace = [];
        expect( sm.on('enter', 1, ev => trace.push(ev)) ).to.equal(sm);

        const inst = sm.start(1);
        inst('back');
        expect(inst()).to.equal(2);
        inst('forth');
        expect(trace).to.deep.equal([undefined, 'forth']);

        done();
    });
});
