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

        sm1.state.should.equal('sleep');
        sm2.state.should.equal('sleep');

        sm1('get up');

        sm1.state.should.equal('awake');
        sm2.state.should.equal('sleep');

        expect( sm1() ).to.equal( sm1.state );
        expect( sm2() ).to.equal( sm2.state );

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
        sm.state.should.equal(2);
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
        expect( ship1.state ).to.equal('go');
        ship1(1);
        expect( ship1.state ).to.equal('run');
        ship1(0);
        expect( ship1.state ).to.equal('stand');

        const ship2 = sm.start('orbit');
        ship2(1);
        expect( ship2.state ).to.equal('orbit');

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

        const prom = sm('hope');
        sm.state.should.equal('life');

        prom.catch( ex => {
            ex.should.match(/cannot enter hell/);
            done();
        });
    });

    it( 'can return values as promises', async () => {
        const sm = new ArrowSM({
            odd: ev => ['even', -ev],
            even: ev => ['odd', ev]
        }).start('odd');

        expect( await sm(5) ).to.equal(-5);
        expect( await sm(6) ).to.equal(6);
    });

    it( 'resists faulty transitions', done => {
        const sm = new ArrowSM({ one: () => 'two' }).start('one');

        const prom = sm(42);

        prom
            .then( () => { throw new Error( "foo bared" ) } )
            .catch( err => {
                expect( err ).to.match(/[Ii]llegal.*one->two/);
                expect( sm.state ).to.equal('one');

                done();
            });
    });

    it( 'can access state in decider', (done) => {
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

        const dies = sticky('four');

        dies
            .then( result => { throw new Error( "Unexpected normal return"+result ) } )
            .catch( err => {
                err.should.match(/[Ii]llegal.*two.*four/);
                done();
            });
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

        expect( sm.state ).to.equal('one');
        sm.bind(foo)(137);
        expect( sm.state ).to.equal('two');
        expect(count).to.equal(4); // no callbacks were omitted by accident

        done();
    });

    it ('handles mid-air collisions', done => {
        const sm = new ArrowSM();

        // states are just integers.
        // advance ev times, if possible.
        sm.onDecide( function(ev, old) {
            if (!(ev > 0)) {
                return;
            };

            if (this && this.advance) {
                this.advance(ev - 1);
            };

            return old + 1;
        });

        const trace = [];
        sm.onSwitch((e, o, n) => { trace.push( [o, n] ) });

        for (let st = 1; st < 10; st++) {
            sm.addState( st, {} );
        };

        const advance = sm.start(1);
        const obj = { advance };

        obj.advance(3);

        trace.should.deep.equal([[undefined, 1], [1, 2], [2, 3], [3, 4]]);

        done();
    });
});
